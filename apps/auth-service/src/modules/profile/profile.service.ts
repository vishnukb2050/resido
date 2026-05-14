import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProfileService implements OnModuleInit {
    private readonly logger = new Logger(ProfileService.name);

    constructor(
        private prisma: PrismaService,
        private storageService: StorageService
    ) {}

    async onModuleInit() {
        // Run ingestion in background to not block startup
        this.seedLocations();
    }

    private async seedLocations() {
        const count = await this.prisma.geoRead.locationMaster.count();
        // If we already have a lot of data, we might just want to update the GPS ones
        if (count > 100000) { 
            this.logger.log('📍 Location database already populated.');
            return;
        }

        this.logger.log('📍 Starting automatic location ingestion...');
        try {
            // 1. Load standard pincodes
            const pincodesPath = path.join(__dirname, '../../assets/pincodes.json');
            if (fs.existsSync(pincodesPath)) {
                const rawPincodes = JSON.parse(fs.readFileSync(pincodesPath, 'utf8'));
                if (Array.isArray(rawPincodes)) {
                    this.logger.log(`📥 Processing ${rawPincodes.length} pincodes...`);
                    const BATCH_SIZE = 5000;
                    for (let i = 0; i < rawPincodes.length; i += BATCH_SIZE) {
                        const batch = rawPincodes.slice(i, i + BATCH_SIZE);
                        const data = batch.map((item: any) => {
                            const placeName = item.officename.replace(/ B\.O| S\.O| H\.O/g, '').trim();
                            const pincode = String(item.pincode);
                            return {
                                placeName,
                                pincode,
                                district: item.Districtname,
                                state: item.statename,
                                searchStr: `${placeName} ${pincode} ${item.Districtname} ${item.statename}`.toLowerCase()
                            };
                        });
                        await this.prisma.geoClient.locationMaster.createMany({
                            data,
                            skipDuplicates: true
                        });
                    }
                }
            }

            // 2. Load high-precision South India data with coordinates
            const geoPath = path.join(__dirname, '../../assets/south_india_geo.json');
            if (fs.existsSync(geoPath)) {
                const rawGeo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
                if (Array.isArray(rawGeo)) {
                    this.logger.log(`📥 Ingesting ${rawGeo.length} high-precision South India locations...`);
                    for (const item of rawGeo) {
                        await this.prisma.geoClient.locationMaster.upsert({
                            where: { id: `geo_${item.state}_${item.placeName}_${item.pincode}`.toLowerCase().replace(/\s/g, '_') },
                            create: {
                                id: `geo_${item.state}_${item.placeName}_${item.pincode}`.toLowerCase().replace(/\s/g, '_'),
                                placeName: item.placeName,
                                pincode: String(item.pincode),
                                district: item.district,
                                state: item.state,
                                latitude: item.latitude,
                                longitude: item.longitude,
                                searchStr: `${item.placeName} ${item.pincode} ${item.district} ${item.state}`.toLowerCase()
                            },
                            update: {
                                latitude: item.latitude,
                                longitude: item.longitude
                            }
                        });
                    }
                }
            }

            this.logger.log('🎉 Location database ingestion complete!');
        } catch (error) {
            this.logger.error('❌ Failed to seed locations:', error);
        }
    }

    async updateProfile(userId: string, data: any, file?: any) {
        let profilePhotoUrl = data.profilePhoto;

        if (file) {
            // Get user's first membership for structured key
            const userWithMembership = await this.prisma.userRead.user.findUnique({
                where: { id: userId },
                include: { workspaceMemberships: { take: 1 } }
            });
            
            const tenantId = (userWithMembership as any)?.workspaceMemberships?.[0]?.tenantId || 'global';
            
            const uploadResult = await this.storageService.uploadFile(
                file, 
                tenantId, 
                userId, 
                'profiles'
            );
            profilePhotoUrl = uploadResult.fileUrl;
        }

        const user = await this.prisma.userClient.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                age: data.age && !isNaN(parseInt(data.age)) ? parseInt(data.age) : undefined,
                description: data.description,
                profilePhoto: profilePhotoUrl,
                profileName: data.profileName,
                phoneVisibility: data.phoneVisibility,
                instagram: data.instagram,
                linkedin: data.linkedin,
                website: data.website,
                location: data.location,
            }
        });

        // Sync to resident-service members with same phone
        if (user.phone) {
            await this.prisma.coreClient.member.updateMany({
                where: { phone: user.phone },
                data: {
                    profileName: user.profileName,
                    phoneVisibility: user.phoneVisibility,
                    name: user.name,
                    profilePhoto: user.profilePhoto,
                    instagram: user.instagram,
                    linkedin: user.linkedin,
                    website: user.website,
                    location: user.location,
                }
            });
        }

        return user;
    }

    async getJobProfile(userId: string) {
        return this.prisma.userRead.jobProfile.findUnique({
            where: { userId }
        });
    }

    async upsertJobProfile(userId: string, data: any) {
        return this.prisma.userClient.jobProfile.upsert({
            where: { userId },
            update: {
                category: data.category,
                description: data.description,
                pincode: data.pincode,
                city: data.city,
                district: data.district,
                state: data.state,
                expertise: data.expertise,
                images: data.images,
                latitude: data.latitude,
                longitude: data.longitude,
                serviceRadiusKm: data.serviceRadiusKm,
                serviceAreaType: data.serviceAreaType,
                serviceAreaValues: data.serviceAreaValues,
                isActive: true
            } as any,
            create: {
                userId,
                category: data.category,
                description: data.description,
                pincode: data.pincode,
                city: data.city,
                district: data.district,
                state: data.state,
                expertise: data.expertise,
                images: data.images,
                latitude: data.latitude,
                longitude: data.longitude,
                serviceRadiusKm: data.serviceRadiusKm,
                serviceAreaType: data.serviceAreaType,
                serviceAreaValues: data.serviceAreaValues
            } as any
        });
    }

    async searchServices(category: string, locationData: { pincode?: string; district?: string; state?: string; lat?: number; lng?: number; radius?: number }) {
        const { pincode, district, state, lat, lng, radius } = locationData;

        // If no lat/lng, stick to standard Prisma findMany
        if (!lat || !lng) {
            const orConditions: any[] = [
                { serviceAreaType: 'PAN_INDIA' }
            ];

            if (pincode) {
                orConditions.push({ serviceAreaType: 'PINCODE', serviceAreaValues: { has: pincode } });
                orConditions.push({ pincode: pincode });
            }
            if (district) {
                orConditions.push({ serviceAreaType: 'DISTRICT', serviceAreaValues: { has: district } });
                orConditions.push({ district: { contains: district, mode: 'insensitive' } });
            }
            if (state) {
                orConditions.push({ serviceAreaType: 'STATE', serviceAreaValues: { has: state } });
            }

            return this.prisma.userRead.jobProfile.findMany({
                where: {
                    category: category || undefined,
                    isActive: true,
                    OR: orConditions
                },
                include: {
                    user: { select: { name: true, phone: true, profilePhoto: true } }
                },
                orderBy: [
                    { serviceAreaType: 'asc' },
                    { createdAt: 'desc' }
                ]
            });
        }

        // Hybrid Geospatial Query for JobProfiles
        const profiles = await this.prisma.userRead.$queryRawUnsafe(`
            SELECT DISTINCT j.* FROM job_profiles j
            WHERE j."isActive" = true
            AND j.category = '${category}'
            AND (
                -- Administrative Matches
                "serviceAreaType" = 'PAN_INDIA'
                ${state ? `OR ("serviceAreaType" = 'STATE' AND '${state}' = ANY("serviceAreaValues"))` : ''}
                ${district ? `OR ("serviceAreaType" = 'DISTRICT' AND '${district}' = ANY("serviceAreaValues"))` : ''}
                ${pincode ? `OR ("serviceAreaType" = 'PINCODE' AND '${pincode}' = ANY("serviceAreaValues"))` : ''}
                
                -- Geospatial Match: User is within Provider's configured radius
                OR (
                    j.latitude IS NOT NULL AND j.longitude IS NOT NULL AND j."serviceRadiusKm" IS NOT NULL
                    AND ST_DWithin(
                        ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
                        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
                        j."serviceRadiusKm" * 1000
                    )
                )
                
                -- Geospatial Match: Provider is within User's requested search radius
                ${radius ? `
                OR (
                    j.latitude IS NOT NULL AND j.longitude IS NOT NULL
                    AND ST_DWithin(
                        ST_SetSRID(ST_MakePoint(j.longitude, j.latitude), 4326)::geography,
                        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
                        ${radius} * 1000
                    )
                )` : ''}
            )
            ORDER BY j."createdAt" DESC
        `);

        const ids = (profiles as any[]).map(p => p.id);

        return this.prisma.userRead.jobProfile.findMany({
            where: { id: { in: ids } },
            include: {
                user: { select: { name: true, phone: true, profilePhoto: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async searchLocations(query: string) {
        if (!query || query.length < 2) return [];

        return this.prisma.geoRead.locationMaster.findMany({
            where: {
                searchStr: {
                    contains: query.toLowerCase()
                }
            },
            take: 10,
            select: {
                placeName: true,
                pincode: true,
                district: true,
                state: true,
                latitude: true,
                longitude: true
            },
            orderBy: {
                placeName: 'asc'
            }
        });
    }

    async reverseGeocode(lat: number, lng: number) {
        // Find nearest location in our local database
        const localMatch = await this.prisma.geoRead.$queryRawUnsafe(`
            SELECT * FROM location_master
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY ST_Distance(
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
            )
            LIMIT 1
        `);

        if (localMatch && Array.isArray(localMatch) && localMatch.length > 0) {
            return localMatch[0];
        }
        return null;
    }

    async saveScan(userId: string, data: string, type?: string) {
        return this.prisma.userClient.savedScan.create({
            data: { userId, data, type }
        });
    }

    async getSavedScans(userId: string) {
        return this.prisma.userRead.savedScan.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async searchUsers(query: string) {
        if (!query || query.length < 3) return [];

        return this.prisma.userRead.user.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } },
                    { profileName: { contains: query, mode: 'insensitive' } }
                ],
                isActive: true
            },
            select: {
                id: true,
                name: true,
                phone: true,
                profileName: true,
                profilePhoto: true
            },
            take: 20
        });
    }

    async followUser(followerId: string, followingId: string) {
        if (followerId === followingId) return;
        return this.prisma.userClient.follow.upsert({
            where: { followerId_followingId: { followerId, followingId } },
            create: { followerId, followingId },
            update: {}
        });
    }

    async unfollowUser(followerId: string, followingId: string) {
        return this.prisma.userClient.follow.deleteMany({
            where: { followerId, followingId }
        });
    }

    async getFollowing(userId: string) {
        const follows = await this.prisma.userRead.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });
        return follows.map(f => f.followingId);
    }
}
