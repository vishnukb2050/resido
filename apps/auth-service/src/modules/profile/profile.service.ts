import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
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
    ) { }

    async onModuleInit() {
        // Run ingestion in background to not block startup
        this.seedLocations();
    }

    private async seedLocations() {
        try {
            const count = await this.prisma.geoRead.locationMaster.count();

            // 1. Load standard pincodes if DB is empty
            if (count < 50000) {
                this.logger.log('📍 Starting automatic location ingestion (Standard Pincodes)...');
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
            } else {
                this.logger.log('📍 Location database already contains base data.');
            }

            // 2. Load high-precision South India data with coordinates
            const geoPath = path.join(__dirname, '../../assets/south_india_geo.json');
            if (fs.existsSync(geoPath)) {
                const rawGeo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
                if (Array.isArray(rawGeo)) {
                    this.logger.log(`📥 Ingesting ${rawGeo.length} high-precision South India locations...`);
                    
                    // Clear existing geo entries to ensure coordinates are updated
                    await this.prisma.geoClient.locationMaster.deleteMany({
                        where: { id: { startsWith: 'geo_' } }
                    });

                    const BATCH_SIZE = 5000;
                    for (let i = 0; i < rawGeo.length; i += BATCH_SIZE) {
                        const batch = rawGeo.slice(i, i + BATCH_SIZE);
                        const data = batch.map((item: any) => ({
                            id: `geo_${item.state}_${item.placeName}_${item.pincode}`.toLowerCase().replace(/\s/g, '_'),
                            placeName: item.placeName,
                            pincode: String(item.pincode),
                            district: item.district,
                            state: item.state,
                            latitude: item.latitude,
                            longitude: item.longitude,
                            searchStr: `${item.placeName} ${item.pincode} ${item.district} ${item.state}`.toLowerCase()
                        }));

                        await this.prisma.geoClient.locationMaster.createMany({
                            data,
                            skipDuplicates: true
                        });
                        this.logger.log(`✅ Synced ${i + data.length}/${rawGeo.length} geo locations...`);
                    }
                }
            }

            // 3. Load highly granular OSM data for Kerala and Tamil Nadu
            const osmPath = path.join(__dirname, '../../assets/osm_detailed_geo.json');
            if (fs.existsSync(osmPath)) {
                const rawOsm = JSON.parse(fs.readFileSync(osmPath, 'utf8'));
                if (Array.isArray(rawOsm)) {
                    this.logger.log(`📥 Ingesting ${rawOsm.length} granular OSM locations for Kerala & TN...`);
                    
                    // Clear existing osm entries to ensure coordinates are updated
                    await this.prisma.geoClient.locationMaster.deleteMany({
                        where: { id: { startsWith: 'osm_' } }
                    });

                    const BATCH_SIZE = 5000;
                    for (let i = 0; i < rawOsm.length; i += BATCH_SIZE) {
                        const batch = rawOsm.slice(i, i + BATCH_SIZE);
                        const data = batch.map((item: any) => ({
                            id: `osm_${item.state}_${item.placeName}`.toLowerCase().replace(/\s/g, '_'),
                            placeName: item.placeName,
                            pincode: String(item.pincode),
                            district: item.district,
                            state: item.state,
                            latitude: item.latitude,
                            longitude: item.longitude,
                            searchStr: `${item.placeName} ${item.pincode} ${item.district} ${item.state}`.toLowerCase()
                        }));

                        await this.prisma.geoClient.locationMaster.createMany({
                            data,
                            skipDuplicates: true
                        });
                        this.logger.log(`✅ Synced ${i + data.length}/${rawOsm.length} granular locations...`);
                    }
                }
            }

            this.logger.log('🎉 Location database sync complete!');
        } catch (error) {
            this.logger.error('❌ Failed to seed locations:', error);
        }
    }

    async getProfile(userId: string) {
        const user = await this.prisma.userRead.user.findUnique({
            where: { id: userId },
            include: { workspaceMemberships: true }
        });
        if (!user) {
            throw new NotFoundException('User profile not found');
        }
        return {
            ...user,
            profilePhoto: this.storageService.resolvePublicMediaUrl(user.profilePhoto),
        };
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
                name: data.name || undefined,
                email: data.email || undefined,
                phone: data.phone || undefined,
                age: data.age && !isNaN(parseInt(data.age)) ? parseInt(data.age) : undefined,
                description: data.description || undefined,
                profilePhoto: profilePhotoUrl || undefined,
                profileName: data.profileName || undefined,
                phoneVisibility: data.phoneVisibility || undefined,
                instagram: data.instagram || undefined,
                linkedin: data.linkedin || undefined,
                website: data.website || undefined,
                location: data.location || undefined,
            }
        });

        // Sync to resident-service members with same phone
        if (user.phone) {
            try {
                await this.prisma.coreClient.member.updateMany({
                    where: { phone: user.phone },
                    data: {
                        name: user.name,
                        email: user.email,
                        profileName: user.profileName,
                        phoneVisibility: user.phoneVisibility,
                        profilePhoto: user.profilePhoto,
                        instagram: user.instagram,
                        linkedin: user.linkedin,
                        website: user.website,
                        location: user.location,
                    }
                });
            } catch (syncError) {
                this.logger.error(`Failed to sync member profile for phone ${user.phone}:`, syncError);
                // We don't throw here to allow the primary user update to succeed
            }
        }

        return {
            ...user,
            profilePhoto: this.storageService.resolvePublicMediaUrl(user.profilePhoto),
        };
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
                description: data.about || data.description,
                pincode: data.pincode || data.location,
                city: data.city || data.area,
                district: data.district,
                state: data.state,
                expertise: data.expertise || data.experience,
                images: data.images,
                latitude: data.latitude,
                longitude: data.longitude,
                serviceRadiusKm: data.serviceRadiusKm,
                serviceAreaType: data.serviceAreaType,
                serviceAreaValues: data.serviceAreaValues,
                businessName: data.businessName,
                businessType: data.businessType,
                experience: data.experience,
                phone: data.phone,
                email: data.email,
                website: data.website,
                instagram: data.instagram,
                linkedin: data.linkedin,
                workingHours: data.workingHours,
                services: data.services,
                isActive: true
            } as any,
            create: {
                userId,
                category: data.category,
                description: data.about || data.description,
                pincode: data.pincode || data.location,
                city: data.city || data.area,
                district: data.district,
                state: data.state,
                expertise: data.expertise || data.experience,
                images: data.images,
                latitude: data.latitude,
                longitude: data.longitude,
                serviceRadiusKm: data.serviceRadiusKm,
                serviceAreaType: data.serviceAreaType,
                serviceAreaValues: data.serviceAreaValues,
                businessName: data.businessName,
                businessType: data.businessType,
                experience: data.experience,
                phone: data.phone,
                email: data.email,
                website: data.website,
                instagram: data.instagram,
                linkedin: data.linkedin,
                workingHours: data.workingHours,
                services: data.services
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
                "serviceAreaType" = 'GLOBAL'
                OR "serviceAreaType" = 'PAN_INDIA'
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
        const lowerQuery = query.toLowerCase();
        
        this.logger.debug(`🔍 Search Location Query: "${query}"`);

        // Search for matches across multiple fields
        const results = await this.prisma.geoRead.locationMaster.findMany({
            where: {
                OR: [
                    { placeName: { contains: query, mode: 'insensitive' } },
                    { district: { contains: query, mode: 'insensitive' } },
                    { pincode: { startsWith: query } },
                    { searchStr: { contains: lowerQuery, mode: 'insensitive' } }
                ]
            },
            take: 100, // Fetch more to ensure we find coordinate matches
            select: {
                id: true,
                placeName: true,
                pincode: true,
                district: true,
                state: true,
                latitude: true,
                longitude: true
            }
        });

        this.logger.debug(`📍 Found ${results.length} potential matches for "${query}"`);
        const withCoords = results.filter(r => r.latitude && r.longitude).length;
        this.logger.debug(`📍 Results with Coordinates: ${withCoords}`);

        // Advanced Ranking
        return results.sort((a, b) => {
            const aName = a.placeName.toLowerCase();
            const bName = b.placeName.toLowerCase();

            // 1. TOP PRIORITY: Locations WITH coordinates (OSM/High-Precision)
            const aHasCoords = a.latitude !== null && a.longitude !== null;
            const bHasCoords = b.latitude !== null && b.longitude !== null;
            
            if (aHasCoords && !bHasCoords) return -1;
            if (!aHasCoords && bHasCoords) return 1;

            // 2. Exact match on placeName
            if (aName === lowerQuery && bName !== lowerQuery) return -1;
            if (aName !== lowerQuery && bName === lowerQuery) return 1;

            // 3. Starts with query
            if (aName.startsWith(lowerQuery) && !bName.startsWith(lowerQuery)) return -1;
            if (!aName.startsWith(lowerQuery) && bName.startsWith(lowerQuery)) return 1;

            // 4. Alphabetical
            return aName.localeCompare(bName);
        }).slice(0, 15); // Show top 15 results
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

    async searchUsers(searcherId: string, query: string) {
        if (!query || query.length < 3) return [];

        // Fetch potential matches
        const users = await this.prisma.userRead.user.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } },
                    { profileName: { contains: query, mode: 'insensitive' } }
                ],
                isActive: true
            },
            include: {
                workspaceMemberships: true
            },
            take: 50 // Fetch more to filter in memory
        });

        const filteredUsers = [];
        
        // Fetch searcher's memberships once to optimize
        const searcherMemberships = await this.prisma.userRead.workspaceMembership.findMany({
            where: { userId: searcherId }
        });

        for (const user of users) {
            // Always see yourself
            if (user.id === searcherId) {
                filteredUsers.push(user);
                continue;
            }

            const visibility = user.phoneVisibility || "FOLLOWERS,CONTACTS,GROUPS,COMMUNITY";
            const options = visibility.split(',').map(o => o.trim().toUpperCase());

            if (options.includes('GLOBAL')) {
                filteredUsers.push(user);
                continue;
            }

            let isVisible = false;

            // 1. Community Check (Shares a workspace)
            if (options.includes('COMMUNITY')) {
                const sharedWorkspace = user.workspaceMemberships.some(um => 
                    searcherMemberships.some(sm => sm.tenantId === um.tenantId)
                );
                if (sharedWorkspace) isVisible = true;
            }

            // 2. Followers Check (Searcher follows user)
            if (options.includes('FOLLOWERS') && !isVisible) {
                const follow = await this.prisma.userRead.follow.findFirst({
                    where: { followerId: searcherId, followingId: user.id }
                });
                if (follow) isVisible = true;
            }

            // 3. Contacts & Groups (Not explicitly in schema yet, but we allow them if we find a way later)
            // For now, we fall back to false for these unless they also match Community or Followers.

            if (isVisible) {
                filteredUsers.push({
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    profileName: user.profileName,
                    profilePhoto: user.profilePhoto
                });
            }
        }

        return filteredUsers.slice(0, 20);
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
        const following = await this.prisma.userRead.follow.findMany({
            where: { followerId: userId },
            include: { following: true }
        });
        return following.map(f => f.following);
    }

    async getUserWithMembership(userId: string) {
        return this.prisma.userRead.user.findUnique({
            where: { id: userId },
            include: { workspaceMemberships: { take: 1 } }
        });
    }

    async getPresignedUrl(fileName: string, contentType: string, tenantId: string, userId: string, resourceType?: string) {
        return this.storageService.getPresignedUrl(fileName, contentType, tenantId, userId, resourceType);
    }

    // --- Notes & Documents (My Space) ---

    async getNoteFolders(userId: string) {
        return this.prisma.userRead.noteFolder.findMany({
            where: { userId },
            include: { 
                _count: { select: { pages: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async createNoteFolder(userId: string, name: string) {
        return this.prisma.userClient.noteFolder.create({
            data: { userId, name }
        });
    }

    async getNoteFolder(folderId: string) {
        return this.prisma.userRead.noteFolder.findUnique({
            where: { id: folderId },
            include: { pages: { orderBy: { createdAt: 'desc' } } }
        });
    }

    async createNotePage(userId: string, folderId: string | undefined, title: string, content: string, color?: string) {
        let targetFolderId = folderId;

        if (!targetFolderId) {
            // Find or create "General" folder
            let generalFolder = await this.prisma.userRead.noteFolder.findFirst({
                where: { userId, name: 'General' }
            });

            if (!generalFolder) {
                generalFolder = await this.prisma.userClient.noteFolder.create({
                    data: { userId, name: 'General' }
                });
            }
            targetFolderId = generalFolder.id;
        }

        return this.prisma.userClient.notePage.create({
            data: { folderId: targetFolderId, title, content, color }
        });
    }

    async updateNotePage(pageId: string, data: { title?: string, content?: string, color?: string }) {
        return this.prisma.userClient.notePage.update({
            where: { id: pageId },
            data: data
        });
    }

    async getDocumentFolders(userId: string) {
        return this.prisma.userRead.documentFolder.findMany({
            where: { userId },
            include: { 
                _count: { select: { files: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async createDocumentFolder(userId: string, name: string, color?: string, icon?: string) {
        return this.prisma.userClient.documentFolder.create({
            data: { userId, name, color, icon }
        });
    }

    async getDocumentFolder(folderId: string) {
        return this.prisma.userRead.documentFolder.findUnique({
            where: { id: folderId },
            include: { files: { orderBy: { createdAt: 'desc' } } }
        });
    }

    async addDocumentFile(folderId: string, name: string, url: string, type: string, size?: number) {
        return this.prisma.userClient.documentFile.create({
            data: { folderId, name, url, type, size }
        });
    }

    async shareItem(userId: string, type: 'NOTE' | 'DOC', itemId: string, targetType: 'COMMUNITY' | 'GROUP' | 'CONTACT', targetId: string, isFolder: boolean) {
        if (type === 'NOTE') {
            return this.prisma.userClient.noteShare.create({
                data: {
                    userId,
                    targetType,
                    targetId,
                    [isFolder ? 'folderId' : 'pageId']: itemId
                }
            });
        } else {
            return this.prisma.userClient.documentShare.create({
                data: {
                    userId,
                    targetType,
                    targetId,
                    [isFolder ? 'folderId' : 'fileId']: itemId
                }
            });
        }
    }

    async getSharedNotes(userId: string) {
        return this.prisma.userRead.noteShare.findMany({
            where: {
                targetType: 'CONTACT',
                targetId: userId
            },
            include: {
                user: { select: { id: true, name: true, profileName: true, profilePhoto: true } },
                folder: true,
                page: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getSharedDocuments(userId: string) {
        return this.prisma.userRead.documentShare.findMany({
            where: {
                targetType: 'CONTACT',
                targetId: userId
            },
            include: {
                user: { select: { id: true, name: true, profileName: true, profilePhoto: true } },
                folder: true,
                file: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async addIncome(
        userId: string,
        data: { source: string; amount: number; date: string; description?: string; receiptUrl?: string },
    ) {
        if (!data?.source?.trim()) throw new BadRequestException('Income source is required');
        if (!data?.amount || Number.isNaN(Number(data.amount))) {
            throw new BadRequestException('Amount must be a number');
        }
        return this.prisma.userClient.personalIncome.create({
            data: {
                source: data.source.trim(),
                amount: Number(data.amount),
                description: data.description?.trim() || null,
                receiptUrl: data.receiptUrl || null,
                date: data.date ? new Date(data.date) : new Date(),
                userId,
            },
        });
    }

    async updateIncome(
        userId: string,
        id: string,
        data: { source?: string; amount?: number; date?: string; description?: string; receiptUrl?: string | null },
    ) {
        const existing = await this.prisma.userRead.personalIncome.findFirst({ where: { id, userId } });
        if (!existing) throw new NotFoundException('Income entry not found');

        return this.prisma.userClient.personalIncome.update({
            where: { id },
            data: {
                ...(data.source !== undefined ? { source: String(data.source).trim() } : {}),
                ...(data.amount !== undefined ? { amount: Number(data.amount) } : {}),
                ...(data.date !== undefined ? { date: new Date(data.date) } : {}),
                ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
                ...(data.receiptUrl !== undefined ? { receiptUrl: data.receiptUrl || null } : {}),
            },
        });
    }

    async deleteIncome(userId: string, id: string) {
        const existing = await this.prisma.userRead.personalIncome.findFirst({ where: { id, userId } });
        if (!existing) throw new NotFoundException('Income entry not found');
        await this.prisma.userClient.personalIncome.delete({ where: { id } });
        return { success: true, id };
    }

    async addExpense(
        userId: string,
        data: { amount: number; category: string; date: string; paymentMethod: string; description?: string; billUrl?: string },
    ) {
        if (!data?.amount || Number.isNaN(Number(data.amount))) {
            throw new BadRequestException('Amount must be a number');
        }
        if (!data?.category?.trim()) throw new BadRequestException('Category is required');
        if (!data?.paymentMethod?.trim()) throw new BadRequestException('Payment method is required');

        return this.prisma.userClient.personalExpense.create({
            data: {
                amount: Number(data.amount),
                category: data.category.trim(),
                date: data.date ? new Date(data.date) : new Date(),
                paymentMethod: data.paymentMethod.trim(),
                description: data.description?.trim() || null,
                billUrl: data.billUrl || null,
                userId,
            },
        });
    }

    async updateExpense(
        userId: string,
        id: string,
        data: {
            amount?: number;
            category?: string;
            date?: string;
            paymentMethod?: string;
            description?: string | null;
            billUrl?: string | null;
        },
    ) {
        const existing = await this.prisma.userRead.personalExpense.findFirst({ where: { id, userId } });
        if (!existing) throw new NotFoundException('Expense entry not found');

        return this.prisma.userClient.personalExpense.update({
            where: { id },
            data: {
                ...(data.amount !== undefined ? { amount: Number(data.amount) } : {}),
                ...(data.category !== undefined ? { category: String(data.category).trim() } : {}),
                ...(data.date !== undefined ? { date: new Date(data.date) } : {}),
                ...(data.paymentMethod !== undefined ? { paymentMethod: String(data.paymentMethod).trim() } : {}),
                ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
                ...(data.billUrl !== undefined ? { billUrl: data.billUrl || null } : {}),
            },
        });
    }

    async deleteExpense(userId: string, id: string) {
        const existing = await this.prisma.userRead.personalExpense.findFirst({ where: { id, userId } });
        if (!existing) throw new NotFoundException('Expense entry not found');
        await this.prisma.userClient.personalExpense.delete({ where: { id } });
        return { success: true, id };
    }

    async getFinanceReport(userId: string, period: string, startDate?: string, endDate?: string) {
        const where: any = { userId };
        const now = new Date();

        switch ((period || '').toUpperCase()) {
            case 'DAY': {
                // Specific calendar day, defaulting to today. `startDate` is the chosen day.
                const target = startDate ? new Date(startDate) : new Date();
                const dayStart = new Date(target);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(target);
                dayEnd.setHours(23, 59, 59, 999);
                where.date = { gte: dayStart, lte: dayEnd };
                break;
            }
            case 'WEEK': {
                const start = new Date();
                start.setDate(start.getDate() - 7);
                where.date = { gte: start };
                break;
            }
            case 'MONTH': {
                // If startDate is supplied, treat as the first day of the chosen month;
                // otherwise default to the current calendar month.
                const anchor = startDate ? new Date(startDate) : now;
                const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0);
                const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
                where.date = { gte: monthStart, lte: monthEnd };
                break;
            }
            case 'YEAR': {
                const start = new Date(now.getFullYear(), 0, 1);
                const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                where.date = { gte: start, lte: end };
                break;
            }
            case 'CUSTOM': {
                if (startDate && endDate) {
                    const s = new Date(startDate);
                    s.setHours(0, 0, 0, 0);
                    const e = new Date(endDate);
                    e.setHours(23, 59, 59, 999);
                    where.date = { gte: s, lte: e };
                }
                break;
            }
            case 'ALL':
            default:
                // No date filter — return everything.
                break;
        }

        const [incomes, expenses] = await Promise.all([
            this.prisma.userRead.personalIncome.findMany({ where, orderBy: { date: 'desc' } }),
            this.prisma.userRead.personalExpense.findMany({ where, orderBy: { date: 'desc' } }),
        ]);

        const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

        return {
            summary: {
                totalIncome,
                totalExpense,
                balance: totalIncome - totalExpense,
            },
            incomes,
            expenses,
        };
    }
}
