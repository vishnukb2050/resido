import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// Cache buster 1
@Injectable()
export class WorkspaceService {
    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) { }

    async onboardClient(data: {
        name: string;
        slug: string;
        adminEmail: string;
        adminPhone: string;
        plan?: string;
    }) {
        const dbName = 'resido_core'; // All communities now use the shared core database
        const s3Prefix = data.slug.toLowerCase();

        const client = await this.prisma.masterClient.client.create({
            data: {
                name: data.name,
                slug: data.slug,
                adminEmail: data.adminEmail,
                adminPhone: data.adminPhone,
                dbName,
                s3Prefix,
                plan: (data.plan as any) || 'BASIC',
            },
        });

        return client;
    }

    async listClients() {
        return this.prisma.masterRead.client.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async getClient(id: string) {
        return this.prisma.masterRead.client.findUnique({ where: { id } });
    }

    async toggleClient(id: string, isActive: boolean) {
        return this.prisma.masterClient.client.update({ where: { id }, data: { isActive } });
    }

}
