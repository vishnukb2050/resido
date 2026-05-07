import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService,
    ) {}

    /**
     * Email + password login for web panel staff
     * Returns a JWT scoped to a single clientId
     */
    async emailLogin(email: string, password: string) {
        const staff = await this.prisma.masterRead.staffAccount.findUnique({
            where: { email },
            include: { client: { select: { id: true, name: true, slug: true, dbName: true, isActive: true } } },
        });

        if (!staff || !staff.isActive) {
            throw new UnauthorizedException('Invalid credentials or account inactive.');
        }

        if (!staff.client.isActive) {
            throw new UnauthorizedException('Your community account has been suspended.');
        }

        // If no password set yet → invite not yet accepted
        if (!staff.password) {
            throw new UnauthorizedException(
                'Please accept your invite first. Check your email for the invite link.',
            );
        }

        const valid = await bcrypt.compare(password, staff.password);
        if (!valid) throw new UnauthorizedException('Invalid email or password.');

        // Update last login
        await this.prisma.masterClient.staffAccount.update({
            where: { id: staff.id },
            data: { lastLoginAt: new Date() },
        });

        const token = await this.generateStaffToken(staff, staff.client);
        return {
            accessToken: token,
            staff: {
                id: staff.id,
                email: staff.email,
                role: staff.role,
            },
            client: {
                id: staff.client.id,
                name: staff.client.name,
                slug: staff.client.slug,
                dbName: staff.client.dbName,
            },
        };
    }

    /**
     * Accept invite — verify token, set password for first time
     */
    async acceptInvite(inviteToken: string, password: string) {
        const staff = await this.prisma.masterClient.staffAccount.findUnique({
            where: { inviteToken },
            include: { client: { select: { id: true, name: true, slug: true, dbName: true } } },
        });

        if (!staff) throw new BadRequestException('Invalid or expired invite link.');
        if (staff.inviteExpiry && staff.inviteExpiry < new Date()) {
            throw new BadRequestException('This invite link has expired. Please contact your admin.');
        }

        const hashed = await bcrypt.hash(password, 12);

        const updated = await this.prisma.masterClient.staffAccount.update({
            where: { id: staff.id },
            data: {
                password: hashed,
                inviteToken: null,
                inviteExpiry: null,
                lastLoginAt: new Date(),
            },
        });

        const token = await this.generateStaffToken(updated, staff.client);
        return {
            accessToken: token,
            message: `Welcome! Your account is now active for ${staff.client.name}.`,
            staff: { id: updated.id, email: updated.email, role: updated.role },
            client: staff.client,
        };
    }

    /**
     * Validate invite token (used to pre-fill email on accept-invite page)
     */
    async validateInviteToken(inviteToken: string) {
        const staff = await this.prisma.masterRead.staffAccount.findUnique({
            where: { inviteToken },
            include: { client: { select: { name: true } } },
        });

        if (!staff) throw new BadRequestException('Invalid invite link.');
        if (staff.inviteExpiry && staff.inviteExpiry < new Date()) {
            throw new BadRequestException('This invite link has expired.');
        }

        return {
            email: staff.email,
            role: staff.role,
            communityName: staff.client.name,
        };
    }

    /**
     * Get staff profile + client info (for /me endpoint)
     */
    async getMe(staffId: string) {
        const staff = await this.prisma.masterRead.staffAccount.findUnique({
            where: { id: staffId },
            include: {
                client: {
                    select: { id: true, name: true, slug: true, dbName: true, plan: true },
                },
            },
        });
        if (!staff) throw new NotFoundException('Staff account not found.');
        return {
            id: staff.id,
            email: staff.email,
            role: staff.role,
            client: staff.client,
        };
    }

    private async generateStaffToken(staff: any, client: any) {
        return this.jwt.signAsync(
            {
                sub: staff.id,
                email: staff.email,
                clientId: client.id,
                clientSlug: client.slug,
                dbName: client.dbName,
                role: staff.role,
                type: 'staff', // distinguish from mobile user tokens
            },
            {
                secret: this.config.get('JWT_SECRET'),
                expiresIn: this.config.get('JWT_EXPIRES_IN', '7d'),
            },
        );
    }
}
