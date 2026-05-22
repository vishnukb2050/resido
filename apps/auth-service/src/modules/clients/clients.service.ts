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
    photoUrl?: string;
    memberPhones?: string[];
    residentPhones?: string[];
    cleaningPhones?: string[];
    securityPhones?: string[];
}

@Injectable()
export class ClientsService {
    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {}

    async createClient(dto: CreateClientDto) {
        if (!dto || !dto.name) {
            throw new BadRequestException('Community name is required.');
        }
        await this.validateEmailsUnique(dto);
        const slug = this.slugify(dto.name);
        const dbName = `resido_${slug}`;
        const s3Prefix = slug;

        const existing = await this.prisma.masterRead.client.findUnique({ where: { slug } });
        if (existing) {
            throw new ConflictException(`A community with a similar name already exists.`);
        }

        const client = await this.prisma.masterClient.client.create({
            data: {
                name: dto.name,
                photoUrl: dto.photoUrl || null,
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

        // Link the Admin Phone user as APARTMENT_ADMIN
        if (dto.adminPhone) {
            let adminUser = await this.prisma.userRead.user.findUnique({ where: { phone: dto.adminPhone } });
            if (!adminUser) {
                adminUser = await this.prisma.userClient.user.create({
                    data: {
                        phone: dto.adminPhone,
                        email: dto.adminEmail,
                        role: 'APARTMENT_ADMIN' as Role,
                        isActive: true
                    }
                });
            }

            const existingAdminMember = await this.prisma.userRead.workspaceMembership.findUnique({
                where: { userId_tenantId_role: { userId: adminUser.id, tenantId: client.id, role: 'APARTMENT_ADMIN' as Role } }
            });

            if (!existingAdminMember) {
                await this.prisma.userClient.workspaceMembership.create({
                    data: {
                        userId: adminUser.id,
                        tenantId: client.id,
                        tenantName: client.name,
                        role: 'APARTMENT_ADMIN' as Role,
                        memberId: 'admin-001',
                        photoUrl: client.photoUrl,
                        isActive: true
                    }
                });
            }
        }

        // If created by a different mobile user, also link them as a creator/admin
        if (dto.createdByUserId) {
            const creator = await this.prisma.userRead.user.findUnique({ where: { id: dto.createdByUserId } });
            if (creator && creator.phone !== dto.adminPhone) {
                const existingCreatorMember = await this.prisma.userRead.workspaceMembership.findUnique({
                    where: { userId_tenantId_role: { userId: dto.createdByUserId, tenantId: client.id, role: 'APARTMENT_ADMIN' as Role } }
                });

                if (!existingCreatorMember) {
                    await this.prisma.userClient.workspaceMembership.create({
                        data: {
                            userId: dto.createdByUserId,
                            tenantId: client.id,
                            tenantName: client.name,
                            role: 'APARTMENT_ADMIN' as Role,
                            memberId: 'creator-001',
                            photoUrl: client.photoUrl,
                            isActive: true
                        }
                    });
                }
            }
        }

        // Add initial residents and staff if provided
        const roleMappings = [
            { phones: dto.residentPhones, role: 'RESIDENT' as Role },
            { phones: dto.memberPhones, role: 'RESIDENT' as Role },
            { phones: dto.cleaningPhones, role: 'CLEANING_STAFF' as Role },
            { phones: dto.securityPhones, role: 'SECURITY_STAFF' as Role },
        ];

        for (const mapping of roleMappings) {
            if (mapping.phones && mapping.phones.length > 0) {
                for (const phone of [...new Set(mapping.phones)]) {
                    let user = await this.prisma.userRead.user.findUnique({ where: { phone } });
                    if (!user) {
                        user = await this.prisma.userClient.user.create({
                            data: {
                                phone,
                                role: mapping.role,
                                isActive: true
                            }
                        });
                    }

                    const existingMember = await this.prisma.userRead.workspaceMembership.findUnique({
                        where: { userId_tenantId_role: { userId: user.id, tenantId: client.id, role: mapping.role } }
                    });

                    if (!existingMember) {
                        await this.prisma.userClient.workspaceMembership.create({
                            data: {
                                userId: user.id,
                                tenantId: client.id,
                                tenantName: client.name,
                                role: mapping.role,
                                memberId: `${mapping.role.slice(0, 3)}-${phone.slice(-4)}`.toLowerCase(),
                                photoUrl: client.photoUrl,
                                isActive: true
                            }
                        });
                    }
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

    async updateClient(id: string, dto: { name?: string; photoUrl?: string }) {
        const client = await this.prisma.masterClient.client.update({
            where: { id },
            data: {
                name: dto.name,
                photoUrl: dto.photoUrl,
            }
        });

        // Sync to all workspace memberships
        await this.prisma.userClient.workspaceMembership.updateMany({
            where: { tenantId: id },
            data: {
                tenantName: dto.name,
                photoUrl: dto.photoUrl,
            }
        });

        return client;
    }

    async getClientStaff(clientId: string) {
        return this.prisma.userRead.workspaceMembership.findMany({
            where: {
                tenantId: clientId,
                role: {
                    in: ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF']
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        profilePhoto: true,
                    }
                }
            }
        });
    }

    async addClientStaff(clientId: string, dto: { phone: string; role: 'APARTMENT_ADMIN' | 'CARETAKER' | 'ADMIN_STAFF'; name?: string }) {
        let user = await this.prisma.userRead.user.findUnique({
            where: { phone: dto.phone }
        });

        if (!user) {
            user = await this.prisma.userClient.user.create({
                data: {
                    phone: dto.phone,
                    name: dto.name || 'New Staff',
                    role: dto.role as any,
                    isActive: true,
                }
            });
        } else if (dto.name) {
            user = await this.prisma.userClient.user.update({
                where: { id: user.id },
                data: { name: dto.name }
            });
        }

        const client = await this.prisma.masterRead.client.findUnique({
            where: { id: clientId }
        });
        if (!client) throw new NotFoundException('Community not found');

        const member = await this.prisma.coreClient.member.upsert({
            where: {
                tenantId_phone: {
                    tenantId: clientId,
                    phone: dto.phone,
                }
            },
            update: {
                name: dto.name || 'New Staff',
                role: dto.role as any,
                isActive: true,
                userId: user.id
            },
            create: {
                userId: user.id,
                tenantId: clientId,
                name: dto.name || 'New Staff',
                phone: dto.phone,
                role: dto.role as any,
                isActive: true,
            }
        });

        const membership = await this.prisma.userClient.workspaceMembership.upsert({
            where: {
                userId_tenantId_role: {
                    userId: user.id,
                    tenantId: clientId,
                    role: dto.role as any,
                }
            },
            update: {
                role: dto.role as any,
                isActive: true,
                memberId: member.id,
            },
            create: {
                userId: user.id,
                tenantId: clientId,
                tenantName: client.name,
                role: dto.role as any,
                photoUrl: client.photoUrl,
                memberId: member.id,
                isActive: true,
            }
        });

        return { user, membership };
    }

    async removeClientStaff(clientId: string, membershipId: string) {
        return this.prisma.userClient.workspaceMembership.delete({
            where: {
                id: membershipId
            }
        });
    }

    private slugify(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_').substring(0, 40);
    }
}
