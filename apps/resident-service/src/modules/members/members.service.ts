import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class MembersService {
    constructor(private prisma: PrismaService) {}

    async listMembers() {
        return this.prisma.reader.member.findMany();
    }

    async createMember(data: any) {
        return this.prisma.client.member.create({ data });
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
