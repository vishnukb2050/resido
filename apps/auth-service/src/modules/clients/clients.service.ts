import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

export interface CreateClientDto {
    name: string;
    adminEmail: string;
    adminPhone: string;
    caretakerEmail?: string;
    subAdminEmail?: string;
    plan?: 'BASIC' | 'STANDARD' | 'PREMIUM';
    createdByMobile?: boolean;
    createdByUserId?: string;
}

@Injectable()
export class ClientsService {
    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {}

    async createClient(dto: CreateClientDto) {
        // 1. Validate no email conflicts
        await this.validateEmailsUnique(dto);

        // 2. Generate slug and DB name
        const slug = this.slugify(dto.name);
        const dbName = `resido_${slug}`;
        const s3Prefix = slug;

        // 3. Check slug uniqueness
        const existing = await this.prisma.reader.client.findUnique({ where: { slug } });
        if (existing) {
            throw new ConflictException(`A community with a similar name already exists. Try a different name.`);
        }

        // 4. Create client record
        const client = await (this.prisma as any)['client'].create({
            data: ({
                name: dto.name,
                slug,
                dbName,
                s3Prefix,
                adminEmail: dto.adminEmail,
                adminPhone: dto.adminPhone,
                caretakerEmail: dto.caretakerEmail || null,
                subAdminEmail: dto.subAdminEmail || null,
                plan: dto.plan || 'BASIC',
                createdByMobile: dto.createdByMobile || false,
                createdByUserId: dto.createdByUserId || null,
            } as any),
        });

        // 5. Create staff accounts with invite tokens
        await this.createStaffAccount(client.id, dto.adminEmail, 'APARTMENT_ADMIN');
        if (dto.caretakerEmail) {
            await this.createStaffAccount(client.id, dto.caretakerEmail, 'CARETAKER');
        }
        if (dto.subAdminEmail) {
            await this.createStaffAccount(client.id, dto.subAdminEmail, 'ADMIN_STAFF');
        }

        // 6. Provision tenant database (async — mark provisionedAt when done)
        this.provisionTenantDb(client.id, dbName).catch(err => {
            console.error(`Failed to provision DB for ${dbName}:`, err);
        });

        return {
            client,
            message: `Community "${dto.name}" created. Invite emails sent to staff.`,
        };
    }

    private async createStaffAccount(clientId: string, email: string, role: 'APARTMENT_ADMIN' | 'CARETAKER' | 'ADMIN_STAFF') {
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await this.prisma.staffAccount.create({
            data: {
                email,
                clientId,
                role,
                inviteToken,
                inviteExpiry,
            },
        });

        // TODO: Send invite email via notification-service
        console.log(`Invite token for ${email}: ${inviteToken}`);
    }

    private async validateEmailsUnique(dto: CreateClientDto) {
        const emailsToCheck = [dto.adminEmail, dto.caretakerEmail, dto.subAdminEmail].filter(Boolean);
        
        for (const email of emailsToCheck) {
            const existing = await this.prisma.reader.staffAccount.findUnique({ where: { email } });
            if (existing) {
                throw new ConflictException(`Email ${email} is already assigned to a community.`);
            }
        }

        // Ensure no duplicates within the request itself
        const unique = new Set(emailsToCheck);
        if (unique.size !== emailsToCheck.length) {
            throw new BadRequestException('Staff email addresses must be unique.');
        }
    }

    private async provisionTenantDb(clientId: string, dbName: string) {
        const pool = new Pool({
            host: this.config.get('POSTGRES_HOST', 'postgres'),
            port: parseInt(this.config.get('POSTGRES_PORT', '5432')),
            user: this.config.get('POSTGRES_USER', 'resido'),
            password: this.config.get('POSTGRES_PASSWORD', 'resido_secret'),
            database: 'postgres',
        });

        try {
            const result = await pool.query(
                `SELECT 1 FROM pg_database WHERE datname = $1`,
                [dbName],
            );
            if (result.rowCount === 0) {
                await pool.query(`CREATE DATABASE "${dbName}"`);
                console.log(`✅ Created tenant database: ${dbName}`);
            }

            // Mark as provisioned
            await this.prisma.client.update({
                where: { id: clientId },
                data: { provisionedAt: new Date() },
            });
        } finally {
            await pool.end();
        }
    }

    async listClients() {
        return this.prisma.reader.client.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async getClient(id: string) {
        const client = await this.prisma.reader.client.findUnique({
            where: { id },
        });
        if (!client) throw new NotFoundException('Client not found');
        return client;
    }

    async getClientBySlug(slug: string) {
        return this.prisma.client.findUnique({ where: { slug } });
    }

    async toggleClient(id: string, isActive: boolean) {
        // Also toggle all staff accounts
        await this.prisma.staffAccount.updateMany({
            where: { clientId: id },
            data: { isActive },
        });
        return this.prisma.client.update({ where: { id }, data: { isActive } });
    }

    private slugify(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .substring(0, 40);
    }
}
