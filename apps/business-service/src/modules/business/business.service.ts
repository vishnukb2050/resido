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
                        description: s.description,
                        pricingType: s.pricingType,
                        price: typeof s.price === 'number' ? s.price : parseFloat(s.price?.toString().replace(/,/g, '') || '0'),
                        responseTime: s.responseTime,
                        isEmergency: s.isEmergency || false
                    }))
                }
            },
            include: { services: true }
        });
    }

    async listProfiles(params: { category?: string, pincode?: string, district?: string, state?: string, tenantId?: string }) {
        const { category, pincode, district, state, tenantId } = params;

        return this.prisma.businessProfile.findMany({
            where: {
                tenantId: tenantId || undefined,
                category: category || undefined,
                isActive: true,
                OR: [
                    // Tier 1: Pan India reach
                    { serviceAreaType: 'PAN_INDIA' },
                    // Tier 2: State reach
                    state ? {
                        serviceAreaType: 'STATE',
                        serviceAreaValues: { has: state }
                    } : {},
                    // Tier 3: District reach
                    district ? {
                        serviceAreaType: 'DISTRICT',
                        serviceAreaValues: { has: district }
                    } : {},
                    // Tier 4: Pincode reach
                    pincode ? {
                        serviceAreaType: 'PINCODE',
                        serviceAreaValues: { has: pincode }
                    } : {},
                    // Legacy/Exact match
                    pincode ? { location: pincode } : {}
                ].filter(condition => Object.keys(condition).length > 0)
            },
            include: { services: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getProfilesByUserId(userId: string) {
        return this.prisma.businessProfile.findMany({
            where: { userId },
            include: { services: true },
            orderBy: { createdAt: 'desc' }
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
                            description: s.description,
                            pricingType: s.pricingType,
                            price: typeof s.price === 'number' ? s.price : parseFloat(s.price?.toString().replace(/,/g, '') || '0'),
                            responseTime: s.responseTime,
                            isEmergency: s.isEmergency || false
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
