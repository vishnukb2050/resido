import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class ParkingService {
    constructor(private prisma: PrismaService) {}

    async createSlot(data: { name: string; type: 'RESIDENT' | 'GUEST'; assignedUnitId?: string; assignedVehicle?: string }) {
        const tenantId = PrismaService.als.getStore()?.tenantId;
        if (!tenantId) throw new BadRequestException('Tenant context missing');

        // Check duplicate slot name in same tenant
        const existing = await this.prisma.reader.parkingSlot.findFirst({
            where: { tenantId, name: data.name },
        });
        if (existing) {
            throw new BadRequestException(`Parking slot '${data.name}' already exists in this community.`);
        }

        return this.prisma.client.parkingSlot.create({
            data: {
                tenantId,
                name: data.name,
                type: data.type,
                assignedUnitId: data.assignedUnitId || null,
                assignedVehicle: data.assignedVehicle || null,
            },
        });
    }

    async getSlots(limit = 50, offset = 0) {
        const tenantId = PrismaService.als.getStore()?.tenantId;
        if (!tenantId) throw new BadRequestException('Tenant context missing');

        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safeOffset = Math.max(offset, 0);

        const [items, total] = await Promise.all([
            this.prisma.reader.parkingSlot.findMany({
                where: { tenantId },
                include: {
                    unit: {
                        select: {
                            id: true,
                            number: true,
                            block: { select: { id: true, name: true } },
                        },
                    },
                    bookings: {
                        where: { status: { in: ['BOOKED', 'ACTIVE'] } },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
                orderBy: { name: 'asc' },
                take: safeLimit,
                skip: safeOffset,
            }),
            this.prisma.reader.parkingSlot.count({ where: { tenantId } }),
        ]);

        return { items, total, hasMore: safeOffset + items.length < total };
    }

    async deleteSlot(id: string) {
        const tenantId = PrismaService.als.getStore()?.tenantId;
        if (!tenantId) throw new BadRequestException('Tenant context missing');

        const slot = await this.prisma.reader.parkingSlot.findFirst({
            where: { id, tenantId },
        });
        if (!slot) throw new NotFoundException('Parking slot not found');

        return this.prisma.client.parkingSlot.delete({ where: { id } });
    }

    async assignSlot(id: string, data: { assignedUnitId: string | null; assignedVehicle: string | null }) {
        const tenantId = PrismaService.als.getStore()?.tenantId;
        if (!tenantId) throw new BadRequestException('Tenant context missing');

        const slot = await this.prisma.reader.parkingSlot.findFirst({
            where: { id, tenantId },
        });
        if (!slot) throw new NotFoundException('Parking slot not found');

        return this.prisma.client.parkingSlot.update({
            where: { id },
            data: {
                assignedUnitId: data.assignedUnitId || null,
                assignedVehicle: data.assignedVehicle || null,
            },
        });
    }

    async bookSlot(id: string, data: { memberId: string; residentName: string; unitInfo: string; vehicleNumber: string; startTime: string; endTime: string }) {
        const tenantId = PrismaService.als.getStore()?.tenantId;
        if (!tenantId) throw new BadRequestException('Tenant context missing');

        const slot = await this.prisma.reader.parkingSlot.findFirst({
            where: { id, tenantId },
        });
        if (!slot) throw new NotFoundException('Parking slot not found');
        if (slot.type !== 'GUEST') {
            throw new BadRequestException('Only guest parking slots can be booked.');
        }

        const start = new Date(data.startTime);
        const end = new Date(data.endTime);

        if (start >= end) {
            throw new BadRequestException('End time must be after start time.');
        }

        // Strict concurrency conflict check: Check for overlapping bookings
        const conflict = await this.prisma.reader.parkingBooking.findFirst({
            where: {
                tenantId,
                slotId: id,
                status: { in: ['BOOKED', 'ACTIVE'] },
                OR: [
                    { startTime: { lt: end }, endTime: { gt: start } },
                ],
            },
        });

        if (conflict) {
            throw new BadRequestException('This slot is already booked for the selected time window.');
        }

        return this.prisma.client.parkingBooking.create({
            data: {
                tenantId,
                slotId: id,
                memberId: data.memberId,
                residentName: data.residentName,
                unitInfo: data.unitInfo,
                vehicleNumber: data.vehicleNumber,
                startTime: start,
                endTime: end,
                status: 'BOOKED',
            },
        });
    }

    async freeBooking(id: string) {
        const tenantId = PrismaService.als.getStore()?.tenantId;
        if (!tenantId) throw new BadRequestException('Tenant context missing');

        const booking = await this.prisma.reader.parkingBooking.findFirst({
            where: { id, tenantId },
        });
        if (!booking) throw new NotFoundException('Parking booking not found');

        return this.prisma.client.parkingBooking.update({
            where: { id },
            data: {
                status: 'FREED',
                markedFreedAt: new Date(),
            },
        });
    }

    async getActiveBookings(limit = 50, offset = 0) {
        const tenantId = PrismaService.als.getStore()?.tenantId;
        if (!tenantId) throw new BadRequestException('Tenant context missing');

        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const safeOffset = Math.max(offset, 0);

        const [items, total] = await Promise.all([
            this.prisma.reader.parkingBooking.findMany({
                where: {
                    tenantId,
                    status: { in: ['BOOKED', 'ACTIVE'] },
                },
                include: {
                    slot: { select: { id: true, name: true, type: true } },
                },
                orderBy: { startTime: 'asc' },
                take: safeLimit,
                skip: safeOffset,
            }),
            this.prisma.reader.parkingBooking.count({
                where: {
                    tenantId,
                    status: { in: ['BOOKED', 'ACTIVE'] },
                },
            }),
        ]);

        return { items, total, hasMore: safeOffset + items.length < total };
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleAutoFreeExpiredBookings() {
        const now = new Date();
        try {
            // Run globally across all tenants (Prisma tenant isolation extension does not inject tenantId because ALS store is empty in cron contexts)
            const expiredBookings = await this.prisma.reader.parkingBooking.findMany({
                where: {
                    status: { in: ['BOOKED', 'ACTIVE'] },
                    endTime: { lt: now },
                },
                select: { id: true },
            });
            if (expiredBookings.length > 0) {
                const count = await this.prisma.client.parkingBooking.updateMany({
                    where: { id: { in: expiredBookings.map((b) => b.id) } },
                    data: { status: 'FREED', autoFreed: true, markedFreedAt: now },
                });
                console.log(`[Parking Cron] Auto-freed ${count.count} expired bookings`);
            }
        } catch (err: any) {
            console.error('[Parking Cron] Auto-freer pass failed:', err?.message);
        }
    }
}
