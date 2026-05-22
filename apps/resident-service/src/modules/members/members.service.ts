import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class MembersService {
    constructor(private prisma: PrismaService) {}

    async listMembers(role?: string) {
        const where: any = {};
        if (role) {
            if (role === 'STAFF_GROUP') {
                where.role = { in: ['CLEANING_STAFF', 'SECURITY_STAFF', 'MAINTENANCE_STAFF', 'CARETAKER', 'STAFF', 'SERVICE_STAFF', 'ADMIN_STAFF'] };
            } else {
                where.role = role;
            }
        }
        
        const members = await this.prisma.reader.member.findMany({
            where,
            include: { family: { include: { unit: true } } }
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

    async updateProfilePhoto(id: string, profilePhoto: string) {
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
