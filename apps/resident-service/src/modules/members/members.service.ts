import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class MembersService {
    constructor(private prisma: PrismaService) {}

    async listMembers(role?: string, skip = 0, take = 0) {
        const where: any = {};
        if (role) {
            if (role === 'STAFF_GROUP') {
                where.role = { in: ['CLEANING_STAFF', 'SECURITY_STAFF', 'MAINTENANCE_STAFF', 'CARETAKER', 'STAFF', 'SERVICE_STAFF', 'ADMIN_STAFF'] };
            } else {
                where.role = role;
            }
        }

        // Always bound the result set. Defaults to 500 (covers most communities
        // in a single page) and is hard-capped at 1000 to protect the DB.
        const safeTake = Math.min(take > 0 ? take : 500, 1000);
        const safeSkip = Math.max(skip, 0);

        const members = await this.prisma.reader.member.findMany({
            where,
            include: { family: { include: { unit: true } } },
            orderBy: { createdAt: 'desc' },
            skip: safeSkip,
            take: safeTake,
        });
        return members.map(m => ({
            ...m,
            phone: m.phoneVisibility === 'PRIVATE' ? '*******' : m.phone
        }));
    }

    async getUnits() {
        return this.prisma.reader.unit.findMany({
            include: { block: true }
        });
    }

    async getMember(id: string) {
        return this.prisma.reader.member.findUnique({
            where: { id },
            include: { family: { include: { unit: { include: { block: true } } } } }
        });
    }

    private sanitizeMemberData(data: any) {
        const allowedKeys = [
            'tenantId', 'userId', 'name', 'phone', 'email', 'role',
            'profilePhoto', 'profileName', 'phoneVisibility', 'isActive',
            'occupancyType', 'address', 'tenantName',
            'tenantPhone', 'familyId', 'instagram', 'linkedin', 'website',
            'location'
        ];

        const sanitized: any = {};
        for (const key of allowedKeys) {
            if (data[key] !== undefined) {
                sanitized[key] = data[key];
            }
        }
        return sanitized;
    }

    async createMember(data: any) {
        const { unitId, ...memberData } = data;

        const tenantId = memberData.tenantId;
        const phone = memberData.phone;

        const sanitized = this.sanitizeMemberData(memberData);

        let member = await this.prisma.reader.member.findFirst({
            where: {
                tenantId,
                phone
            }
        });

        if (member) {
            member = await this.prisma.client.member.update({
                where: { id: member.id },
                data: {
                    ...sanitized,
                    isActive: true
                }
            });
        } else {
            member = await this.prisma.client.member.create({
                data: {
                    ...sanitized
                }
            });
        }

        if (unitId && member) {
            let family = await this.prisma.reader.family.findFirst({
                where: {
                    tenantId,
                    unitId
                }
            });

            if (!family) {
                family = await this.prisma.client.family.create({
                    data: {
                        tenantId,
                        unitId,
                        name: `${member.name}'s Family`
                    }
                });
            }

            member = await this.prisma.client.member.update({
                where: { id: member.id },
                data: {
                    familyId: family.id
                }
            });
        }

        return member;
    }

    async updateProfilePhoto(
        id: string,
        profilePhoto: string,
        actor?: { actingUserId?: string; actingRole?: string; manageRoles?: string[] },
    ) {
        // Admins may update anyone; otherwise the caller may only update their
        // own member record (matched via userId).
        const isAdmin = !!actor?.actingRole && (actor.manageRoles || []).includes(String(actor.actingRole).toUpperCase());
        if (!isAdmin) {
            const target = await this.prisma.reader.member.findUnique({
                where: { id },
                select: { userId: true },
            });
            if (!target || !actor?.actingUserId || target.userId !== actor.actingUserId) {
                throw new ForbiddenException('You can only update your own profile photo');
            }
        }
        return this.prisma.client.member.update({
            where: { id },
            data: { profilePhoto },
        });
    }

    async updateStatus(id: string, isActive: boolean) {
        return this.prisma.client.member.update({
            where: { id },
            data: { isActive },
        });
    }

    async updateMember(id: string, data: any) {
        const sanitized = this.sanitizeMemberData(data);
        return this.prisma.client.member.update({
            where: { id },
            data: sanitized
        });
    }

    async deleteMember(id: string) {
        return this.prisma.client.member.delete({
            where: { id }
        });
    }
}
