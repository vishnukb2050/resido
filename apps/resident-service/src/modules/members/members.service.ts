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

    async createMember(data: any) {
        const { unitId, ...memberData } = data;

        const tenantId = memberData.tenantId;
        const phone = memberData.phone;

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
                    name: memberData.name || member.name,
                    role: memberData.role || member.role,
                    isActive: true
                }
            });
        } else {
            member = await this.prisma.client.member.create({
                data: {
                    ...memberData,
                    age: memberData.age ? parseInt(memberData.age) : undefined
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
        return this.prisma.client.member.update({
            where: { id },
            data
        });
    }

    async deleteMember(id: string) {
        return this.prisma.client.member.delete({
            where: { id }
        });
    }
}
