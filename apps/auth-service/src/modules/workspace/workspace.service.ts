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
        slug?: string;
        adminEmail: string;
        adminPhone: string;
        plan?: string;
    }) {
        const dbName = 'resido_core'; // All communities now use the shared core database
        const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const s3Prefix = slug;

        const client = await this.prisma.masterClient.client.create({
            data: {
                name: data.name,
                slug: slug,
                adminEmail: data.adminEmail,
                adminPhone: data.adminPhone,
                dbName,
                s3Prefix,
                plan: (data.plan as any) || 'BASIC',
            },
        });

        // Link the creator to this workspace so they can see it and switch to it!
        const user = await this.prisma.masterRead.user.findFirst({
            where: {
                OR: [
                    { phone: data.adminPhone },
                    { email: data.adminEmail }
                ]
            }
        });

        if (user) {
            await this.prisma.masterClient.workspaceMembership.create({
                data: {
                    userId: user.id,
                    tenantId: client.id,
                    tenantName: client.name,
                    role: 'ADMIN' as any, // Cast to any if enum is not matching perfectly
                    memberId: `mem_${client.id.slice(0, 8)}`, // Fallback memberId
                    isActive: true
                }
            });
            console.log(`Linked user ${user.id} to new workspace ${client.id} as ADMIN`);
        } else {
            console.warn(`User with phone ${data.adminPhone} or email ${data.adminEmail} not found. Could not link workspace.`);
        }

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
