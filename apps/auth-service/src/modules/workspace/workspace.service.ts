import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Pool } from 'pg';
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
        const dbName = `resido_${data.slug.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const s3Prefix = data.slug.toLowerCase();

        // Create the tenant database dynamically
        await this.createTenantDb(dbName);

        const client = await (this.prisma as any)['client'].create({
            data: ({
                name: data.name,
                slug: data.slug,
                adminEmail: data.adminEmail,
                adminPhone: data.adminPhone,
                dbName,
                s3Prefix,
                plan: (data.plan as any) || 'BASIC',
            } as any),
        });

        return client;
    }

    async listClients() {
        return this.prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async getClient(id: string) {
        return this.prisma.client.findUnique({ where: { id } });
    }

    async toggleClient(id: string, isActive: boolean) {
        return this.prisma.client.update({ where: { id }, data: { isActive } });
    }

    private async createTenantDb(dbName: string): Promise<void> {
        const pool = new Pool({
            host: this.config.get('POSTGRES_HOST'),
            port: parseInt(this.config.get('POSTGRES_PORT', '5432')),
            user: this.config.get('POSTGRES_USER'),
            password: this.config.get('POSTGRES_PASSWORD'),
            database: 'postgres',
        });

        try {
            const result = await pool.query(
                `SELECT 1 FROM pg_database WHERE datname = $1`,
                [dbName],
            );
            if (result.rowCount === 0) {
                // Must run outside a transaction — use raw query
                await pool.query(`CREATE DATABASE "${dbName}"`);
                console.log(`Created tenant database: ${dbName}`);
            }
        } finally {
            await pool.end();
        }
    }
}
