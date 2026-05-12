import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import { FollowService } from '../follow/follow.service';
import { Role } from '@resido/user-client';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService,
        private otpService: OtpService,
        private followService: FollowService,
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
            
            await this.redis.set(`otp:${phone}`, otp, 'EX', 300);
            console.log(`[DEBUG] OTP cached in Redis for: ${phone}`);
            
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

        const cachedOtp = await this.redis.get(`otp:${phone}`);
        if (!cachedOtp || cachedOtp !== otp) {
            throw new UnauthorizedException('Invalid or expired OTP');
        }
        await this.redis.del(`otp:${phone}`);

        const memberships = await this.prisma.userRead.workspaceMembership.findMany({
            where: { userId: user.id, isActive: true },
        });

        const workspaces = await Promise.all(memberships.map(async (m) => {
            const client = await this.prisma.masterRead.client.findUnique({
                where: { id: m.tenantId },
                select: { dbName: true }
            });
            return {
                ...m,
                dbName: client?.dbName || 'resido_core'
            };
        }));

        const tokens = await this.generateTokens(user.id, user.phone, null, null);
        return { 
            ...tokens, 
            workspaces, 
            user: { 
                id: user.id, 
                phone: user.phone, 
                name: user.name,
                profileName: user.profileName,
                phoneVisibility: user.phoneVisibility
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
        return this.prisma.userRead.workspaceMembership.findMany({
            where: { userId, isActive: true },
        });
    }

    async switchWorkspace(userId: string, tenantId: string) {
        const membership = await this.prisma.userRead.workspaceMembership.findUnique({
            where: { userId_tenantId: { userId, tenantId } },
        });
        if (!membership) throw new UnauthorizedException('Access denied to this workspace');

        const client = await this.prisma.masterRead.client.findUnique({
            where: { id: tenantId },
            select: { dbName: true }
        });

        const tokens = await this.generateTokens(userId, null, tenantId, membership.role as string);
        return { ...tokens, workspace: { ...membership, dbName: client?.dbName || 'resido_core' } };
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwt.verify(refreshToken, {
                secret: this.config.get('JWT_REFRESH_SECRET'),
            });
            const tokens = await this.generateTokens(payload.sub, payload.phone, payload.tenantId, payload.role);
            return tokens;
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async syncMembership(phone: string, tenantId: string, tenantName: string, role: string) {
        // 1. Ensure user exists
        let user = await this.prisma.userRead.user.findUnique({ where: { phone } });
        if (!user) {
            user = await this.prisma.userClient.user.create({ 
                data: { phone, isActive: true } 
            });
        }

        // 2. Create membership
        const membership = await this.prisma.userClient.workspaceMembership.upsert({
            where: { userId_tenantId: { userId: user.id, tenantId } },
            update: { role: role as Role, isActive: true, tenantName },
            create: {
                user: { connect: { id: user.id } },
                tenantId,
                tenantName,
                role: role as Role,
                memberId: `mem-${phone.slice(-4)}`,
                isActive: true
            }
        });

        return { user, membership };
    }

    async syncContacts(userId: string, phones: string[]) {
        const normalized = phones.map(p => p.replace(/\D/g, ''));
        const registered = await this.prisma.userRead.user.findMany({
            where: {
                phone: { in: normalized },
                isActive: true
            },
            select: {
                id: true,
                phone: true,
                name: true,
                profileName: true,
                phoneVisibility: true,
                profilePhoto: true
            }
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
