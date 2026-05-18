import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessService {
    constructor(private prisma: PrismaService) {}

    async createProfile(userId: string, tenantId: string, data: any) {
        const { services, pincode, city, expertise, description, images, ...rest } = data;
        
        const profileData = {
            profileType: rest.profileType || 'BUSINESS',
            businessName: rest.businessName,
            category: rest.category,
            subcategory: rest.subcategory,
            businessType: rest.businessType || 'INDIVIDUAL',
            about: rest.about || description || '',
            logo: rest.logo || (images && images[0]) || null,
            experience: rest.experience || expertise || null,
            phone: rest.phone,
            email: rest.email,
            website: rest.website,
            workingHours: rest.workingHours,
            instagram: rest.instagram,
            linkedin: rest.linkedin,
            location: rest.location || pincode || null,
            area: rest.area || city || null,
            fullAddress: rest.fullAddress,
            latitude: rest.latitude,
            longitude: rest.longitude,
            serviceAreaType: rest.serviceAreaType,
            serviceAreaValues: rest.serviceAreaValues,
            serviceRadiusKm: rest.serviceRadiusKm,
        };

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

    async listProfiles(params: { 
        category?: string, 
        pincode?: string, 
        district?: string, 
        state?: string, 
        tenantId?: string,
        lat?: number,
        lng?: number,
        radius?: number // User's search radius (optional)
    }) {
        const { category, pincode, district, state, tenantId, lat, lng, radius } = params;

        // Base query for administrative matches
        const adminConditions: any[] = [
            { serviceAreaType: 'PAN_INDIA' },
            state ? { serviceAreaType: 'STATE', serviceAreaValues: { has: state } } : null,
            district ? { serviceAreaType: 'DISTRICT', serviceAreaValues: { has: district } } : null,
            pincode ? { serviceAreaType: 'PINCODE', serviceAreaValues: { has: pincode } } : null,
            pincode ? { location: pincode } : null
        ].filter(Boolean);

        // If no lat/lng, stick to standard Prisma findMany
        if (!lat || !lng) {
            return this.prisma.businessProfile.findMany({
                where: {
                    tenantId: tenantId || undefined,
                    category: category || undefined,
                    isActive: true,
                    OR: adminConditions.length > 0 ? adminConditions : undefined
                },
                include: { services: true },
                orderBy: { createdAt: 'desc' }
            });
        }

        // Hybrid Geospatial Query using $queryRaw
        // 1. Matches administrative tiers
        // 2. Matches providers whose radius covers the user's current lat/lng
        // 3. Matches providers within the user's requested search radius
        const profiles = await this.prisma.$queryRawUnsafe(`
            SELECT DISTINCT b.* FROM business_profiles b
            WHERE b."isActive" = true
            ${category ? `AND b.category = '${category}'` : ''}
            ${tenantId ? `AND b."tenantId" = '${tenantId}'` : ''}
            AND (
                -- Administrative Matches
                "serviceAreaType" = 'PAN_INDIA'
                ${state ? `OR ("serviceAreaType" = 'STATE' AND '${state}' = ANY("serviceAreaValues"))` : ''}
                ${district ? `OR ("serviceAreaType" = 'DISTRICT' AND '${district}' = ANY("serviceAreaValues"))` : ''}
                ${pincode ? `OR ("serviceAreaType" = 'PINCODE' AND '${pincode}' = ANY("serviceAreaValues"))` : ''}
                
                -- Geospatial Match: User is within Provider's configured radius
                OR (
                    b.latitude IS NOT NULL AND b.longitude IS NOT NULL AND b."serviceRadiusKm" IS NOT NULL
                    AND ST_DWithin(
                        ST_SetSRID(ST_MakePoint(b.longitude, b.latitude), 4326)::geography,
                        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
                        b."serviceRadiusKm" * 1000
                    )
                )
                
                -- Geospatial Match: Provider is within User's requested search radius
                ${radius ? `
                OR (
                    b.latitude IS NOT NULL AND b.longitude IS NOT NULL
                    AND ST_DWithin(
                        ST_SetSRID(ST_MakePoint(b.longitude, b.latitude), 4326)::geography,
                        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
                        ${radius} * 1000
                    )
                )` : ''}
            )
            ORDER BY b."createdAt" DESC
        `);

        // Get IDs to fetch with services (to maintain Prisma's nice include/typing)
        const ids = (profiles as any[]).map(p => p.id);
        
        return this.prisma.businessProfile.findMany({
            where: { id: { in: ids } },
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
        const { services, pincode, city, expertise, description, images, ...rest } = data;
        
        const profileData = {
            profileType: rest.profileType,
            businessName: rest.businessName,
            category: rest.category,
            subcategory: rest.subcategory,
            businessType: rest.businessType,
            about: rest.about || description,
            logo: rest.logo || (images && images[0]),
            experience: rest.experience || expertise,
            phone: rest.phone,
            email: rest.email,
            website: rest.website,
            workingHours: rest.workingHours,
            instagram: rest.instagram,
            linkedin: rest.linkedin,
            location: rest.location || pincode,
            area: rest.area || city,
            fullAddress: rest.fullAddress,
            latitude: rest.latitude,
            longitude: rest.longitude,
            serviceAreaType: rest.serviceAreaType,
            serviceAreaValues: rest.serviceAreaValues,
            serviceRadiusKm: rest.serviceRadiusKm,
        };

        // Remove undefined fields to prevent overwriting with null/undefined unless intended
        Object.keys(profileData).forEach(key => (profileData as any)[key] === undefined && delete (profileData as any)[key]);

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
