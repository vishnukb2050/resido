import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessService {
    constructor(private prisma: PrismaService) {}

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
                        allowRecurringBookings: s.allowRecurringBookings || false
                    }))
                } : undefined
            },
            include: { services: true, slots: true }
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
        radius?: number, // User's search radius (optional)
        query?: string // Search keyword or hashtag
    }) {
        const { category, pincode, district, state, tenantId, lat, lng, radius, query } = params;

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
            ${query ? `AND (b.category ILIKE '%${query}%' OR b."businessName" ILIKE '%${query}%' OR b.hashtags ILIKE '%${query}%')` : ''}
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

    async updateProfile(id: string, data: any) {
        const { services, slots, pincode, city, expertise, description, images, ...rest } = data;
        
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
            serviceAreaType: rest.serviceAreaType,
            serviceAreaValues: rest.serviceAreaValues,
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
                    allowRecurringBookings: s.allowRecurringBookings || false
                }))
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
            }
        });
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

        return this.prisma.businessSlot.update({
            where: { id: slotId },
            data: updateData
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

        return {
            ...slot,
            timeSlots: resolvedSlots,
            availableDates: resolvedDates,
        };
    }

    async createBooking(userId: string, profileId: string, slotId: string, data: any) {
        const slot = await this.getSlotById(profileId, slotId, data.bookingDate);
        const requestedPersons = data.persons || 1;
        const isRecurring = data.isRecurring || false;
        const recurringPeriod = data.recurringPeriod || null;

        const performSingleBooking = async (bookingDate: string, timeSlot: string, parentBookingId?: string) => {
            const existingBookings = await this.prisma.businessBooking.findMany({
                where: {
                    businessProfileId: profileId,
                    slotId,
                    bookingDate,
                    timeSlot,
                    status: 'CONFIRMED'
                }
            });

            const totalBookedPersons = existingBookings.reduce((sum, b) => sum + b.persons, 0);
            if (totalBookedPersons + requestedPersons > slot.maxPersons) {
                throw new Error(`Time slot (${timeSlot}) on ${bookingDate} is fully booked. Only ${slot.maxPersons - totalBookedPersons} slot(s) left.`);
            }

            return this.prisma.businessBooking.create({
                data: {
                    businessProfileId: profileId,
                    slotId,
                    userId,
                    userName: data.userName || null,
                    userPhone: data.userPhone || null,
                    bookingDate,
                    timeSlot,
                    persons: requestedPersons,
                    status: 'CONFIRMED',
                    notes: data.notes || null,
                    isRecurring,
                    recurringPeriod,
                    parentBookingId,
                },
            });
        };

        const primaryBooking = await performSingleBooking(data.bookingDate, data.timeSlot);

        if (isRecurring && recurringPeriod) {
            let currentDate = new Date(data.bookingDate);
            for (let i = 1; i <= 3; i++) {
                if (recurringPeriod === 'WEEKLY') {
                    currentDate.setDate(currentDate.getDate() + 7);
                } else if (recurringPeriod === 'MONTHLY') {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }
                const nextDateStr = currentDate.toISOString().split('T')[0];
                try {
                    await performSingleBooking(nextDateStr, data.timeSlot, primaryBooking.id);
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
                        businessProfile: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
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
            include: { slot: true },
            orderBy: { createdAt: 'desc' }
        });
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

