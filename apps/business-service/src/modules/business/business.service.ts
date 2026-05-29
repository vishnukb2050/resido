import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@resido/business-client';
import { PrismaService } from '../prisma/prisma.service';
import { LocationResolverService } from './location-resolver.service';

/**
 * Indian district / state name aliases.
 *
 * Reverse-geocode and the business creation dropdown may use different
 * conventions for the same place (e.g. "Thiruvananthapuram" vs "Trivandrum").
 * To make search robust we expand the searcher-supplied name into all of its
 * known synonyms and match against the stored `serviceAreaValues` array using
 * case/whitespace-insensitive comparison.
 *
 * Add new aliases here when users report mismatches.
 */
const DISTRICT_ALIASES: Record<string, string[]> = {
    // Kerala
    trivandrum: ['Trivandrum', 'Thiruvananthapuram'],
    thiruvananthapuram: ['Thiruvananthapuram', 'Trivandrum'],
    ernakulam: ['Ernakulam', 'Kochi', 'Cochin'],
    kochi: ['Kochi', 'Cochin', 'Ernakulam'],
    cochin: ['Cochin', 'Kochi', 'Ernakulam'],
    kozhikode: ['Kozhikode', 'Calicut'],
    calicut: ['Calicut', 'Kozhikode'],
    kollam: ['Kollam', 'Quilon'],
    quilon: ['Quilon', 'Kollam'],
    alappuzha: ['Alappuzha', 'Alleppey'],
    alleppey: ['Alleppey', 'Alappuzha'],
    palakkad: ['Palakkad', 'Palghat'],
    palghat: ['Palghat', 'Palakkad'],
    kannur: ['Kannur', 'Cannanore'],
    cannanore: ['Cannanore', 'Kannur'],

    // Karnataka
    bengaluru: ['Bengaluru', 'Bangalore', 'Bengaluru Urban', 'Bangalore Urban'],
    bangalore: ['Bangalore', 'Bengaluru', 'Bangalore Urban', 'Bengaluru Urban'],
    mysuru: ['Mysuru', 'Mysore'],
    mysore: ['Mysore', 'Mysuru'],
    mangaluru: ['Mangaluru', 'Mangalore'],
    mangalore: ['Mangalore', 'Mangaluru'],

    // Tamil Nadu
    chennai: ['Chennai', 'Madras'],
    madras: ['Madras', 'Chennai'],
    tiruchirappalli: ['Tiruchirappalli', 'Trichy', 'Tiruchirapalli'],
    trichy: ['Trichy', 'Tiruchirappalli', 'Tiruchirapalli'],
    thoothukudi: ['Thoothukudi', 'Tuticorin'],
    tuticorin: ['Tuticorin', 'Thoothukudi'],

    // Maharashtra
    mumbai: ['Mumbai', 'Bombay', 'Mumbai Suburban', 'Mumbai City'],
    bombay: ['Bombay', 'Mumbai', 'Mumbai Suburban'],
    pune: ['Pune', 'Poona'],

    // Telangana / Andhra
    hyderabad: ['Hyderabad', 'Secunderabad'],
    vijayawada: ['Vijayawada', 'Bezwada'],
    visakhapatnam: ['Visakhapatnam', 'Vizag'],
    vizag: ['Vizag', 'Visakhapatnam'],

    // West Bengal
    kolkata: ['Kolkata', 'Calcutta'],
    calcutta: ['Calcutta', 'Kolkata'],

    // Odisha
    odisha: ['Odisha', 'Orissa'],
    orissa: ['Orissa', 'Odisha'],
};

/** Return every known alias for a place name (case-insensitive lookup). */
function expandPlaceAliases(name?: string): string[] {
    if (!name) return [];
    const cleaned = String(name).trim();
    if (!cleaned) return [];
    const aliases = DISTRICT_ALIASES[cleaned.toLowerCase()];
    if (aliases && aliases.length > 0) {
        // Make sure the original spelling is included.
        const set = new Set(aliases.map((a) => a.trim()).filter(Boolean));
        set.add(cleaned);
        return Array.from(set);
    }
    return [cleaned];
}

@Injectable()
export class BusinessService {
    private readonly logger = new Logger(BusinessService.name);

    constructor(
        private prisma: PrismaService,
        private locationResolver: LocationResolverService,
    ) {}

    /**
     * Build the SQL fragment that tests whether ANY value inside the
     * `serviceAreaValues` text[] column matches one of the alias variants we
     * computed for the searcher's location. Uses explicit per-variant equality
     * (joined with OR via Prisma.join) instead of relying on `ANY($1::text[])`
     * with a JS-array parameter — Prisma's raw-query parameter binder is
     * unreliable with native text[] interpolation, which silently produced
     * zero matches in the old code.
     */
    private buildServiceAreaMatch(
        areaType: 'STATE' | 'DISTRICT' | 'PINCODE',
        variants: string[],
    ): Prisma.Sql | typeof Prisma.empty {
        if (!variants.length) return Prisma.empty;
        const equality = variants.map(
            (v) => Prisma.sql`LOWER(btrim(saev)) = ${v.toLowerCase()}`,
        );
        return Prisma.sql`OR (b."serviceAreaType" = ${areaType} AND EXISTS (
            SELECT 1 FROM unnest(b."serviceAreaValues") saev
            WHERE ${Prisma.join(equality, ' OR ')}
        ))`;
    }

    async createProfile(userId: string, tenantId: string, data: any) {
        const { services, slots, pincode, city, expertise, description, images, ...rest } = data;

        const existing = await this.prisma.businessProfile.findFirst({
            where: {
                businessName: {
                    equals: rest.businessName,
                    mode: 'insensitive'
                }
            }
        });
        if (existing) {
            throw new ConflictException('Business name already exists. Please choose a unique name.');
        }

        const normalizedServiceAreaType = String(rest.serviceAreaType || 'RADIUS').trim().toUpperCase();
        const normalizedServiceAreaValues = (rest.serviceAreaValues || [])
            .map((v: any) => String(v).trim())
            .filter((v: string) => v.length > 0);

        this.validateServiceArea(normalizedServiceAreaType, normalizedServiceAreaValues);
        
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
            serviceAreaType: normalizedServiceAreaType,
            serviceAreaValues: normalizedServiceAreaValues,
            serviceRadiusKm: rest.serviceRadiusKm,
            hashtags: rest.hashtags,
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
                },
                slots: slots ? {
                    create: slots.map((s: any) => ({
                        name: s.name,
                        description: s.description || null,
                        maxPersons: s.maxPersons || 1,
                        timeSlots: s.timeSlots || [],
                        scheduleType: s.scheduleType || 'WEEKLY',
                        scheduleConfig: s.scheduleConfig ? (typeof s.scheduleConfig === 'string' ? s.scheduleConfig : JSON.stringify(s.scheduleConfig)) : null,
                        allowRecurringBookings: s.allowRecurringBookings || false,
                        advanceBookingWeeks: this.clampAdvanceWeeks(s.advanceBookingWeeks),
                    })),
                } : undefined,
            },
            include: { services: true, slots: true },
        });
    }

    private validateServiceArea(serviceAreaType?: string, serviceAreaValues?: string[]) {
        const type = serviceAreaType || 'RADIUS';
        const values = serviceAreaValues || [];
        if (type === 'PINCODE' && values.length === 0) {
            throw new BadRequestException('Add at least one pincode for your service area.');
        }
        if (type === 'DISTRICT' && values.length === 0) {
            throw new BadRequestException('Add at least one district for your service area.');
        }
        if (type === 'STATE' && values.length === 0) {
            throw new BadRequestException('Select a state for your service area.');
        }
    }

    private buildTextSearchFilter(query?: string): Prisma.BusinessProfileWhereInput | undefined {
        if (!query?.trim()) return undefined;
        const q = query.trim();
        return {
            OR: [
                { businessName: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
                { hashtags: { contains: q, mode: 'insensitive' } },
                { about: { contains: q, mode: 'insensitive' } },
                { services: { some: { name: { contains: q, mode: 'insensitive' } } } },
                { services: { some: { description: { contains: q, mode: 'insensitive' } } } },
            ],
        };
    }

    private buildLocationReachFilter(params: {
        pincode?: string;
        district?: string;
        state?: string;
        lat?: number;
        lng?: number;
        radius?: number;
    }): Prisma.BusinessProfileWhereInput | undefined {
        const { pincode, district, state, lat, lng, radius } = params;
        const tPincode = pincode ? String(pincode).trim() : undefined;
        const tDistrict = district ? String(district).trim() : undefined;
        const tState = state ? String(state).trim() : undefined;

        const hasAdminFilter = !!(tPincode || tDistrict || tState);
        const hasGeoFilter = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

        if (!hasAdminFilter && !hasGeoFilter) {
            return undefined;
        }

        const reachOr: Prisma.BusinessProfileWhereInput[] = [
            { serviceAreaType: 'PAN_INDIA' },
        ];

        // Expand to every known alias so a searcher who reports
        // "Thiruvananthapuram" still matches a profile that listed "Trivandrum".
        //
        // `serviceAreaValues: { has: x }` is an exact-array-element match, so
        // we add one OR clause per alias for each scope. We deliberately keep
        // exact-case here because business-profile creation normalises stored
        // values via `.trim()`. Case-insensitive matching is reserved for the
        // hasGeo branch (raw SQL with LOWER(btrim(...))).
        if (tState) {
            const stateAliases = expandPlaceAliases(tState);
            stateAliases.forEach((s) => {
                reachOr.push({ serviceAreaType: 'STATE', serviceAreaValues: { has: s } });
            });
        }
        if (tDistrict) {
            const districtAliases = expandPlaceAliases(tDistrict);
            districtAliases.forEach((d) => {
                reachOr.push({ serviceAreaType: 'DISTRICT', serviceAreaValues: { has: d } });
            });
        }
        if (tPincode) {
            reachOr.push({ serviceAreaType: 'PINCODE', serviceAreaValues: { has: tPincode } });
            reachOr.push({ location: { contains: tPincode, mode: 'insensitive' } });
        }

        return { OR: reachOr };
    }

    async listProfiles(params: {
        category?: string;
        pincode?: string;
        district?: string;
        state?: string;
        tenantId?: string;
        lat?: number;
        lng?: number;
        radius?: number;
        query?: string;
        limit?: number;
        offset?: number;
    }) {
        const { category, tenantId, query } = params;
        let { pincode, district, state, lat, lng, radius } = params;
        const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
        const offset = Math.max(params.offset ?? 0, 0);

        // PINCODE → DISTRICT / STATE hydration.
        // If the caller supplied a pincode but no district/state (e.g. picked
        // a pincode from the map dropdown, where the suggestion record didn't
        // carry administrative context), resolve it from location_master so a
        // business that registered "Kollam" as a DISTRICT service area is
        // still matched when someone searches with a Kollam pincode.
        if (pincode && (!district || !state)) {
            const resolved = await this.locationResolver.resolvePincode(pincode);
            if (resolved) {
                if (!district && resolved.district) district = resolved.district;
                if (!state && resolved.state) state = resolved.state;
                if ((lat == null || lng == null) && resolved.latitude != null && resolved.longitude != null) {
                    lat = resolved.latitude;
                    lng = resolved.longitude;
                }
            }
        }

        const hasGeo = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
        const hasAdmin = !!(pincode || district || state);
        const hasLocationContext = hasGeo || hasAdmin;
        const searchRadiusKm = radius && radius > 0 ? radius : 10;

        const textFilter = this.buildTextSearchFilter(query);
        const locationFilter = this.buildLocationReachFilter({ pincode, district, state, lat, lng, radius });

        const baseWhere: Prisma.BusinessProfileWhereInput = {
            isActive: true,
            ...(tenantId ? { tenantId } : {}),
            ...(category ? { category: { contains: category, mode: 'insensitive' } } : {}),
            ...(textFilter ? textFilter : {}),
        };

        // Strict visibility: when the caller has not supplied ANY location
        // context (no pincode/district/state and no lat/lng), only providers
        // who explicitly opted into nationwide visibility (PAN_INDIA) should
        // appear. This prevents a profile created for a single district
        // (e.g. Ernakulam) from being visible to users in other districts
        // who haven't told us where they are.
        if (!hasLocationContext) {
            baseWhere.serviceAreaType = 'PAN_INDIA';
        }

        if (hasGeo) {
            const queryPattern = query?.trim() ? `%${query.trim()}%` : null;
            const categoryPattern = category ? `%${category}%` : null;

            // Alias-expanded variants. We pass these to the matcher as discrete
            // string parameters (not as a single text[] param), because Prisma's
            // raw-query parameter binder does not reliably project a JS array
            // into a Postgres text[] — the previous `ANY(${arr}::text[])` form
            // silently produced zero matches for stored districts like
            // ['Kollam','Ernakulam'].
            const stateVariants = state ? expandPlaceAliases(state) : [];
            const districtVariants = district ? expandPlaceAliases(district) : [];
            const pincodeVariants = pincode ? [String(pincode).trim()] : [];

            const stateMatchSql = this.buildServiceAreaMatch('STATE', stateVariants);
            const districtMatchSql = this.buildServiceAreaMatch('DISTRICT', districtVariants);
            const pincodeMatchSql = this.buildServiceAreaMatch('PINCODE', pincodeVariants);

            this.logger.debug(
                `listProfiles[geo] lat=${lat} lng=${lng} radius=${searchRadiusKm}km ` +
                `category=${category ?? '-'} query=${query ?? '-'} ` +
                `state=${state ?? '-'} district=${district ?? '-'} pincode=${pincode ?? '-'} ` +
                `stateVariants=${JSON.stringify(stateVariants)} ` +
                `districtVariants=${JSON.stringify(districtVariants)} ` +
                `pincodeVariants=${JSON.stringify(pincodeVariants)}`,
            );

            try {
            const rows = await this.prisma.$queryRaw<{ id: string; distance_km: number | null; has_slots: boolean }[]>`
                WITH matched AS (
                    SELECT
                        b.id,
                        b."isVerified",
                        CASE
                            WHEN b.latitude IS NOT NULL AND b.longitude IS NOT NULL THEN
                                ST_Distance(
                                    ST_SetSRID(ST_MakePoint(b.longitude, b.latitude), 4326)::geography,
                                    ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography
                                ) / 1000.0
                            ELSE NULL
                        END AS distance_km,
                        EXISTS (
                            SELECT 1 FROM business_slots s
                            WHERE s."businessProfileId" = b.id AND s."isActive" = true
                        ) AS has_slots,
                        b."createdAt"
                    FROM business_profiles b
                    WHERE b."isActive" = true
                    ${tenantId ? Prisma.sql`AND b."tenantId" = ${tenantId}` : Prisma.empty}
                    ${categoryPattern ? Prisma.sql`AND b.category ILIKE ${categoryPattern}` : Prisma.empty}
                    ${queryPattern ? Prisma.sql`AND (
                        b.category ILIKE ${queryPattern}
                        OR b."businessName" ILIKE ${queryPattern}
                        OR b.hashtags ILIKE ${queryPattern}
                        OR b.about ILIKE ${queryPattern}
                        OR EXISTS (
                            SELECT 1 FROM business_services sv
                            WHERE sv."businessProfileId" = b.id
                            AND (sv.name ILIKE ${queryPattern} OR sv.description ILIKE ${queryPattern})
                        )
                    )` : Prisma.empty}
                    AND (
                        b."serviceAreaType" = 'PAN_INDIA'
                        ${stateMatchSql}
                        ${districtMatchSql}
                        ${pincodeMatchSql}
                        ${pincode ? Prisma.sql`OR (b.location ILIKE ${'%' + pincode + '%'})` : Prisma.empty}
                        OR (
                            b.latitude IS NOT NULL AND b.longitude IS NOT NULL
                            AND b."serviceRadiusKm" IS NOT NULL
                            AND ST_DWithin(
                                ST_SetSRID(ST_MakePoint(b.longitude, b.latitude), 4326)::geography,
                                ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography,
                                b."serviceRadiusKm" * 1000
                            )
                        )
                        OR (
                            b.latitude IS NOT NULL AND b.longitude IS NOT NULL
                            AND ST_DWithin(
                                ST_SetSRID(ST_MakePoint(b.longitude, b.latitude), 4326)::geography,
                                ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography,
                                ${searchRadiusKm} * 1000
                            )
                        )
                    )
                )
                SELECT id, distance_km, has_slots
                FROM matched
                ORDER BY "isVerified" DESC, has_slots DESC, distance_km ASC NULLS LAST, "createdAt" DESC
                LIMIT ${limit} OFFSET ${offset}
            `;

            this.logger.debug(`listProfiles[geo] matched ${rows.length} row(s)`);

            const ids = rows.map((r) => r.id);
            if (ids.length === 0) {
                return { items: [], total: 0, hasMore: false };
            }

            const distanceMap = new Map(rows.map((r) => [r.id, r.distance_km]));
            const profiles = await this.prisma.businessProfile.findMany({
                where: { id: { in: ids } },
                include: { services: true, slots: { where: { isActive: true } } },
            });

            const ordered = ids
                .map((id) => profiles.find((p) => p.id === id))
                .filter(Boolean)
                .map((p) => ({
                    ...p!,
                    distanceKm: distanceMap.get(p!.id) ?? null,
                }));

            const totalResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(DISTINCT b.id)::bigint AS count
                FROM business_profiles b
                WHERE b."isActive" = true
                ${tenantId ? Prisma.sql`AND b."tenantId" = ${tenantId}` : Prisma.empty}
                ${categoryPattern ? Prisma.sql`AND b.category ILIKE ${categoryPattern}` : Prisma.empty}
                ${queryPattern ? Prisma.sql`AND (
                    b.category ILIKE ${queryPattern}
                    OR b."businessName" ILIKE ${queryPattern}
                    OR b.hashtags ILIKE ${queryPattern}
                    OR b.about ILIKE ${queryPattern}
                    OR EXISTS (
                        SELECT 1 FROM business_services sv
                        WHERE sv."businessProfileId" = b.id
                        AND (sv.name ILIKE ${queryPattern} OR sv.description ILIKE ${queryPattern})
                    )
                )` : Prisma.empty}
                AND (
                    b."serviceAreaType" = 'PAN_INDIA'
                    ${stateMatchSql}
                    ${districtMatchSql}
                    ${pincodeMatchSql}
                    ${pincode ? Prisma.sql`OR (b.location ILIKE ${'%' + pincode + '%'})` : Prisma.empty}
                    OR (
                        b.latitude IS NOT NULL AND b.longitude IS NOT NULL
                        AND b."serviceRadiusKm" IS NOT NULL
                        AND ST_DWithin(
                            ST_SetSRID(ST_MakePoint(b.longitude, b.latitude), 4326)::geography,
                            ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography,
                            b."serviceRadiusKm" * 1000
                        )
                    )
                    OR (
                        b.latitude IS NOT NULL AND b.longitude IS NOT NULL
                        AND ST_DWithin(
                            ST_SetSRID(ST_MakePoint(b.longitude, b.latitude), 4326)::geography,
                            ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography,
                            ${searchRadiusKm} * 1000
                        )
                    )
                )
            `;

            const total = Number(totalResult[0]?.count ?? 0);
            return { items: ordered, total, hasMore: offset + ordered.length < total };
            } catch (geoErr: any) {
                this.logger.warn(
                    `listProfiles[geo] PostGIS query failed (${geoErr?.message ?? geoErr}); ` +
                    'falling back to district/state/pincode matching via Prisma.',
                );
            }
        }

        const where: Prisma.BusinessProfileWhereInput = {
            ...baseWhere,
            ...(locationFilter ? locationFilter : {}),
        };

        const [profiles, total] = await Promise.all([
            this.prisma.businessProfile.findMany({
                where,
                include: {
                    services: true,
                    slots: { where: { isActive: true } },
                },
                orderBy: [
                    { isVerified: 'desc' },
                    { createdAt: 'desc' },
                ],
                take: limit,
                skip: offset,
            }),
            this.prisma.businessProfile.count({ where }),
        ]);

        const items = profiles.map((p) => ({
            ...p,
            distanceKm: null as number | null,
        }));

        return { items, total, hasMore: offset + items.length < total };
    }

    async suggest(query: string, limit = 10) {
        if (!query || query.trim().length < 2) {
            return { categories: [], profiles: [], services: [] };
        }

        const q = query.trim();
        const take = Math.min(Math.max(limit, 1), 20);

        const [profiles, serviceItems, categoryRows] = await Promise.all([
            this.prisma.businessProfile.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { businessName: { contains: q, mode: 'insensitive' } },
                        { category: { contains: q, mode: 'insensitive' } },
                    ],
                },
                select: { id: true, businessName: true, category: true },
                take,
                orderBy: { businessName: 'asc' },
            }),
            this.prisma.serviceItem.findMany({
                where: {
                    name: { contains: q, mode: 'insensitive' },
                    businessProfile: { isActive: true },
                },
                select: {
                    id: true,
                    name: true,
                    businessProfileId: true,
                    businessProfile: { select: { businessName: true } },
                },
                take,
            }),
            this.prisma.businessProfile.findMany({
                where: { isActive: true, category: { contains: q, mode: 'insensitive' } },
                select: { category: true },
                take: 50,
            }),
        ]);

        const categories = Array.from(
            new Set(
                categoryRows
                    .flatMap((r) => (r.category || '').split(',').map((c) => c.trim()))
                    .filter((c) => c.toLowerCase().includes(q.toLowerCase()))
            )
        ).slice(0, take);

        return {
            categories,
            profiles: profiles.map((p) => ({
                type: 'profile' as const,
                id: p.id,
                name: p.businessName,
                category: p.category,
            })),
            services: serviceItems.map((s) => ({
                type: 'service' as const,
                id: s.id,
                name: s.name,
                profileId: s.businessProfileId,
                businessName: s.businessProfile.businessName,
            })),
        };
    }

    async getProfilesByUserId(userId: string) {
        const profiles = await this.prisma.businessProfile.findMany({
            where: { userId },
            include: { services: true, slots: true },
            orderBy: { createdAt: 'desc' }
        });
        return profiles.map(profile => ({
            ...profile,
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=resido://business/book?profileId=${profile.id}`
        }));
    }

    async getProfile(id: string) {
        const profile = await this.prisma.businessProfile.findUnique({
            where: { id },
            include: { services: true, slots: true }
        });
        if (!profile) return null;
        return {
            ...profile,
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=resido://business/book?profileId=${profile.id}`
        };
    }

    /**
     * Increments the public view counter for a business profile. Owners
     * viewing their own profile are skipped so the metric reflects genuine
     * customer interest. Errors are swallowed to avoid breaking the
     * customer-facing screen if the increment fails.
     */
    async trackProfileView(profileId: string, viewerId?: string) {
        if (!profileId) return { ok: false };
        try {
            const profile = await this.prisma.businessProfile.findUnique({
                where: { id: profileId },
                select: { id: true, userId: true },
            });
            if (!profile) return { ok: false };
            if (viewerId && profile.userId === viewerId) {
                return { ok: true, skipped: true };
            }
            const updated = await this.prisma.businessProfile.update({
                where: { id: profileId },
                data: { viewCount: { increment: 1 } },
                select: { viewCount: true },
            });
            return { ok: true, viewCount: updated.viewCount };
        } catch (err: any) {
            console.warn('[trackProfileView] failed', err?.message);
            return { ok: false };
        }
    }

    /**
     * Owner-only booking report. Returns the bookings that fall within the
     * inclusive `[from, to]` date window (YYYY-MM-DD strings) plus an
     * aggregated summary keyed by `bookingDate`. When the date range is
     * omitted we default to the trailing 30 days so the report screen
     * always has something to show on first open.
     */
    async getBookingReport(
        userId: string,
        profileId: string,
        opts: { from?: string; to?: string } = {},
    ) {
        const profile = await this.prisma.businessProfile.findFirst({
            where: { id: profileId, userId },
            select: { id: true, businessName: true, viewCount: true },
        });
        if (!profile) {
            throw new NotFoundException('Business profile not found or you are not the owner');
        }

        const today = new Date();
        const defaultFrom = new Date(today);
        defaultFrom.setDate(today.getDate() - 29);

        const from = (opts.from && opts.from.trim()) || defaultFrom.toISOString().split('T')[0];
        const to   = (opts.to   && opts.to.trim())   || today.toISOString().split('T')[0];

        const bookings = await this.prisma.businessBooking.findMany({
            where: {
                businessProfileId: profileId,
                bookingDate: { gte: from, lte: to },
            },
            include: {
                slot: { select: { id: true, name: true } },
                updates: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: [
                { bookingDate: 'desc' },
                { tokenNumber: 'asc' },
            ],
        });

        const confirmed = bookings.filter(b => b.status === 'CONFIRMED');
        const cancelled = bookings.filter(b => b.status === 'CANCELLED');

        const byDate: Record<string, { date: string; confirmed: number; cancelled: number; persons: number }> = {};
        for (const b of bookings) {
            const key = b.bookingDate;
            if (!byDate[key]) byDate[key] = { date: key, confirmed: 0, cancelled: 0, persons: 0 };
            if (b.status === 'CONFIRMED') {
                byDate[key].confirmed += 1;
                byDate[key].persons += (b.persons || 0);
            } else if (b.status === 'CANCELLED') {
                byDate[key].cancelled += 1;
            }
        }

        return {
            profile,
            range: { from, to },
            summary: {
                totalBookings: bookings.length,
                confirmedBookings: confirmed.length,
                cancelledBookings: cancelled.length,
                totalGuests: confirmed.reduce((sum, b) => sum + (b.persons || 0), 0),
            },
            byDate: Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)),
            bookings,
        };
    }

    async updateProfile(id: string, data: any) {
        const { services, slots, pincode, city, expertise, description, images, ...rest } = data;

        const normalizedServiceAreaType =
            rest.serviceAreaType !== undefined
                ? String(rest.serviceAreaType || 'RADIUS').trim().toUpperCase()
                : undefined;

        const normalizedServiceAreaValues =
            rest.serviceAreaValues !== undefined
                ? (rest.serviceAreaValues || [])
                    .map((v: any) => String(v).trim())
                    .filter((v: string) => v.length > 0)
                : undefined;

        if (normalizedServiceAreaType !== undefined) {
            this.validateServiceArea(normalizedServiceAreaType, normalizedServiceAreaValues ?? []);
        }
        
        if (rest.businessName) {
            const existing = await this.prisma.businessProfile.findFirst({
                where: {
                    businessName: {
                        equals: rest.businessName,
                        mode: 'insensitive'
                    },
                    id: {
                        not: id
                    }
                }
            });
            if (existing) {
                throw new ConflictException('Business name already exists. Please choose a unique name.');
            }
        }
        
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
            serviceAreaType: normalizedServiceAreaType,
            serviceAreaValues: normalizedServiceAreaValues,
            serviceRadiusKm: rest.serviceRadiusKm,
            hashtags: rest.hashtags,
        };

        // Remove undefined fields to prevent overwriting with null/undefined unless intended
        Object.keys(profileData).forEach(key => (profileData as any)[key] === undefined && delete (profileData as any)[key]);

        const updateData: any = {
            ...profileData
        };

        if (services) {
            await this.prisma.serviceItem.deleteMany({ where: { businessProfileId: id } });
            updateData.services = {
                create: services.map((s: any) => ({
                    name: s.name,
                    description: s.description,
                    pricingType: s.pricingType,
                    price: typeof s.price === 'number' ? s.price : parseFloat(s.price?.toString().replace(/,/g, '') || '0'),
                    responseTime: s.responseTime,
                    isEmergency: s.isEmergency || false
                }))
            };
        }

        if (slots) {
            await this.prisma.businessSlot.deleteMany({ where: { businessProfileId: id } });
            updateData.slots = {
                create: slots.map((s: any) => ({
                    name: s.name,
                    description: s.description || null,
                    maxPersons: s.maxPersons || 1,
                    timeSlots: s.timeSlots || [],
                    scheduleType: s.scheduleType || 'WEEKLY',
                    scheduleConfig: s.scheduleConfig ? (typeof s.scheduleConfig === 'string' ? s.scheduleConfig : JSON.stringify(s.scheduleConfig)) : null,
                    allowRecurringBookings: s.allowRecurringBookings || false,
                    advanceBookingWeeks: this.clampAdvanceWeeks(s.advanceBookingWeeks),
                })),
            };
        }

        return this.prisma.businessProfile.update({
            where: { id },
            data: updateData,
            include: { services: true, slots: true }
        });
    }

    async deleteProfile(userId: string, profileId: string) {
        const profile = await this.prisma.businessProfile.findFirst({
            where: { id: profileId, userId }
        });
        if (!profile) {
            throw new NotFoundException('Business profile not found or you are not authorized to delete it.');
        }

        // Cascade delete: bookings -> slots -> services -> profile
        // (schema has no onDelete: Cascade, so we do it explicitly in a transaction)
        return this.prisma.$transaction(async (tx) => {
            const slots = await tx.businessSlot.findMany({
                where: { businessProfileId: profileId },
                select: { id: true }
            });
            const slotIds = slots.map(s => s.id);

            if (slotIds.length > 0) {
                await tx.businessBooking.deleteMany({ where: { slotId: { in: slotIds } } });
            }
            await tx.businessSlot.deleteMany({ where: { businessProfileId: profileId } });
            await tx.serviceItem.deleteMany({ where: { businessProfileId: profileId } });
            await tx.businessProfile.delete({ where: { id: profileId } });

            return { success: true, id: profileId };
        });
    }

    async getCategories() {
        const profiles = await this.prisma.businessProfile.findMany({
            select: { category: true },
            where: { isActive: true }
        });
        const categories = Array.from(new Set(profiles.map(p => p.category as string).filter(Boolean)));
        return categories.sort((a, b) => a.localeCompare(b));
    }

    // ─── Business Slot & Booking Logic (Mirroring Amenities) ──────────────────

    async createSlot(userId: string, profileId: string, data: any) {
        const profile = await this.prisma.businessProfile.findFirst({
            where: { id: profileId, userId }
        });
        if (!profile) throw new Error('Unauthorized or Business Profile not found');

        return this.prisma.businessSlot.create({
            data: {
                businessProfileId: profileId,
                name: data.name,
                description: data.description || null,
                maxPersons: data.maxPersons || 1,
                timeSlots: data.timeSlots || [],
                availableDates: data.availableDates || [],
                scheduleType: data.scheduleType || 'CUSTOM',
                scheduleConfig: data.scheduleConfig ? JSON.stringify(data.scheduleConfig) : null,
                allowRecurringBookings: data.allowRecurringBookings || false,
                advanceBookingWeeks: this.clampAdvanceWeeks(data.advanceBookingWeeks),
            },
        });
    }

    /**
     * Clamps the advance-booking window so we never persist nonsense like
     * `0` weeks (which would hide every date from customers) or a year-long
     * window (which would balloon the date strip). Falls back to the
     * schema default of 4 weeks when the value is missing or invalid.
     */
    private clampAdvanceWeeks(raw: any): number {
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) return 4;
        return Math.min(Math.max(Math.round(n), 1), 52);
    }

    async updateSlot(userId: string, profileId: string, slotId: string, data: any) {
        const profile = await this.prisma.businessProfile.findFirst({
            where: { id: profileId, userId }
        });
        if (!profile) throw new Error('Unauthorized or Business Profile not found');

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.maxPersons !== undefined) updateData.maxPersons = data.maxPersons;
        if (data.timeSlots !== undefined) updateData.timeSlots = data.timeSlots;
        if (data.availableDates !== undefined) updateData.availableDates = data.availableDates;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.scheduleType !== undefined) updateData.scheduleType = data.scheduleType;
        if (data.scheduleConfig !== undefined) updateData.scheduleConfig = data.scheduleConfig ? JSON.stringify(data.scheduleConfig) : null;
        if (data.allowRecurringBookings !== undefined) updateData.allowRecurringBookings = data.allowRecurringBookings;
        if (data.advanceBookingWeeks !== undefined) {
            updateData.advanceBookingWeeks = this.clampAdvanceWeeks(data.advanceBookingWeeks);
        }

        return this.prisma.businessSlot.update({
            where: { id: slotId },
            data: updateData,
        });
    }

    async deleteSlot(userId: string, profileId: string, slotId: string) {
        const profile = await this.prisma.businessProfile.findFirst({
            where: { id: profileId, userId }
        });
        if (!profile) throw new Error('Unauthorized or Business Profile not found');

        return this.prisma.businessSlot.delete({
            where: { id: slotId }
        });
    }

    async getSlots(profileId: string, date?: string) {
        const slots = await this.prisma.businessSlot.findMany({
            where: { businessProfileId: profileId, isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        return Promise.all(slots.map(s => this.getSlotById(profileId, s.id, date)));
    }

    async getSlotById(profileId: string, id: string, date?: string) {
        const slot = await this.prisma.businessSlot.findFirst({
            where: { id, businessProfileId: profileId }
        });
        if (!slot) throw new NotFoundException('Business Slot not found');

        let resolvedSlots = slot.timeSlots;
        let resolvedDates = slot.availableDates;

        if (slot.scheduleType && slot.scheduleConfig) {
            try {
                const config = JSON.parse(slot.scheduleConfig);
                const today = new Date();
                const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                if (slot.scheduleType === 'WEEKLY') {
                    const dates: string[] = [];
                    for (let i = 0; i < 90; i++) {
                        const d = new Date(today);
                        d.setDate(today.getDate() + i);
                        const dateStr = d.toISOString().split('T')[0];
                        const dayName = weekdays[d.getDay()];
                        if (config[dayName] && config[dayName].length > 0) {
                            dates.push(dateStr);
                        }
                    }
                    resolvedDates = dates;

                    if (date) {
                        const d = new Date(date);
                        const dayName = weekdays[d.getDay()];
                        resolvedSlots = config[dayName] || [];
                    } else {
                        const allSlots = new Set<string>();
                        Object.values(config).forEach((slots: any) => {
                            if (Array.isArray(slots)) slots.forEach(s => allSlots.add(s));
                        });
                        resolvedSlots = Array.from(allSlots);
                    }
                } 
                else if (slot.scheduleType === 'MONTHLY') {
                    const dates: string[] = [];
                    const allowedDays = config.daysOfMonth || [];
                    for (let i = 0; i < 90; i++) {
                        const d = new Date(today);
                        d.setDate(today.getDate() + i);
                        const dateStr = d.toISOString().split('T')[0];
                        if (allowedDays.includes(d.getDate())) {
                            dates.push(dateStr);
                        }
                    }
                    resolvedDates = dates;

                    if (date) {
                        const d = new Date(date);
                        if (allowedDays.includes(d.getDate())) {
                            resolvedSlots = config.slots || [];
                        } else {
                            resolvedSlots = [];
                        }
                    } else {
                        resolvedSlots = config.slots || [];
                    }
                } 
                else if (slot.scheduleType === 'CUSTOM') {
                    resolvedDates = Object.keys(config.dates || {});
                    if (date) {
                        resolvedSlots = config.dates?.[date] || [];
                    } else {
                        const allSlots = new Set<string>();
                        Object.values(config.dates || {}).forEach((slots: any) => {
                            if (Array.isArray(slots)) slots.forEach(s => allSlots.add(s));
                        });
                        resolvedSlots = Array.from(allSlots);
                    }
                }
            } catch (err) {
                console.error('Failed to parse scheduleConfig:', err);
            }
        }

        // For the customer-facing booking UI we need per-time-slot
        // availability so the client can blur out fully-booked intervals
        // and show "this slot is full" on tap. We only compute this when a
        // specific date is requested — listing all slots without a date
        // would otherwise scan every confirmed booking for every interval.
        let timeSlotAvailability: Record<string, { booked: number; capacity: number; full: boolean }> = {};
        if (date && Array.isArray(resolvedSlots) && resolvedSlots.length > 0) {
            try {
                const bookings = await this.prisma.businessBooking.findMany({
                    where: {
                        businessProfileId: profileId,
                        slotId: slot.id,
                        bookingDate: date,
                        status: 'CONFIRMED',
                    },
                    select: { timeSlot: true, persons: true },
                });
                const capacity = slot.maxPersons || 1;
                const totalsByInterval: Record<string, number> = {};
                for (const b of bookings) {
                    const key = (b.timeSlot || '').trim();
                    if (!key) continue;
                    totalsByInterval[key] = (totalsByInterval[key] || 0) + (b.persons || 0);
                }
                for (const interval of resolvedSlots) {
                    const key = (interval || '').trim();
                    if (!key) continue;
                    const booked = totalsByInterval[key] || 0;
                    timeSlotAvailability[key] = {
                        booked,
                        capacity,
                        full: booked >= capacity,
                    };
                }
            } catch (err) {
                // Non-fatal — fall back to no-availability metadata.
                console.warn('[getSlotById] failed to compute timeSlotAvailability:', (err as any)?.message);
            }
        }

        return {
            ...slot,
            timeSlots: resolvedSlots,
            availableDates: resolvedDates,
            timeSlotAvailability,
        };
    }

    async createBooking(userId: string, profileId: string, slotId: string, data: any) {
        if (!userId) {
            throw new BadRequestException('Authentication required to book a slot.');
        }

        const bookingDate = (data.bookingDate || data.date || '').toString().trim();
        const timeSlot = (data.timeSlot || '').toString().trim();
        if (!bookingDate) {
            throw new BadRequestException('bookingDate is required (YYYY-MM-DD).');
        }
        if (!timeSlot) {
            throw new BadRequestException('timeSlot is required.');
        }

        const slot = await this.getSlotById(profileId, slotId, bookingDate);
        // Customers book one reservation per time slot (1 person). Capacity
        // (maxPersons) is how many separate bookings that interval accepts.
        const requestedPersons = 1;
        const isRecurring = data.isRecurring || false;
        const recurringPeriod = data.recurringPeriod || null;

        const performSingleBooking = async (dateStr: string, slotTime: string, parentBookingId?: string) => {
            // Wrap capacity check + token assignment + create in a single
            // transaction so we never assign duplicate token numbers when
            // two customers tap "Reserve" at the same time.
            return this.prisma.$transaction(async (tx) => {
                const existingBookings = await tx.businessBooking.findMany({
                    where: {
                        businessProfileId: profileId,
                        slotId,
                        bookingDate: dateStr,
                        timeSlot: slotTime,
                        status: 'CONFIRMED',
                    },
                });

                const totalBookedPersons = existingBookings.reduce((sum, b) => sum + b.persons, 0);
                if (totalBookedPersons + requestedPersons > slot.maxPersons) {
                    throw new BadRequestException(
                        `This time slot is fully booked. Please choose another time.`,
                    );
                }

                // Next token for this business profile on this calendar day.
                // Confirmed bookings only — cancelled ones still own their old
                // token so the sequence stays gap-free per customer.
                const maxToken = await tx.businessBooking.aggregate({
                    _max: { tokenNumber: true },
                    where: {
                        businessProfileId: profileId,
                        bookingDate: dateStr,
                    },
                });
                const nextToken = (maxToken._max.tokenNumber ?? 0) + 1;

                return tx.businessBooking.create({
                    data: {
                        businessProfileId: profileId,
                        slotId,
                        userId,
                        userName: data.userName || null,
                        userPhone: data.userPhone || null,
                        bookingDate: dateStr,
                        timeSlot: slotTime,
                        persons: requestedPersons,
                        status: 'CONFIRMED',
                        notes: data.notes || null,
                        tokenNumber: nextToken,
                        isRecurring,
                        recurringPeriod,
                        parentBookingId,
                    },
                });
            });
        };

        const primaryBooking = await performSingleBooking(bookingDate, timeSlot);

        if (isRecurring && recurringPeriod) {
            let currentDate = new Date(bookingDate);
            for (let i = 1; i <= 3; i++) {
                if (recurringPeriod === 'WEEKLY') {
                    currentDate.setDate(currentDate.getDate() + 7);
                } else if (recurringPeriod === 'MONTHLY') {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }
                const nextDateStr = currentDate.toISOString().split('T')[0];
                try {
                    await performSingleBooking(nextDateStr, timeSlot, primaryBooking.id);
                } catch (e: any) {
                    console.warn(`Could not schedule recurring occurrence ${i} on ${nextDateStr}:`, e.message);
                }
            }
        }

        return primaryBooking;
    }

    async getSlotBookings(profileId: string, slotId: string, date: string) {
        return this.prisma.businessBooking.findMany({
            where: {
                businessProfileId: profileId,
                slotId,
                bookingDate: date,
                status: 'CONFIRMED'
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getMyBookings(userId: string) {
        return this.prisma.businessBooking.findMany({
            where: { userId },
            include: {
                slot: {
                    include: {
                        businessProfile: true,
                    },
                },
                updates: {
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getProfileBookings(userId: string, profileId: string) {
        // Verify owner
        const profile = await this.prisma.businessProfile.findFirst({
            where: { id: profileId, userId }
        });
        if (!profile) throw new Error('Unauthorized or Business Profile not found');

        return this.prisma.businessBooking.findMany({
            where: { businessProfileId: profileId },
            include: {
                slot: true,
                updates: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: [
                { bookingDate: 'desc' },
                { tokenNumber: 'asc' },
                { createdAt: 'desc' },
            ],
        });
    }

    // ─── Booking Updates ──────────────────────────────────────────────────────

    /**
     * Business owner posts an update (text and/or photo) on a customer
     * booking. The customer will see these inside My Bookings.
     */
    async addBookingUpdate(
        userId: string,
        bookingId: string,
        data: { message?: string; photoUrl?: string },
    ) {
        const booking = await this.prisma.businessBooking.findUnique({
            where: { id: bookingId },
        });
        if (!booking) throw new NotFoundException('Booking not found');

        const profile = await this.prisma.businessProfile.findUnique({
            where: { id: booking.businessProfileId },
        });
        if (!profile || profile.userId !== userId) {
            throw new BadRequestException('Only the business owner can post updates');
        }

        const message = (data.message || '').trim();
        const photoUrl = (data.photoUrl || '').trim();
        if (!message && !photoUrl) {
            throw new BadRequestException('Provide a message or a photo to post');
        }

        return this.prisma.businessBookingUpdate.create({
            data: {
                bookingId,
                message: message || null,
                photoUrl: photoUrl || null,
                authorUserId: userId,
            },
        });
    }

    async listBookingUpdates(userId: string, bookingId: string) {
        const booking = await this.prisma.businessBooking.findUnique({
            where: { id: bookingId },
        });
        if (!booking) throw new NotFoundException('Booking not found');

        const profile = await this.prisma.businessProfile.findUnique({
            where: { id: booking.businessProfileId },
        });

        // Only the customer or the owning business may read updates.
        if (booking.userId !== userId && profile?.userId !== userId) {
            throw new BadRequestException('Not allowed to view these updates');
        }

        return this.prisma.businessBookingUpdate.findMany({
            where: { bookingId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async deleteBookingUpdate(userId: string, updateId: string) {
        const update = await this.prisma.businessBookingUpdate.findUnique({
            where: { id: updateId },
            include: { booking: true },
        });
        if (!update) throw new NotFoundException('Update not found');

        const profile = await this.prisma.businessProfile.findUnique({
            where: { id: update.booking.businessProfileId },
        });
        if (!profile || profile.userId !== userId) {
            throw new BadRequestException('Only the business owner can delete updates');
        }

        await this.prisma.businessBookingUpdate.delete({ where: { id: updateId } });
        return { success: true };
    }

    async cancelBooking(userId: string, bookingId: string) {
        const booking = await this.prisma.businessBooking.findUnique({
            where: { id: bookingId }
        });
        if (!booking) throw new NotFoundException('Booking not found');

        // Check if user is either the one who booked, or the owner of the business profile
        const profile = await this.prisma.businessProfile.findUnique({
            where: { id: booking.businessProfileId }
        });

        if (booking.userId !== userId && profile?.userId !== userId) {
            throw new Error('Unauthorized to cancel this booking');
        }

        return this.prisma.businessBooking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' }
        });
    }
}

