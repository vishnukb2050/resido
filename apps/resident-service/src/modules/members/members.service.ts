import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class MembersService {
    constructor(private prisma: PrismaService) {}

    async listMembers() {
        const members = await this.prisma.reader.member.findMany();
        return members.map(m => ({
            ...m,
            phone: m.phoneVisibility === 'PRIVATE' ? '*******' : m.phone
        }));
    }

    async createMember(data: any) {
        return this.prisma.client.member.create({
            data: {
                ...data,
                // Ensure age is an Int if provided
                age: data.age ? parseInt(data.age) : undefined
            }
        });
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
}
