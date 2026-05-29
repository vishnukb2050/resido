import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as fs from 'fs';
import * as path from 'path';

/** Canonical district labels for GPS consensus voting (must match business-service aliases). */
const DISTRICT_CANONICAL: Record<string, string> = {
    trivandrum: 'Thiruvananthapuram',
    thiruvananthapuram: 'Thiruvananthapuram',
    ernakulam: 'Ernakulam',
    kochi: 'Ernakulam',
    cochin: 'Ernakulam',
    kozhikode: 'Kozhikode',
    calicut: 'Kozhikode',
    kollam: 'Kollam',
    quilon: 'Kollam',
    alappuzha: 'Alappuzha',
    alleppey: 'Alappuzha',
    palakkad: 'Palakkad',
    palghat: 'Palakkad',
    kannur: 'Kannur',
    cannanore: 'Kannur',
    bengaluru: 'Bengaluru',
    bangalore: 'Bengaluru',
    mysuru: 'Mysuru',
    mysore: 'Mysuru',
    mangaluru: 'Mangaluru',
    mangalore: 'Mangaluru',
    chennai: 'Chennai',
    madras: 'Chennai',
};

type ReverseGeoNeighbor = {
    id: string;
    placeName: string;
    pincode: string;
    district: string;
    state: string;
    latitude: number;
    longitude: number;
    distance_m: number;
};

@Injectable()
export class ProfileService implements OnModuleInit {
    private readonly logger = new Logger(ProfileService.name);

    /** Only consider pincode centroids within this radius (metres). */
    private static readonly REVERSE_GEO_MAX_M = 20_000;
    private static readonly REVERSE_GEO_LIMIT = 15;
    /** Prefer consensus among neighbors inside this tighter band. */
    private static readonly REVERSE_GEO_CONSENSUS_M = 12_000;

    constructor(
        private prisma: PrismaService,
        private storageService: StorageService
    ) { }

    private canonicalDistrictKey(district: string): string {
        const trimmed = (district || '').trim();
        if (!trimmed) return '';
        const alias = DISTRICT_CANONICAL[trimmed.toLowerCase()];
        return alias || trimmed;
    }

    /**
     * Pick district/state from several nearby pincodes instead of trusting
     * only the single closest row (which often sits across a district line).
     */
    private resolveAdminFromNeighbors(neighbors: ReverseGeoNeighbor[]): { district: string; state: string } | null {
        if (!neighbors.length) return null;

        const withinBand = neighbors.filter((n) => n.distance_m <= ProfileService.REVERSE_GEO_CONSENSUS_M);
        const pool = withinBand.length >= 3 ? withinBand : neighbors.slice(0, Math.min(8, neighbors.length));

        const scores = new Map<string, { score: number; district: string; state: string; minDist: number }>();

        for (const row of pool) {
            const districtLabel = (row.district || '').trim();
            const stateLabel = (row.state || '').trim();
            if (!districtLabel || !stateLabel) continue;

            const canon = this.canonicalDistrictKey(districtLabel);
            const bucketKey = `${canon.toLowerCase()}|${stateLabel.toLowerCase()}`;
            const weight = 1 / (row.distance_m + 500);
            const prev = scores.get(bucketKey) || {
                score: 0,
                district: districtLabel,
                state: stateLabel,
                minDist: row.distance_m,
            };
            prev.score += weight;
            if (row.distance_m < prev.minDist) {
                prev.minDist = row.distance_m;
                prev.district = districtLabel;
                prev.state = stateLabel;
            }
            scores.set(bucketKey, prev);
        }

        let best: { score: number; district: string; state: string } | null = null;
        for (const entry of scores.values()) {
            if (!best || entry.score > best.score) {
                best = { score: entry.score, district: entry.district, state: entry.state };
            }
        }

        return best ? { district: best.district, state: best.state } : null;
    }

    private async queryReverseGeoNeighbors(lat: number, lng: number, useRadiusFilter: boolean): Promise<ReverseGeoNeighbor[]> {
        const maxM = ProfileService.REVERSE_GEO_MAX_M;
        const limit = ProfileService.REVERSE_GEO_LIMIT;
        const radiusClause = useRadiusFilter
            ? `AND ST_DWithin(
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
                ${maxM}
            )`
            : '';

        const sql = `
            SELECT
                id,
                "placeName",
                pincode,
                district,
                state,
                latitude,
                longitude,
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
                ) AS distance_m
            FROM location_master
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ${radiusClause}
            ORDER BY distance_m
            LIMIT ${limit}
        `;

        const rows = await this.prisma.geoRead.$queryRawUnsafe(sql);
        return Array.isArray(rows) ? (rows as ReverseGeoNeighbor[]) : [];
    }

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

        // The phone number is the OTP-verified identity for an account, so
        // we never accept changes from this endpoint. Re-verification would
        // need a dedicated change-number flow.
        const allowedPhoneVisibility = ['PUBLIC', 'COMMUNITY', 'FOLLOWERS'];

        // profileName is globally unique. Normalise + pre-check so we can
        // throw a friendly ConflictException instead of leaking Prisma's
        // P2002 stack trace to the client (which the mobile onboarding
        // screen renders inline as "username taken").
        let normalizedProfileName: string | undefined;
        if (typeof data.profileName === 'string') {
            const trimmed = data.profileName.trim().toLowerCase();
            if (trimmed) {
                const taken = await this.prisma.userRead.user.findFirst({
                    where: { profileName: trimmed, NOT: { id: userId } },
                    select: { id: true },
                });
                if (taken) {
                    throw new ConflictException('That username is already taken. Try another one.');
                }
                normalizedProfileName = trimmed;
            }
        }

        let user;
        try {
            user = await this.prisma.userClient.user.update({
                where: { id: userId },
                data: {
                    name: data.name || undefined,
                    email: data.email || undefined,
                    age: data.age && !isNaN(parseInt(data.age)) ? parseInt(data.age) : undefined,
                    description: data.description || undefined,
                    profilePhoto: profilePhotoUrl || undefined,
                    profileName: normalizedProfileName,
                    phoneVisibility: data.phoneVisibility && allowedPhoneVisibility.includes(data.phoneVisibility)
                        ? data.phoneVisibility
                        : undefined,
                    profileVisibility: data.profileVisibility && ['GLOBAL', 'CONTACTS', 'COMMUNITY', 'FOLLOWERS'].includes(data.profileVisibility)
                        ? data.profileVisibility
                        : undefined,
                    // Persist the "Link Business Profile" toggle. Skip silently if
                    // the field is absent so an unrelated profile edit doesn't
                    // accidentally turn the link off.
                    linkBusinessProfile: typeof data.linkBusinessProfile === 'boolean'
                        ? data.linkBusinessProfile
                        : undefined,
                    instagram: data.instagram || undefined,
                    linkedin: data.linkedin || undefined,
                    website: data.website || undefined,
                    location: data.location || undefined,
                }
            });
        } catch (err: any) {
            // Race-condition safety net: another request may have grabbed the
            // same username between our pre-check and the write.
            if (err?.code === 'P2002' && Array.isArray(err?.meta?.target) && err.meta.target.includes('profileName')) {
                throw new ConflictException('That username is already taken. Try another one.');
            }
            throw err;
        }

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
        const lowerQuery = query.toLowerCase().trim();

        this.logger.debug(`🔍 Search Location Query: "${query}"`);

        // Search for matches across multiple fields. `state` is included so
        // typing a state name (e.g. "Kerala") returns rows for the whole
        // state — the frontend then aggregates those into a single "Entire
        // State" suggestion. `searchStr` is a pre-built concatenation of
        // place + pincode + district + state, so it usually catches what the
        // explicit columns miss, but we still keep the explicit columns for
        // deterministic ordering against the various indexes.
        const results = await this.prisma.geoRead.locationMaster.findMany({
            where: {
                OR: [
                    { placeName: { contains: query, mode: 'insensitive' } },
                    { district: { contains: query, mode: 'insensitive' } },
                    { state: { contains: query, mode: 'insensitive' } },
                    { pincode: { startsWith: query } },
                    { searchStr: { contains: lowerQuery, mode: 'insensitive' } },
                ],
            },
            take: 200, // Pull more so state/district aggregation has signal.
            select: {
                id: true,
                placeName: true,
                pincode: true,
                district: true,
                state: true,
                latitude: true,
                longitude: true,
            },
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
        }).slice(0, 50); // Keep enough rows so the client can build
                          // state/district aggregations even when the user
                          // types a broad term like a state name.
    }

    async reverseGeocode(lat: number, lng: number) {
        const safeLat = Number(lat);
        const safeLng = Number(lng);
        if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) {
            throw new BadRequestException('Invalid latitude or longitude.');
        }

        let neighbors: ReverseGeoNeighbor[] = [];
        try {
            neighbors = await this.queryReverseGeoNeighbors(safeLat, safeLng, true);
            if (!neighbors.length) {
                neighbors = await this.queryReverseGeoNeighbors(safeLat, safeLng, false);
            }
        } catch (err: any) {
            this.logger.error(`reverseGeocode query failed: ${err?.message || err}`);
            return null;
        }

        if (!neighbors.length) return null;

        const closest = neighbors[0];
        const admin = this.resolveAdminFromNeighbors(neighbors);
        const district = admin?.district || closest.district;
        const state = admin?.state || closest.state;

        const closestCanon = this.canonicalDistrictKey(closest.district);
        const resolvedCanon = this.canonicalDistrictKey(district);
        if (closestCanon && resolvedCanon && closestCanon !== resolvedCanon) {
            this.logger.debug(
                `reverseGeocode consensus override: nearest pincode was "${closest.district}" ` +
                `(${(closest.distance_m / 1000).toFixed(1)} km) → using "${district}" from ${neighbors.length} neighbors`,
            );
        }

        return {
            id: closest.id,
            placeName: closest.placeName,
            pincode: closest.pincode,
            district,
            state,
            latitude: closest.latitude,
            longitude: closest.longitude,
            distanceKm: Number(closest.distance_m) / 1000,
        };
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

    /**
     * Identity-only user search for global dropdowns (MySpace search bar
     * etc.). Returns just the public identity – `name`, `profileName`,
     * `profilePhoto`, `profileVisibility` – without phone visibility
     * gating. Any further access controls (bio, contact, posts) are
     * enforced by `getPublicProfile` when the viewer actually opens the
     * profile. This matches the spec: "if the profile is contacts-only,
     * non-contacts should only see the profile name".
     */
    async searchUsersPublic(query: string, limit = 10) {
        const q = (query || '').trim();
        if (q.length < 2) return [];

        const users = await this.prisma.userRead.user.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { profileName: { contains: q, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                profileName: true,
                profilePhoto: true,
                profileVisibility: true,
                linkBusinessProfile: true,
            },
            take: Math.max(1, Math.min(50, limit)),
        });

        // For users who opted in to "Link Business Profile", attach a
        // lightweight count of their active business profiles so the
        // search dropdown can show a "Owns business" chip without an
        // extra round-trip.
        const linkedIds = users
            .filter((u: any) => u.linkBusinessProfile)
            .map((u: any) => u.id);
        let bizCountByUser: Record<string, number> = {};
        if (linkedIds.length) {
            try {
                const rows = await this.prisma.coreRead.businessProfile.groupBy({
                    by: ['userId'],
                    where: { userId: { in: linkedIds }, isActive: true },
                    _count: { id: true },
                });
                bizCountByUser = Object.fromEntries(
                    rows.map((r: any) => [r.userId, r._count?.id || 0]),
                );
            } catch {
                bizCountByUser = {};
            }
        }

        return users.map((u: any) => ({
            id: u.id,
            name: u.name,
            profileName: u.profileName,
            profilePhoto: this.storageService.resolvePublicMediaUrl(u.profilePhoto),
            profileVisibility: u.profileVisibility || 'GLOBAL',
            linkBusinessProfile: !!u.linkBusinessProfile,
            businessProfileCount: u.linkBusinessProfile ? (bizCountByUser[u.id] || 0) : 0,
        }));
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


    /**
     * Smart follow:
     *   - target.profileVisibility === GLOBAL  → create the Follow immediately
     *     (returns `{ status: 'FOLLOWING' }`).
     *   - any restricted visibility            → create a FollowRequest and
     *     wait for the target user to accept (returns `{ status: 'REQUESTED' }`).
     * If the requester is already following the target, returns FOLLOWING.
     * If a pending request already exists, returns REQUESTED.
     */
    async followUser(followerId: string, followingId: string) {
        if (!followerId || !followingId || followerId === followingId) {
            return { status: 'SELF' as const };
        }

        const target = await this.prisma.userRead.user.findUnique({
            where: { id: followingId },
            select: { id: true, profileVisibility: true },
        });
        if (!target) throw new NotFoundException('User not found');

        const existingFollow = await this.prisma.userRead.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
        });
        if (existingFollow) return { status: 'FOLLOWING' as const };

        if ((target as any).profileVisibility === 'GLOBAL') {
            await this.prisma.userClient.follow.create({
                data: { followerId, followingId },
            });
            return { status: 'FOLLOWING' as const };
        }

        // Restricted visibility — require an accepted follow request.
        await (this.prisma.userClient as any).followRequest.upsert({
            where: { requesterId_targetId: { requesterId: followerId, targetId: followingId } },
            create: { requesterId: followerId, targetId: followingId },
            update: {},
        });
        return { status: 'REQUESTED' as const };
    }

    /**
     * Removes the follow relation and any pending request between the two
     * users. Idempotent — safe to call even if nothing exists.
     */
    async unfollowUser(followerId: string, followingId: string) {
        await Promise.all([
            this.prisma.userClient.follow.deleteMany({
                where: { followerId, followingId },
            }),
            (this.prisma.userClient as any).followRequest.deleteMany({
                where: { requesterId: followerId, targetId: followingId },
            }),
        ]);
        return { status: 'NOT_FOLLOWING' as const };
    }

    async getFollowing(userId: string) {
        const following = await this.prisma.userRead.follow.findMany({
            where: { followerId: userId },
            include: { following: true }
        });
        return following.map(f => f.following);
    }

    async getFollowers(userId: string) {
        const followers = await this.prisma.userRead.follow.findMany({
            where: { followingId: userId },
            include: { follower: true },
        });
        return followers.map(f => f.follower);
    }

    /**
     * Batch lookup of `profileVisibility` for a set of user IDs. Used by the
     * blog service to gate per-author so a CONTACTS-only profile's posts
     * don't leak into the feed of someone who can't view that profile.
     */
    async getProfileVisibilities(userIds: string[]): Promise<Record<string, string>> {
        if (!Array.isArray(userIds) || userIds.length === 0) return {};
        const unique = Array.from(new Set(userIds.filter(Boolean)));
        const users = await this.prisma.userRead.user.findMany({
            where: { id: { in: unique } },
            select: { id: true, profileVisibility: true },
        });
        return users.reduce((acc, u: any) => {
            acc[u.id] = u.profileVisibility || 'GLOBAL';
            return acc;
        }, {} as Record<string, string>);
    }

    /**
     * Batch lookup of lightweight public identities, scoped strictly to
     * users who opted into the "Link Business Profile" toggle. Used by
     * the mobile app to render an "owned by …" chip on business search
     * results without N+1 round-trips.
     *
     * Returns `{ [userId]: { id, name, profileName, profilePhoto,
     * profileVisibility, linkBusinessProfile: true } }`. Users who did
     * not opt in are omitted from the result so the caller can use
     * presence in the map as a shortcut for "should I render the chip".
     */
    async getPublicIdentitiesBatch(userIds: string[]): Promise<Record<string, any>> {
        if (!Array.isArray(userIds) || userIds.length === 0) return {};
        const unique = Array.from(new Set(userIds.filter(Boolean)));
        if (unique.length === 0) return {};
        const users = await this.prisma.userRead.user.findMany({
            where: { id: { in: unique }, isActive: true, linkBusinessProfile: true },
            select: {
                id: true,
                name: true,
                profileName: true,
                profilePhoto: true,
                profileVisibility: true,
            },
        });
        return users.reduce((acc: Record<string, any>, u: any) => {
            acc[u.id] = {
                id: u.id,
                name: u.name,
                profileName: u.profileName,
                profilePhoto: this.storageService.resolvePublicMediaUrl(u.profilePhoto),
                profileVisibility: u.profileVisibility || 'GLOBAL',
                linkBusinessProfile: true,
            };
            return acc;
        }, {});
    }

    async getFollowCounts(userId: string) {
        const [followersCount, followingCount] = await Promise.all([
            this.prisma.userRead.follow.count({ where: { followingId: userId } }),
            this.prisma.userRead.follow.count({ where: { followerId: userId } }),
        ]);
        return { followersCount, followingCount };
    }

    /**
     * What's the relationship between `viewerId` and `targetId`?
     *   - SELF: same user.
     *   - FOLLOWING: an accepted Follow row exists.
     *   - REQUESTED: a pending FollowRequest exists.
     *   - NOT_FOLLOWING: nothing.
     */
    async getFollowStatus(viewerId: string, targetId: string) {
        if (!viewerId || !targetId) return { status: 'NOT_FOLLOWING' as const };
        if (viewerId === targetId) return { status: 'SELF' as const };
        const [follow, request] = await Promise.all([
            this.prisma.userRead.follow.findUnique({
                where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
            }),
            (this.prisma.userRead as any).followRequest.findUnique({
                where: { requesterId_targetId: { requesterId: viewerId, targetId } },
            }),
        ]);
        if (follow) return { status: 'FOLLOWING' as const };
        if (request) return { status: 'REQUESTED' as const };
        return { status: 'NOT_FOLLOWING' as const };
    }

    /** Pending follow requests waiting on `userId`'s approval. */
    async listIncomingFollowRequests(userId: string) {
        const rows = await (this.prisma.userRead as any).followRequest.findMany({
            where: { targetId: userId },
            include: {
                requester: {
                    select: {
                        id: true, name: true, profileName: true, profilePhoto: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((r: any) => ({
            id: r.id,
            createdAt: r.createdAt,
            requester: {
                ...r.requester,
                profilePhoto: this.storageService.resolvePublicMediaUrl(r.requester?.profilePhoto),
            },
        }));
    }

    /** Approving an incoming follow request promotes it into a Follow row. */
    async acceptFollowRequest(userId: string, requestId: string) {
        const req = await (this.prisma.userRead as any).followRequest.findUnique({
            where: { id: requestId },
        });
        if (!req) throw new NotFoundException('Follow request not found');
        if (req.targetId !== userId) {
            throw new BadRequestException('You can only accept requests sent to you');
        }
        await this.prisma.userClient.$transaction([
            (this.prisma.userClient as any).follow.upsert({
                where: { followerId_followingId: { followerId: req.requesterId, followingId: req.targetId } },
                create: { followerId: req.requesterId, followingId: req.targetId },
                update: {},
            }),
            (this.prisma.userClient as any).followRequest.delete({ where: { id: requestId } }),
        ]);
        return { status: 'ACCEPTED' as const };
    }

    async rejectFollowRequest(userId: string, requestId: string) {
        const req = await (this.prisma.userRead as any).followRequest.findUnique({
            where: { id: requestId },
        });
        if (!req) throw new NotFoundException('Follow request not found');
        if (req.targetId !== userId) {
            throw new BadRequestException('You can only reject requests sent to you');
        }
        await (this.prisma.userClient as any).followRequest.delete({ where: { id: requestId } });
        return { status: 'REJECTED' as const };
    }

    /**
     * Public profile view for any user. Visibility is gated by
     * `profileVisibility`:
     *   - GLOBAL    → always full
     *   - FOLLOWERS → viewer must follow target
     *   - CONTACTS  → mutual follow (target also follows viewer)
     *   - COMMUNITY → viewer and target share at least one workspace
     *
     * When restricted, only the bare-minimum identity (name, profileName,
     * profilePhoto) is returned along with `isRestricted: true` and the
     * current `followStatus` so the client can render the gated UI.
     */
    async getPublicProfile(targetId: string, viewerId?: string) {
        const target = await this.prisma.userRead.user.findUnique({
            where: { id: targetId },
            include: { workspaceMemberships: true },
        });
        if (!target) throw new NotFoundException('User not found');

        const profileVisibility = (target as any).profileVisibility || 'GLOBAL';
        const isSelf = !!viewerId && viewerId === targetId;
        const counts = await this.getFollowCounts(targetId);
        const followStatus = viewerId
            ? await this.getFollowStatus(viewerId, targetId)
            : { status: 'NOT_FOLLOWING' as const };

        let allowed = isSelf || profileVisibility === 'GLOBAL';
        if (!allowed && viewerId) {
            if (profileVisibility === 'FOLLOWERS') {
                allowed = followStatus.status === 'FOLLOWING';
            } else if (profileVisibility === 'CONTACTS') {
                const reverse = await this.prisma.userRead.follow.findUnique({
                    where: { followerId_followingId: { followerId: targetId, followingId: viewerId } },
                });
                allowed = followStatus.status === 'FOLLOWING' && !!reverse;
            } else if (profileVisibility === 'COMMUNITY') {
                const viewerTenants = await this.prisma.userRead.workspaceMembership.findMany({
                    where: { userId: viewerId, isActive: true },
                    select: { tenantId: true },
                });
                const tenantIds = new Set(viewerTenants.map((m) => m.tenantId));
                allowed = (target.workspaceMemberships || []).some((m) => tenantIds.has(m.tenantId));
            }
        }

        const linkBusinessProfile = !!(target as any).linkBusinessProfile;

        const baseIdentity = {
            id: target.id,
            name: target.name,
            profileName: target.profileName,
            profilePhoto: this.storageService.resolvePublicMediaUrl(target.profilePhoto),
            profileVisibility,
            linkBusinessProfile,
            ...counts,
            followStatus: followStatus.status,
            isRestricted: !allowed,
        };

        // Phone has its own visibility (PUBLIC / COMMUNITY / FOLLOWERS).
        // Even when the broader profile is visible, the phone is only shown
        // when the viewer satisfies the phone visibility rule.
        const phoneVis = (target as any).phoneVisibility || 'COMMUNITY';
        let canSeePhone = isSelf || phoneVis === 'PUBLIC';
        if (!canSeePhone && viewerId) {
            if (phoneVis === 'FOLLOWERS') {
                canSeePhone = followStatus.status === 'FOLLOWING';
            } else if (phoneVis === 'COMMUNITY') {
                const viewerTenants = await this.prisma.userRead.workspaceMembership.findMany({
                    where: { userId: viewerId, isActive: true },
                    select: { tenantId: true },
                });
                const tenantIds = new Set(viewerTenants.map((m) => m.tenantId));
                canSeePhone = (target.workspaceMemberships || []).some((m) => tenantIds.has(m.tenantId));
            }
            // Deprecated GROUPS / CONTACTS values → treat as restricted.
        }

        // Resolve linked business profiles. We expose a lightweight summary
        // (id, name, category, logo, location, slot-count) so the UI can
        // render a compact card and route to /business-detail. We still
        // surface the chip on restricted profiles so a non-allowed viewer
        // knows "this person runs a business" and can open it, but we never
        // leak business contact details through the user payload.
        let linkedBusinessProfiles: any[] = [];
        if (linkBusinessProfile) {
            try {
                const businesses = await this.prisma.coreRead.businessProfile.findMany({
                    where: { userId: target.id, isActive: true },
                    select: {
                        id: true,
                        businessName: true,
                        category: true,
                        logo: true,
                        area: true,
                        location: true,
                        isVerified: true,
                        slots: { select: { id: true }, take: 1 },
                    },
                    orderBy: { createdAt: 'desc' },
                });
                linkedBusinessProfiles = businesses.map((b: any) => ({
                    id: b.id,
                    businessName: b.businessName,
                    category: b.category,
                    logo: this.storageService.resolvePublicMediaUrl(b.logo),
                    area: b.area || b.location || null,
                    isVerified: b.isVerified,
                    hasSlots: (b.slots?.length ?? 0) > 0,
                }));
            } catch (err: any) {
                this.logger.warn?.(`[getPublicProfile] linked-business lookup failed: ${err?.message}`);
            }
        }

        if (!allowed) {
            // Restricted profile preview — still surface phone if its own
            // visibility permits it (rare but possible: a user with a
            // contacts-only profile who set phone to PUBLIC). We also
            // include the linked business profiles list (the businesses
            // are public artifacts on their own) so a viewer who can't
            // see the personal profile can still open the linked shop.
            return {
                ...baseIdentity,
                phoneVisibility: phoneVis,
                ...(canSeePhone ? { phone: target.phone } : {}),
                linkedBusinessProfiles,
            };
        }

        return {
            ...baseIdentity,
            phone: canSeePhone ? target.phone : undefined,
            phoneVisibility: phoneVis,
            email: target.email,
            age: target.age,
            description: target.description,
            location: target.location,
            instagram: target.instagram,
            linkedin: target.linkedin,
            website: target.website,
            createdAt: target.createdAt,
            workspaceMemberships: target.workspaceMemberships,
            linkedBusinessProfiles,
        };
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

    async getNoteFolder(folderId: string, viewerId?: string) {
        const folder = await this.prisma.userRead.noteFolder.findUnique({
            where: { id: folderId },
            include: { pages: { orderBy: { createdAt: 'desc' } } }
        });
        if (!folder) throw new NotFoundException('Folder not found.');

        // Role-based access: only the owner or someone the folder/pages were
        // explicitly shared with (targetType=CONTACT, targetId=viewerId) may
        // read it. This guards the case where a recipient opens the folder
        // from "Shared with Me" and prevents non-recipients from accessing
        // by guessing/leaking a folder id.
        if (viewerId && folder.userId !== viewerId) {
            const folderShared = await this.prisma.userRead.noteShare.findFirst({
                where: {
                    folderId,
                    targetType: 'CONTACT',
                    targetId: viewerId,
                },
            });
            if (!folderShared) {
                // Maybe the viewer was granted access to individual pages only —
                // filter the folder.pages down to those.
                const pageIds = folder.pages.map((p: any) => p.id);
                const sharedPages = pageIds.length
                    ? await this.prisma.userRead.noteShare.findMany({
                          where: {
                              pageId: { in: pageIds },
                              targetType: 'CONTACT',
                              targetId: viewerId,
                          },
                          select: { pageId: true },
                      })
                    : [];
                if (sharedPages.length === 0) {
                    throw new ForbiddenException('You do not have access to this folder.');
                }
                const allowed = new Set(sharedPages.map((s: any) => s.pageId));
                return {
                    ...folder,
                    pages: folder.pages.filter((p: any) => allowed.has(p.id)),
                };
            }
        }
        return folder;
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

    /**
     * Permanently delete a single note page. Caller must own the folder that
     * contains it. Any NoteShare rows pointing at this page are removed first
     * so the FK cleanup is clean.
     */
    async deleteNotePage(userId: string, pageId: string) {
        if (!pageId) {
            throw new BadRequestException('Note id is required.');
        }
        const page = await this.prisma.userRead.notePage.findUnique({
            where: { id: pageId },
            include: { folder: true },
        });
        if (!page) {
            throw new NotFoundException('Note not found.');
        }
        if (page.folder?.userId !== userId) {
            throw new ForbiddenException('You can only delete your own notes.');
        }
        await this.prisma.userClient.noteShare.deleteMany({ where: { pageId } });
        await this.prisma.userClient.notePage.delete({ where: { id: pageId } });
        return { success: true };
    }

    /**
     * Permanently delete a folder and every note inside it. Caller must own
     * the folder. NoteShare rows that reference the folder or any of its
     * pages are removed first so deletes don't fail on FK constraints.
     */
    async deleteNoteFolder(userId: string, folderId: string) {
        if (!folderId) {
            throw new BadRequestException('Folder id is required.');
        }
        const folder = await this.prisma.userRead.noteFolder.findUnique({
            where: { id: folderId },
            include: { pages: { select: { id: true } } },
        });
        if (!folder) {
            throw new NotFoundException('Folder not found.');
        }
        if (folder.userId !== userId) {
            throw new ForbiddenException('You can only delete your own folders.');
        }
        const pageIds = folder.pages.map((p) => p.id);

        await this.prisma.userClient.noteShare.deleteMany({
            where: {
                OR: [
                    { folderId },
                    pageIds.length ? { pageId: { in: pageIds } } : { pageId: '___never___' },
                ],
            },
        });
        if (pageIds.length) {
            await this.prisma.userClient.notePage.deleteMany({
                where: { id: { in: pageIds } },
            });
        }
        await this.prisma.userClient.noteFolder.delete({ where: { id: folderId } });
        return { success: true, deletedPages: pageIds.length };
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

    async getDocumentFolder(folderId: string, viewerId?: string) {
        const folder = await this.prisma.userRead.documentFolder.findUnique({
            where: { id: folderId },
            include: { files: { orderBy: { createdAt: 'desc' } } }
        });
        if (!folder) throw new NotFoundException('Folder not found.');

        // Role-based access: owner or explicit share recipient (CONTACT.targetId)
        // can read. If only individual files were shared, return just those.
        if (viewerId && folder.userId !== viewerId) {
            const folderShared = await this.prisma.userRead.documentShare.findFirst({
                where: {
                    folderId,
                    targetType: 'CONTACT',
                    targetId: viewerId,
                },
            });
            if (!folderShared) {
                const fileIds = folder.files.map((f: any) => f.id);
                const sharedFiles = fileIds.length
                    ? await this.prisma.userRead.documentShare.findMany({
                          where: {
                              fileId: { in: fileIds },
                              targetType: 'CONTACT',
                              targetId: viewerId,
                          },
                          select: { fileId: true },
                      })
                    : [];
                if (sharedFiles.length === 0) {
                    throw new ForbiddenException('You do not have access to this folder.');
                }
                const allowed = new Set(sharedFiles.map((s: any) => s.fileId));
                return {
                    ...folder,
                    files: folder.files.filter((f: any) => allowed.has(f.id)),
                };
            }
        }
        return folder;
    }

    async addDocumentFile(
        userId: string,
        folderId: string | undefined,
        name: string,
        url: string,
        type: string,
        size?: number,
        title?: string,
        description?: string,
    ) {
        let targetFolderId = folderId;

        // No folder selected → use (or lazily create) the user's "General" folder.
        // This lets the user upload from the main Documents screen without
        // first navigating into a folder.
        if (!targetFolderId) {
            let general = await this.prisma.userRead.documentFolder.findFirst({
                where: { userId, name: 'General' },
            });
            if (!general) {
                general = await this.prisma.userClient.documentFolder.create({
                    data: { userId, name: 'General' },
                });
            }
            targetFolderId = general.id;
        } else {
            // Make sure the supplied folder belongs to this user.
            const owned = await this.prisma.userRead.documentFolder.findUnique({
                where: { id: targetFolderId },
            });
            if (!owned || owned.userId !== userId) {
                throw new ForbiddenException('You can only upload to your own folders.');
            }
        }

        const cleanTitle = typeof title === 'string' ? title.trim() : '';
        const cleanDesc = typeof description === 'string' ? description.trim() : '';

        return this.prisma.userClient.documentFile.create({
            data: {
                folderId: targetFolderId,
                name,
                title: cleanTitle ? cleanTitle : null,
                description: cleanDesc ? cleanDesc : null,
                url,
                type,
                size,
            },
        });
    }

    /**
     * Delete a single document file. Owner-only. Cleans up DocumentShare rows
     * pointing at this file first to satisfy FK constraints.
     */
    async deleteDocumentFile(userId: string, fileId: string) {
        if (!fileId) {
            throw new BadRequestException('Document id is required.');
        }
        const file = await this.prisma.userRead.documentFile.findUnique({
            where: { id: fileId },
            include: { folder: true },
        });
        if (!file) {
            throw new NotFoundException('Document not found.');
        }
        if (file.folder?.userId !== userId) {
            throw new ForbiddenException('You can only delete your own documents.');
        }
        await this.prisma.userClient.documentShare.deleteMany({ where: { fileId } });
        await this.prisma.userClient.documentFile.delete({ where: { id: fileId } });
        return { success: true };
    }

    /**
     * Delete an entire document folder and every file in it. Owner-only.
     * Cleans up DocumentShare rows for the folder and any of its files first.
     */
    async deleteDocumentFolder(userId: string, folderId: string) {
        if (!folderId) {
            throw new BadRequestException('Folder id is required.');
        }
        const folder = await this.prisma.userRead.documentFolder.findUnique({
            where: { id: folderId },
            include: { files: { select: { id: true } } },
        });
        if (!folder) {
            throw new NotFoundException('Folder not found.');
        }
        if (folder.userId !== userId) {
            throw new ForbiddenException('You can only delete your own folders.');
        }
        const fileIds = folder.files.map((f) => f.id);

        await this.prisma.userClient.documentShare.deleteMany({
            where: {
                OR: [
                    { folderId },
                    fileIds.length ? { fileId: { in: fileIds } } : { fileId: '___never___' },
                ],
            },
        });
        if (fileIds.length) {
            await this.prisma.userClient.documentFile.deleteMany({
                where: { id: { in: fileIds } },
            });
        }
        await this.prisma.userClient.documentFolder.delete({ where: { id: folderId } });
        return { success: true, deletedFiles: fileIds.length };
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
