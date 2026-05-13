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
        const count = await this.prisma.userRead.locationMaster.count();
        if (count > 0) {
            this.logger.log('📍 Location database already populated.');
            return;
        }

        this.logger.log('📍 Starting automatic location ingestion...');
        try {
            const filePath = path.join(__dirname, '../../assets/pincodes.json');
            if (!fs.existsSync(filePath)) {
                this.logger.warn('⚠️ Location asset file not found at ' + filePath);
                return;
            }

            const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (!Array.isArray(rawData)) return;

            this.logger.log(`📥 Processing ${rawData.length} locations...`);
            
            const BATCH_SIZE = 5000;
            for (let i = 0; i < rawData.length; i += BATCH_SIZE) {
                const batch = rawData.slice(i, i + BATCH_SIZE);
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

                await this.prisma.userClient.locationMaster.createMany({
                    data,
                    skipDuplicates: true
                });
                this.logger.log(`✅ Ingested ${i + data.length}/${rawData.length}...`);
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
                age: data.age ? parseInt(data.age) : undefined,
                description: data.description,
                profilePhoto: profilePhotoUrl,
                profileName: data.profileName,
                phoneVisibility: data.phoneVisibility,
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
                isActive: true
            },
            create: {
                userId,
                category: data.category,
                description: data.description,
                pincode: data.pincode,
                city: data.city,
                district: data.district,
                state: data.state,
                expertise: data.expertise,
                images: data.images
            }
        });
    }

    async searchServices(category: string, locationData: { pincode?: string; district?: string; state?: string }) {
        const { pincode, district, state } = locationData;

        // Smart Visibility Intersection:
        // We match providers who serve the user's specific location
        return this.prisma.userRead.jobProfile.findMany({
            where: {
                category: category,
                isActive: true,
                OR: [
                    // Case 1: Provider serves this specific pincode
                    { 
                        serviceAreaType: 'PINCODE',
                        serviceAreaValues: { has: pincode }
                    },
                    // Case 2: Provider serves this district
                    {
                        serviceAreaType: 'DISTRICT',
                        serviceAreaValues: { has: district }
                    },
                    // Case 3: Provider serves this state
                    {
                        serviceAreaType: 'STATE',
                        serviceAreaValues: { has: state }
                    },
                    // Case 4: Provider is PAN_INDIA
                    {
                        serviceAreaType: 'PAN_INDIA'
                    },
                    // Fallback: Legacy match (if no serviceAreaType is set)
                    {
                        OR: [
                            { pincode: pincode },
                            { district: { contains: district, mode: 'insensitive' } }
                        ]
                    }
                ]
            },
            include: {
                user: {
                    select: {
                        name: true,
                        phone: true,
                        profilePhoto: true
                    }
                }
            },
            orderBy: [
                { serviceAreaType: 'asc' }, // Prioritize PINCODE over DISTRICT over STATE
                { createdAt: 'desc' }
            ]
        });
    }

    async searchLocations(query: string) {
        if (!query || query.length < 2) return [];

        return this.prisma.userRead.locationMaster.findMany({
            where: {
                searchStr: {
                    contains: query.toLowerCase()
                }
            },
            take: 10,
            orderBy: {
                placeName: 'asc'
            }
        });
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
