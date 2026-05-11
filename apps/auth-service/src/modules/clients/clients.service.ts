import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Role } from '@resido/user-client';

export interface CreateClientDto {
    name: string;
    adminEmail: string;
    adminPhone: string;
    adminPassword?: string;
    caretakerEmail?: string;
    subAdminEmail?: string;
    plan?: 'BASIC' | 'STANDARD' | 'PREMIUM';
    createdByMobile?: boolean;
    createdByUserId?: string;
    memberPhones?: string[];
}

@Injectable()
export class ClientsService {
    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {}

    async createClient(dto: CreateClientDto) {
        await this.validateEmailsUnique(dto);
        const slug = this.slugify(dto.name);
        const dbName = `resido_core`;
        const s3Prefix = slug;

        const existing = await this.prisma.masterRead.client.findUnique({ where: { slug } });
        if (existing) {
            throw new ConflictException(`A community with a similar name already exists.`);
        }

        const client = await this.prisma.masterClient.client.create({
            data: {
                name: dto.name,
                slug,
                dbName,
                s3Prefix,
                adminEmail: dto.adminEmail,
                adminPhone: dto.adminPhone,
                caretakerEmail: dto.caretakerEmail || null,
                subAdminEmail: dto.subAdminEmail || null,
                plan: dto.plan || 'BASIC',
                provisionedAt: new Date(),
                createdByMobile: dto.createdByMobile || false,
                createdByUserId: dto.createdByUserId || null,
            },
        });

        await this.createStaffAccount(client.id, dto.adminEmail, 'APARTMENT_ADMIN', dto.adminPassword);
        if (dto.caretakerEmail) {
            await this.createStaffAccount(client.id, dto.caretakerEmail, 'CARETAKER');
        }
        if (dto.subAdminEmail) {
            await this.createStaffAccount(client.id, dto.subAdminEmail, 'ADMIN_STAFF');
        }

        // If created by a mobile user, automatically link them as a member/admin
        if (dto.createdByUserId) {
            await this.prisma.userClient.workspaceMembership.create({
                data: {
                    userId: dto.createdByUserId,
                    tenantId: client.id,
                    tenantName: client.name,
                    role: 'APARTMENT_ADMIN' as Role,
                    memberId: 'admin-001',
                    isActive: true
                }
            });
        }

        // Add initial members if provided
        if (dto.memberPhones && dto.memberPhones.length > 0) {
            for (const phone of dto.memberPhones) {
                // Ensure user exists or create a shell user
                let user = await this.prisma.userRead.user.findUnique({ where: { phone } });
                if (!user) {
                    user = await this.prisma.userClient.user.create({
                        data: {
                            phone,
                            role: 'RESIDENT' as Role,
                            isActive: true
                        }
                    });
                }

                // Add membership if not already exists
                const existingMember = await this.prisma.userRead.workspaceMembership.findUnique({
                    where: { userId_tenantId: { userId: user.id, tenantId: client.id } }
                });

                if (!existingMember) {
                    await this.prisma.userClient.workspaceMembership.create({
                        data: {
                            userId: user.id,
                            tenantId: client.id,
                            tenantName: client.name,
                            role: 'RESIDENT' as Role,
                            memberId: `mem-${phone.slice(-4)}`, // Placeholder memberId
                            isActive: true
                        }
                    });
                }
            }
        }

        return {
            client,
            message: `Community "${dto.name}" created with ${dto.memberPhones?.length || 0} members.`,
        };
    }

    private async createStaffAccount(clientId: string, email: string, role: 'APARTMENT_ADMIN' | 'CARETAKER' | 'ADMIN_STAFF', password?: string) {
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        await this.prisma.masterClient.staffAccount.create({
            data: {
                email,
                clientId,
                role,
                password: hashedPassword,
                inviteToken: password ? null : inviteToken,
                inviteExpiry: password ? null : inviteExpiry,
                isActive: true,
            },
        });
    }

    private async validateEmailsUnique(dto: CreateClientDto) {
        const emailsToCheck = [dto.adminEmail, dto.caretakerEmail, dto.subAdminEmail].filter(Boolean);
        for (const email of emailsToCheck) {
            const existing = await this.prisma.masterRead.staffAccount.findUnique({ where: { email } });
            if (existing) {
                throw new ConflictException(`Email ${email} is already in use.`);
            }
        }
    }

    async listClients() {
        return this.prisma.masterRead.client.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async getClient(id: string) {
        const client = await this.prisma.masterRead.client.findUnique({ where: { id } });
        if (!client) throw new NotFoundException('Client not found');
        return client;
    }

    async getClientBySlug(slug: string) {
        return this.prisma.masterRead.client.findUnique({ where: { slug } });
    }

    async toggleClient(id: string, isActive: boolean) {
        await this.prisma.masterClient.staffAccount.updateMany({ where: { clientId: id }, data: { isActive } });
        return this.prisma.masterClient.client.update({ where: { id }, data: { isActive } });
    }

    private slugify(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_').substring(0, 40);
    }
}
