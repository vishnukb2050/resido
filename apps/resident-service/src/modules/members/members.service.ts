import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class MembersService {
    constructor(private tenantPrisma: TenantPrismaService) {}

    async listMembers(dbName: string) {
        // Use Read Replica for queries
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.member.findMany();
    }

    async createMember(dbName: string, data: any) {
        // Use Writer (Master) for mutations
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        return prisma.member.create({ data });
    }

    async updateProfilePhoto(dbName: string, id: string, profilePhoto: string) {
        // Use Writer (Master) for mutations
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        return prisma.member.update({
            where: { id },
            data: { profilePhoto },
        });
    }
}
