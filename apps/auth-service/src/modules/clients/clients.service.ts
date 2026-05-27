import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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

    /**
     * Permanently delete a community (client/tenant) and its directly-owned
     * registry records: staff accounts, workspace memberships and member rows.
     * The caller must be an APARTMENT_ADMIN of this tenant and must type the
     * exact community name into `confirmName` as a destructive-action guard.
     */
    async deleteClient(
        clientId: string,
        dto: { confirmName?: string },
        currentUser?: { userId?: string; role?: string; type?: string },
    ) {
        if (!clientId) {
            throw new BadRequestException('Community id is required.');
        }
        if (!dto?.confirmName || !dto.confirmName.trim()) {
            throw new BadRequestException(
                'Please type the community name to confirm deletion.',
            );
        }

        const client = await this.prisma.masterRead.client.findUnique({
            where: { id: clientId },
        });
        if (!client) {
            throw new NotFoundException('Community not found.');
        }

        if (dto.confirmName.trim().toLowerCase() !== client.name.trim().toLowerCase()) {
            throw new BadRequestException(
                'Community name does not match. Please type the exact name to confirm deletion.',
            );
        }

        // Authorization: only an active APARTMENT_ADMIN of this tenant can delete it.
        // (Superadmin staff accounts authenticate with type='staff' and are also allowed.)
        const isSuperStaff = currentUser?.type === 'staff';
        if (!isSuperStaff) {
            if (!currentUser?.userId) {
                throw new ForbiddenException('You must be signed in to delete a community.');
            }
            const adminMembership = await this.prisma.userRead.workspaceMembership.findFirst({
                where: {
                    userId: currentUser.userId,
                    tenantId: clientId,
                    role: 'APARTMENT_ADMIN' as Role,
                    isActive: true,
                },
            });
            if (!adminMembership) {
                throw new ForbiddenException(
                    'Only the community admin can delete this community.',
                );
            }
        }

        // Best-effort cascade cleanup of related rows that don't auto-cascade.
        // Wrapped in try/catch so a failure in one table doesn't block deletion
        // of the master Client record itself.
        try {
            await this.prisma.userClient.workspaceMembership.deleteMany({
                where: { tenantId: clientId },
            });
        } catch (err: any) {
            console.warn('[deleteClient] workspaceMembership cleanup failed:', err?.message);
        }
        try {
            await this.prisma.coreClient.member.deleteMany({
                where: { tenantId: clientId },
            });
        } catch (err: any) {
            console.warn('[deleteClient] core members cleanup failed:', err?.message);
        }
        try {
            await this.prisma.masterClient.staffAccount.deleteMany({
                where: { clientId },
            });
        } catch (err: any) {
            console.warn('[deleteClient] staffAccount cleanup failed:', err?.message);
        }

        await this.prisma.masterClient.client.delete({ where: { id: clientId } });

        return {
            success: true,
            message: `Community "${client.name}" has been permanently deleted.`,
        };
    }

    /**
     * Allow a non-admin member to exit a community they belong to.
     * Admins (APARTMENT_ADMIN) are intentionally rejected — they should either
     * transfer admin rights to another member first or permanently delete the
     * community via `deleteClient`. This protects communities from being
     * orphaned without an owner.
     *
     * Removes every non-admin membership the current user has in this tenant
     * (a user may simultaneously be e.g. RESIDENT + ADMIN_STAFF), plus the
     * matching `Member` rows. The user keeps their account and any other
     * workspaces; only this tenant's links are removed.
     */
    async leaveClient(
        clientId: string,
        currentUser?: { userId?: string; sub?: string },
    ) {
        if (!clientId) {
            throw new BadRequestException('Community id is required.');
        }
        const userId = currentUser?.userId || currentUser?.sub;
        if (!userId) {
            throw new ForbiddenException('You must be signed in to exit a community.');
        }

        const memberships = await this.prisma.userRead.workspaceMembership.findMany({
            where: { userId, tenantId: clientId },
        });
        if (memberships.length === 0) {
            throw new NotFoundException('You are not a member of this community.');
        }

        const isAdmin = memberships.some((m) => m.role === ('APARTMENT_ADMIN' as Role));
        if (isAdmin) {
            throw new ForbiddenException(
                'Community admins cannot exit. Transfer admin rights to another member first, or delete the community.',
            );
        }

        await this.prisma.userClient.workspaceMembership.deleteMany({
            where: { userId, tenantId: clientId },
        });

        try {
            await this.prisma.coreClient.member.deleteMany({
                where: { userId, tenantId: clientId },
            });
        } catch (err: any) {
            console.warn('[leaveClient] member cleanup failed:', err?.message);
        }

        return {
            success: true,
            message: 'You have left the community.',
        };
    }

    private slugify(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_').substring(0, 40);
    }
}
