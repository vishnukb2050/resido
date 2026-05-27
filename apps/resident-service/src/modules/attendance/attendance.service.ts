import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';
import { UpsertAttendanceConfigDto } from './dto/upsert-attendance-config.dto';

const STAFF_ROLES = [
    'APARTMENT_ADMIN',
    'CARETAKER',
    'ADMIN_STAFF',
    'ACCOUNTS_STAFF',
    'MAINTENANCE_STAFF',
    'CLEANING_STAFF',
    'SECURITY_STAFF',
    'SERVICE_STAFF',
    'STAFF',
    'MANAGER_STAFF',
];

@Injectable()
export class AttendanceService {
    constructor(private prisma: PrismaService) {}

    private assertTenantId(tenantId?: string | null): string {
        const id = (tenantId || '').trim();
        if (!id) {
            throw new BadRequestException('Tenant context missing');
        }
        return id;
    }

    private wrapPrismaError(err: any, action: string): never {
        const code = err?.code;
        const msg = String(err?.message || '');
        console.error(`[AttendanceService] ${action} failed`, { code, msg });

        if (code === 'P2021' || /does not exist|relation.*attendance/i.test(msg)) {
            throw new InternalServerErrorException(
                'Attendance database tables are not set up yet. Please redeploy resident-service or run database sync.',
            );
        }
        if (code === 'P2002') {
            throw new BadRequestException('Attendance configuration already exists for this community.');
        }
        throw new InternalServerErrorException(
            msg || `Failed to ${action}. Please try again.`,
        );
    }

    // ── Member resolution (lookup by id / userId / phone) ─────────────────
    private async resolveMember(input: {
        candidateId?: string | null;
        authUserId?: string | null;
        phone?: string | null;
    }) {
        const ors: any[] = [];
        if (input.candidateId) ors.push({ id: input.candidateId }, { userId: input.candidateId });
        if (input.authUserId && input.authUserId !== input.candidateId) {
            ors.push({ id: input.authUserId }, { userId: input.authUserId });
        }
        if (input.phone) ors.push({ phone: input.phone });
        if (!ors.length) return null;

        const m = await this.prisma.reader.member.findFirst({ where: { OR: ors } });
        if (m && input.authUserId && !m.userId) {
            try {
                await this.prisma.client.member.update({
                    where: { id: m.id },
                    data: { userId: input.authUserId },
                });
            } catch {}
        }
        return m;
    }

    // ── Distance via haversine (meters) ───────────────────────────────────
    private haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
        const toRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371000;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private todayKey(d = new Date()) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // ── Config ─────────────────────────────────────────────────────────────
    async getConfig(tenantIdInput?: string) {
        const tenantId = this.assertTenantId(tenantIdInput);
        try {
            const config = await this.prisma.reader.attendanceConfig.findUnique({
                where: { tenantId },
            });
            return config;
        } catch (err) {
            this.wrapPrismaError(err, 'load attendance configuration');
        }
    }

    async upsertConfig(tenantIdInput: string, data: UpsertAttendanceConfigDto) {
        const tenantId = this.assertTenantId(tenantIdInput);

        const latitude = Number(data.latitude);
        const longitude = Number(data.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new BadRequestException('Latitude and longitude are required.');
        }

        const radiusMeters = Math.max(50, Math.round(Number(data.radiusMeters) || 500));

        try {
            return await this.prisma.client.attendanceConfig.upsert({
                where: { tenantId },
                update: {
                    latitude,
                    longitude,
                    radiusMeters,
                    address: data.address?.trim() || null,
                },
                create: {
                    tenantId,
                    latitude,
                    longitude,
                    radiusMeters,
                    address: data.address?.trim() || null,
                },
            });
        } catch (err) {
            if (err instanceof BadRequestException) throw err;
            this.wrapPrismaError(err, 'save attendance configuration');
        }
    }

    // ── Mark attendance ────────────────────────────────────────────────────
    async markAttendance(args: {
        tenantId: string;
        authUserId?: string;
        authUserPhone?: string;
        latitude: number;
        longitude: number;
        notes?: string;
    }) {
        const tenantId = this.assertTenantId(args.tenantId);

        let config;
        try {
            config = await this.prisma.reader.attendanceConfig.findUnique({ where: { tenantId } });
        } catch (err) {
            this.wrapPrismaError(err, 'load attendance configuration');
        }

        if (!config) {
            throw new BadRequestException(
                'Attendance location is not configured yet. Please contact the community admin.',
            );
        }

        const latitude = Number(args.latitude);
        const longitude = Number(args.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new BadRequestException('GPS coordinates are required to mark attendance.');
        }

        const member = await this.resolveMember({
            authUserId: args.authUserId,
            phone: args.authUserPhone,
        });
        if (!member) {
            throw new NotFoundException('Your member profile was not found in this community.');
        }
        if (!STAFF_ROLES.includes(member.role)) {
            throw new BadRequestException('Only staff members can mark attendance.');
        }

        const distance = this.haversineMeters(
            config.latitude,
            config.longitude,
            latitude,
            longitude,
        );
        const distanceMeters = Math.round(distance);
        const radius = config.radiusMeters;

        if (distanceMeters > radius) {
            return {
                success: false,
                status: 'OUT_OF_AREA' as const,
                distanceMeters,
                radiusMeters: radius,
                message: `You are ${distanceMeters}m away from the community location. Allowed radius is ${radius}m.`,
            };
        }

        const date = this.todayKey();
        let existing;
        try {
            existing = await this.prisma.reader.attendanceRecord.findFirst({
                where: { tenantId, memberId: member.id, date },
            });
        } catch (err) {
            this.wrapPrismaError(err, 'look up attendance record');
        }

        try {
            const record = existing
                ? await this.prisma.client.attendanceRecord.update({
                      where: { id: existing.id },
                      data: {
                          latitude,
                          longitude,
                          distanceMeters,
                          status: 'PRESENT',
                          notes: args.notes ?? existing.notes,
                          markedAt: new Date(),
                      },
                  })
                : await this.prisma.client.attendanceRecord.create({
                      data: {
                          tenantId,
                          memberId: member.id,
                          date,
                          latitude,
                          longitude,
                          distanceMeters,
                          status: 'PRESENT',
                          notes: args.notes,
                      },
                  });

            return {
                success: true,
                status: 'PRESENT' as const,
                distanceMeters,
                radiusMeters: radius,
                message: existing
                    ? 'Attendance updated for today.'
                    : 'Attendance marked successfully.',
                record,
            };
        } catch (err) {
            this.wrapPrismaError(err, 'save attendance');
        }
    }

    // ── Reports ────────────────────────────────────────────────────────────
    private buildDateRange(from?: string, to?: string, date?: string) {
        if (date) return { dateFrom: date, dateTo: date };
        const today = this.todayKey();
        return { dateFrom: from || today, dateTo: to || from || today };
    }

    async listAttendance(opts: {
        tenantId: string;
        from?: string;
        to?: string;
        date?: string;
        memberId?: string;
    }) {
        const tenantId = this.assertTenantId(opts.tenantId);
        const { dateFrom, dateTo } = this.buildDateRange(opts.from, opts.to, opts.date);

        let memberFilter: string | undefined;
        if (opts.memberId) {
            const m = await this.resolveMember({ candidateId: opts.memberId });
            if (!m) return { records: [], summary: { totalRecords: 0, uniqueStaff: 0, dateFrom, dateTo } };
            memberFilter = m.id;
        }

        try {
            const records = await this.prisma.reader.attendanceRecord.findMany({
                where: {
                    tenantId,
                    ...(memberFilter ? { memberId: memberFilter } : {}),
                    date: { gte: dateFrom, lte: dateTo },
                },
                orderBy: [{ date: 'desc' }, { markedAt: 'desc' }],
            });

            const memberIds = Array.from(new Set(records.map((r) => r.memberId)));
            const members = memberIds.length
                ? await this.prisma.reader.member.findMany({
                      where: { id: { in: memberIds } },
                      select: { id: true, name: true, phone: true, role: true, profilePhoto: true },
                  })
                : [];
            const memberMap = new Map(members.map((m: any) => [m.id, m]));

            const enriched = records.map((r) => ({
                ...r,
                member: memberMap.get(r.memberId) || null,
            }));

            return {
                records: enriched,
                summary: {
                    totalRecords: enriched.length,
                    uniqueStaff: new Set(enriched.map((r) => r.memberId)).size,
                    dateFrom,
                    dateTo,
                },
            };
        } catch (err) {
            this.wrapPrismaError(err, 'list attendance records');
        }
    }

    async listOwnAttendance(args: {
        tenantId: string;
        authUserId?: string;
        authUserPhone?: string;
        from?: string;
        to?: string;
        date?: string;
    }) {
        const tenantId = this.assertTenantId(args.tenantId);

        const member = await this.resolveMember({
            authUserId: args.authUserId,
            phone: args.authUserPhone,
        });

        let config = null;
        try {
            config = await this.prisma.reader.attendanceConfig.findUnique({ where: { tenantId } });
        } catch (err) {
            this.wrapPrismaError(err, 'load attendance configuration');
        }

        if (!member) {
            return {
                records: [],
                summary: { totalRecords: 0, present: 0 },
                member: null,
                config,
            };
        }

        const { dateFrom, dateTo } = this.buildDateRange(args.from, args.to, args.date);

        try {
            const records = await this.prisma.reader.attendanceRecord.findMany({
                where: { tenantId, memberId: member.id, date: { gte: dateFrom, lte: dateTo } },
                orderBy: [{ date: 'desc' }, { markedAt: 'desc' }],
            });

            const today = this.todayKey();
            const todayRecord = records.find((r) => r.date === today) || null;

            return {
                records,
                summary: {
                    totalRecords: records.length,
                    present: records.filter((r) => r.status === 'PRESENT').length,
                    dateFrom,
                    dateTo,
                },
                member: {
                    id: member.id,
                    name: member.name,
                    phone: member.phone,
                    role: member.role,
                },
                todayRecord,
                config,
            };
        } catch (err) {
            this.wrapPrismaError(err, 'list your attendance');
        }
    }
}
