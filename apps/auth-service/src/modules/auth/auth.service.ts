import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import { FollowService } from '../follow/follow.service';
import { StorageService } from '../storage/storage.service';
import { Role } from '@resido/user-client';

@Injectable()
export class AuthService {
    private memoryOtpStore = new Map<string, { otp: string; expiresAt: number }>();

    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService,
        private otpService: OtpService,
        private followService: FollowService,
        private storageService: StorageService,
        @Inject('REDIS_CLIENT') private redis: Redis,
    ) { }

    async sendOtp(phone: string) {
        try {
            console.log(`[DEBUG] Attempting to send OTP to: ${phone}`);
            let user = await this.prisma.userRead.user.findUnique({ where: { phone } });
            if (!user) {
                console.log(`[DEBUG] User not found, creating new user for: ${phone}`);
                user = await this.prisma.userClient.user.create({ data: { phone } });
            }

            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            console.log(`[DEBUG] Generated OTP for ${phone}: ${otp}`);
            
            try {
                await this.redis.set(`otp:${phone}`, otp, 'EX', 300);
                console.log(`[DEBUG] OTP cached in Redis for: ${phone}`);
            } catch (redisError: any) {
                console.warn(`[WARN] Redis set failed, falling back to memory store:`, redisError.message);
                this.memoryOtpStore.set(phone, { otp, expiresAt: Date.now() + 300 * 1000 });
            }
            
            await this.otpService.sendOtp(phone, otp);
            console.log(`[DEBUG] OTP service call successful for: ${phone}`);

            return { message: 'OTP sent successfully', phone };
        } catch (error) {
            console.error(`[ERROR] Failed to send OTP for ${phone}:`, error);
            throw error;
        }
    }

    async verifyOtp(phone: string, otp: string) {
        const user = await this.prisma.userRead.user.findUnique({ where: { phone } });
        if (!user) throw new UnauthorizedException('User not found');

        let cachedOtp: string | null = null;
        try {
            cachedOtp = await this.redis.get(`otp:${phone}`);
        } catch (redisError: any) {
            console.warn(`[WARN] Redis get failed, falling back to memory store:`, redisError.message);
            const entry = this.memoryOtpStore.get(phone);
            if (entry) {
                if (entry.expiresAt > Date.now()) {
                    cachedOtp = entry.otp;
                } else {
                    this.memoryOtpStore.delete(phone);
                }
            }
        }

        if (!cachedOtp || cachedOtp !== otp) {
            throw new UnauthorizedException('Invalid or expired OTP');
        }

        try {
            await this.redis.del(`otp:${phone}`);
        } catch (redisError: any) {
            console.warn(`[WARN] Redis del failed, removing from memory store:`, redisError.message);
            this.memoryOtpStore.delete(phone);
        }

        const workspaces = await this.buildWorkspacesForUser(user.id);

        const tokens = await this.generateTokens(user.id, user.phone, null, null);
        return { 
            ...tokens, 
            workspaces, 
            user: { 
                id: user.id, 
                phone: user.phone, 
                name: user.name,
                profileName: user.profileName,
                phoneVisibility: user.phoneVisibility,
                // Surfaced so the mobile onboarding gate can decide whether
                // the user still needs to pick a visibility (we currently
                // default to GLOBAL server-side, but the client UI still
                // needs to render the current selection).
                profileVisibility: (user as any).profileVisibility,
                linkBusinessProfile: (user as any).linkBusinessProfile,
                profilePhoto: this.storageService.resolvePublicMediaUrl(user.profilePhoto),
            } 
        };
    }

    async adminLogin(email: string, password: string) {
        const staff = await this.prisma.masterRead.staffAccount.findUnique({
            where: { email },
            include: { client: true }
        });
        
        if (!staff || !staff.password) throw new UnauthorizedException('Invalid credentials');
        const valid = await bcrypt.compare(password, staff.password);
        if (!valid) throw new UnauthorizedException('Invalid credentials');
        if (!staff.isActive) throw new UnauthorizedException('Account is disabled');

        const tokens = await this.generateTokens(staff.id, null, staff.clientId, staff.role as string);
        
        return { 
            ...tokens, 
            user: { 
                id: staff.id, 
                email: staff.email, 
                role: staff.role, 
                clientId: staff.clientId,
                dbName: staff.client?.dbName || 'resido_core'
            } 
        };
    }

    async getWorkspaces(userId: string) {
        return this.buildWorkspacesForUser(userId);
    }

    private async buildWorkspacesForUser(userId: string) {
        const memberships = await this.prisma.userRead.workspaceMembership.findMany({
            where: { userId, isActive: true },
            orderBy: { createdAt: 'asc' },
        });

        const tenantIds = [...new Set(memberships.map((m) => m.tenantId))];
        const clients = tenantIds.length
            ? await this.prisma.masterRead.client.findMany({
                  where: { id: { in: tenantIds } },
                  select: { id: true, name: true, photoUrl: true, dbName: true },
              })
            : [];
        const clientById = new Map(clients.map((c) => [c.id, c]));

        const grouped = memberships.reduce((acc: Record<string, any>, m) => {
            if (!acc[m.tenantId]) {
                acc[m.tenantId] = { ...m, roles: [m.role] };
            } else {
                acc[m.tenantId].roles.push(m.role);
            }
            return acc;
        }, {});

        return Object.values(grouped).map((m: any) => {
            const client = clientById.get(m.tenantId);
            const rawPhoto = m.photoUrl || client?.photoUrl;
            return {
                tenantId: m.tenantId,
                tenantName: m.tenantName || client?.name,
                role: m.role,
                roles: m.roles,
                memberId: m.memberId,
                dbName: client?.dbName || 'resido_core',
                photoUrl: this.storageService.resolvePublicMediaUrl(rawPhoto),
            };
        });
    }

    async switchWorkspace(userId: string, tenantId: string, role?: string) {
        // Find membership — if role specified, find that exact one; else pick the first active one
        const membership = role
            ? await this.prisma.userRead.workspaceMembership.findFirst({
                where: { userId, tenantId, role: role as Role, isActive: true },
            })
            : await this.prisma.userRead.workspaceMembership.findFirst({
                where: { userId, tenantId, isActive: true },
                orderBy: { createdAt: 'asc' },
            });

        if (!membership) throw new UnauthorizedException('Access denied to this workspace');

        const client = await this.prisma.masterRead.client.findUnique({
            where: { id: tenantId },
            select: { dbName: true, name: true, photoUrl: true }
        });

        const allMemberships = await this.prisma.userRead.workspaceMembership.findMany({
            where: { userId, tenantId, isActive: true }
        });
        const roles = allMemberships.map(m => m.role);

        // Keep phone in the token so downstream services can resolve the member by phone too.
        const user = await this.prisma.userRead.user.findUnique({
            where: { id: userId },
            select: { phone: true },
        });

        const tokens = await this.generateTokens(userId, user?.phone || null, tenantId, membership.role as string);
        return {
            ...tokens,
            workspace: {
                ...membership,
                roles,
                tenantName: membership.tenantName || client?.name,
                dbName: client?.dbName || 'resido_core',
                photoUrl: this.storageService.resolvePublicMediaUrl(
                    membership.photoUrl || client?.photoUrl,
                ),
            },
        };
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwt.verify(refreshToken, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
            });
            // Re-fetch phone in case the refresh token was minted before we started embedding it.
            let phone = payload.phone || null;
            if (!phone && payload.sub) {
                const u = await this.prisma.userRead.user.findUnique({
                    where: { id: payload.sub },
                    select: { phone: true },
                });
                phone = u?.phone || null;
            }
            const tokens = await this.generateTokens(payload.sub, phone, payload.tenantId, payload.role);
            return tokens;
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async syncMembership(phone: string, tenantId: string, tenantName: string, role: string, name?: string, age?: number, address?: string) {
        // 1. Ensure user exists
        let user = await this.prisma.userRead.user.findUnique({ where: { phone } });
        if (!user) {
            user = await this.prisma.userClient.user.create({ 
                data: { 
                    phone, 
                    name, 
                    age, 
                    location: address,
                    isActive: true 
                } 
            });
        } else {
            // Update existing user details if provided
            user = await this.prisma.userClient.user.update({
                where: { id: user.id },
                data: {
                    name: name || user.name,
                    age: age || user.age,
                    location: address || user.location
                }
            });
        }

        // 2. Upsert membership per role (allows same user to have multiple roles in same community)
        const membership = await this.prisma.userClient.workspaceMembership.upsert({
            where: { userId_tenantId_role: { userId: user.id, tenantId, role: role as Role } },
            update: { 
                isActive: true,
                ...(tenantName ? { tenantName } : {}) 
            },
            create: {
                user: { connect: { id: user.id } },
                tenantId,
                tenantName: tenantName || 'Unknown Community',
                role: role as Role,
                memberId: `mem-${phone.slice(-4)}`,
                isActive: true
            }
        });

        return { user, membership };
    }

    async syncMembershipDeactivation(phone: string, tenantId: string, role: string) {
        const user = await this.prisma.userRead.user.findUnique({ where: { phone } });
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        try {
            const membership = await this.prisma.userClient.workspaceMembership.update({
                where: { userId_tenantId_role: { userId: user.id, tenantId, role: role as Role } },
                data: { isActive: false }
            });
            return { success: true, membership };
        } catch (error: any) {
            console.error('Failed to deactivate workspace membership:', error.message);
            return { success: false, error: error.message };
        }
    }

    async syncContacts(userId: string, phones: string[]) {
        const normalized = phones.map(p => p.replace(/\D/g, ''));
        
        // We'll use suffix matching for better discovery
        // Fetch all active users and filter in-memory for accuracy
        const allUsers = await this.prisma.userRead.user.findMany({
            where: { isActive: true },
            select: {
                id: true,
                phone: true,
                name: true,
                profileName: true,
                phoneVisibility: true,
                profilePhoto: true
            }
        });

        const registered = allUsers.filter(user => {
            const userPhone = user.phone.replace(/\D/g, '');
            return normalized.some(p => {
                // Match if exact or if last 10 digits match (common for varied prefixes)
                return p === userPhone || (p.length >= 10 && userPhone.endsWith(p.slice(-10)));
            });
        });

        // Automatically follow registered contacts
        if (userId) {
            for (const contact of registered) {
                if (contact.id !== userId) {
                    await this.followService.followUser(userId, contact.id);
                }
            }
        }

        return registered;
    }

    async getMe(userId: string) {
        return this.prisma.userRead.user.findUnique({
            where: { id: userId },
            select: { 
                id: true, 
                phone: true, 
                email: true, 
                name: true, 
                profileName: true, 
                phoneVisibility: true, 
                profilePhoto: true,
                role: true 
            },
        });
    }

    private async generateTokens(userId: string, phone: string | null, tenantId: string | null, role: string | null) {
        const payload = { sub: userId, phone, tenantId, role };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.signAsync(payload, {
                secret: this.config.get('JWT_SECRET'),
                expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
            }),
            this.jwt.signAsync(payload, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
                expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
            }),
        ]);
        return { accessToken, refreshToken };
    }
}
