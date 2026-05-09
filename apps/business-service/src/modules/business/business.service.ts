import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessService {
    constructor(private prisma: PrismaService) {}

    async createProfile(userId: string, tenantId: string, data: any) {
        const { services, ...profileData } = data;
        
        return this.prisma.businessProfile.create({
            data: {
                ...profileData,
                userId,
                tenantId,
                services: {
                    create: services?.map((s: any) => ({
                        name: s.name,
                        price: parseFloat(s.price?.replace(/,/g, '') || '0')
                    }))
                }
            },
            include: { services: true }
        });
    }

    async listProfiles(tenantId?: string, category?: string) {
        return this.prisma.businessProfile.findMany({
            where: {
                tenantId: tenantId || undefined,
                category: category || undefined,
                isActive: true
            },
            include: { services: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getProfileByUserId(userId: string) {
        return this.prisma.businessProfile.findFirst({
            where: { userId },
            include: { services: true }
        });
    }

    async getProfile(id: string) {
        return this.prisma.businessProfile.findUnique({
            where: { id },
            include: { services: true }
        });
    }

    async updateProfile(id: string, data: any) {
        const { services, ...profileData } = data;

        // If services are provided, we replace them
        if (services) {
            await this.prisma.serviceItem.deleteMany({ where: { businessProfileId: id } });
            return this.prisma.businessProfile.update({
                where: { id },
                data: {
                    ...profileData,
                    services: {
                        create: services.map((s: any) => ({
                            name: s.name,
                            price: parseFloat(s.price?.replace(/,/g, '') || '0')
                        }))
                    }
                },
                include: { services: true }
            });
        }

        return this.prisma.businessProfile.update({
            where: { id },
            data: profileData,
            include: { services: true }
        });
    }
}
