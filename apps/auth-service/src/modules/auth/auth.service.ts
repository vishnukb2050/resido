import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService,
        private otpService: OtpService,
        @Inject('REDIS_CLIENT') private redis: Redis,
    ) { }

    async sendOtp(phone: string) {
        console.log(`[DEBUG] Starting sendOtp for ${phone}`);
        
        // Find or create user
        console.log(`[DEBUG] Checking Prisma for user...`);
        let user = await this.prisma.reader.user.findUnique({ where: { phone } });
        if (!user) {
            console.log(`[DEBUG] User not found, creating user...`);
            user = await this.prisma.user.create({ data: { phone } });
        }
        console.log(`[DEBUG] User ID: ${user.id}`);

        // Generate real 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[DEBUG] Generated OTP: ${otp}`);

        // Store in Redis with 5 min expiry (key: otp:phone)
        console.log(`[DEBUG] Storing OTP in Redis...`);
        await this.redis.set(`otp:${phone}`, otp, 'EX', 300);
        console.log(`[DEBUG] Redis store successful.`);

        console.log(`[DEBUG] Calling OtpService.sendOtp...`);
        await this.otpService.sendOtp(phone, otp);
        console.log(`[DEBUG] OtpService.sendOtp successful.`);

        return { message: 'OTP sent successfully', phone };
    }

    async verifyOtp(phone: string, otp: string) {
        const user = await this.prisma.reader.user.findUnique({ where: { phone } });
        if (!user) throw new UnauthorizedException('User not found');

        const cachedOtp = await this.redis.get(`otp:${phone}`);
        if (!cachedOtp || cachedOtp !== otp) {
            throw new UnauthorizedException('Invalid or expired OTP');
        }

        // Cleanup OTP after verification
        await this.redis.del(`otp:${phone}`);

        const memberships = await this.prisma.reader.workspaceMembership.findMany({
            where: { userId: user.id, isActive: true },
        });

        // Fetch dbName for each tenant
        const workspaces = await Promise.all(memberships.map(async (m) => {
            const client = await this.prisma.reader.client.findUnique({
                where: { id: m.tenantId },
                select: { dbName: true }
            });
            return {
                ...m,
                dbName: client?.dbName || ''
            };
        }));

        const tokens = await this.generateTokens(user.id, user.phone, null, null);

        return { ...tokens, workspaces, user: { id: user.id, phone: user.phone, name: user.name } };
    }

    async adminLogin(email: string, password: string) {
        const staff = await this.prisma.reader.staffAccount.findUnique({
            where: { email },
            include: { client: true }
        });
        
        if (!staff || !staff.password) throw new UnauthorizedException('Invalid credentials');

        const valid = await bcrypt.compare(password, staff.password);
        if (!valid) throw new UnauthorizedException('Invalid credentials');

        if (!staff.isActive) throw new UnauthorizedException('Account is disabled');

        const tokens = await this.generateTokens(staff.id, null, staff.clientId, staff.role as string);
        
        // Include dbName in response for convenience
        return { 
            ...tokens, 
            user: { 
                id: staff.id, 
                email: staff.email, 
                role: staff.role, 
                clientId: staff.clientId,
                dbName: staff.client?.dbName
            } 
        };
    }

    async getWorkspaces(userId: string) {
        return this.prisma.reader.workspaceMembership.findMany({
            where: { userId, isActive: true },
        });
    }

    async switchWorkspace(userId: string, tenantId: string) {
        const membership = await this.prisma.reader.workspaceMembership.findUnique({
            where: { userId_tenantId: { userId, tenantId } },
        });
        if (!membership) throw new UnauthorizedException('Access denied to this workspace');

        const client = await this.prisma.reader.client.findUnique({
            where: { id: tenantId },
            select: { dbName: true }
        });

        const tokens = await this.generateTokens(userId, null, tenantId, membership.role as string);
        return { ...tokens, workspace: { ...membership, dbName: client?.dbName || '' } };
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

    async syncContacts(phones: string[]) {
        // Normalize phones (keep only digits)
        const normalized = phones.map(p => p.replace(/\D/g, ''));
        
        const registered = await this.prisma.reader.user.findMany({
            where: {
                phone: { in: normalized },
                isActive: true
            },
            select: {
                id: true,
                phone: true,
                name: true
            }
        });

        return registered;
    }

    async getMe(userId: string) {
        return this.prisma.reader.user.findUnique({
            where: { id: userId },
            select: { id: true, phone: true, email: true, name: true, role: true },
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
