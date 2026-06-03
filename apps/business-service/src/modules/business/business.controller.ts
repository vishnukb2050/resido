import { Controller, Post, Get, Body, Param, Query, Headers, Patch, Delete } from '@nestjs/common';
import { BusinessService } from './business.service';

@Controller('business')
export class BusinessController {
    constructor(private businessService: BusinessService) {}

    @Post('profiles')
    createProfile(
        @Headers('x-user-id') userId: string,
        @Headers('x-tenant-id') tenantId: string,
        @Body() data: any
    ) {
        return this.businessService.createProfile(userId, tenantId, data);
    }

    @Get('categories')
    getCategories() {
        return this.businessService.getCategories();
    }

    @Get('suggest')
    suggest(
        @Query('q') q?: string,
        @Query('limit') limit?: string
    ) {
        return this.businessService.suggest(q || '', limit ? parseInt(limit, 10) : 10);
    }

    @Get('profiles')
    listProfiles(
        @Query('tenantId') tenantId?: string,
        @Query('category') category?: string,
        @Query('pincode') pincode?: string,
        @Query('district') district?: string,
        @Query('state') state?: string,
        @Query('lat') lat?: string,
        @Query('lng') lng?: string,
        @Query('radius') radius?: string,
        @Query('query') query?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string
    ) {
        const tTenantId = tenantId ? tenantId.trim() : undefined;
        const tCategory = category ? category.trim() : undefined;
        const tPincode = pincode ? pincode.trim() : undefined;
        const tDistrict = district ? district.trim() : undefined;
        const tState = state ? state.trim() : undefined;
        const tQuery = query ? query.trim() : undefined;

        return this.businessService.listProfiles({ 
            tenantId: tTenantId,
            category: tCategory,
            pincode: tPincode,
            district: tDistrict,
            state: tState,
            lat: lat ? parseFloat(lat) : undefined,
            lng: lng ? parseFloat(lng) : undefined,
            radius: radius ? parseInt(radius, 10) : undefined,
            query: tQuery,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }

    // Must be defined before :id route so NestJS routes it correctly
    @Get('bookings/my')
    getMyBookings(@Headers('x-user-id') userId: string) {
        return this.businessService.getMyBookings(userId);
    }

    @Patch('bookings/:bookingId/cancel')
    cancelBooking(
        @Headers('x-user-id') userId: string,
        @Param('bookingId') bookingId: string
    ) {
        return this.businessService.cancelBooking(userId, bookingId);
    }

    // ─── Booking Updates (owner-posted notes/photos visible to customer) ─────

    @Post('bookings/:bookingId/updates')
    addBookingUpdate(
        @Headers('x-user-id') userId: string,
        @Param('bookingId') bookingId: string,
        @Body() data: { message?: string; photoUrl?: string }
    ) {
        return this.businessService.addBookingUpdate(userId, bookingId, data || {});
    }

    @Get('bookings/:bookingId/updates')
    listBookingUpdates(
        @Headers('x-user-id') userId: string,
        @Param('bookingId') bookingId: string
    ) {
        return this.businessService.listBookingUpdates(userId, bookingId);
    }

    @Delete('bookings/:bookingId/updates/:updateId')
    deleteBookingUpdate(
        @Headers('x-user-id') userId: string,
        @Param('updateId') updateId: string
    ) {
        return this.businessService.deleteBookingUpdate(userId, updateId);
    }

    @Get('profiles/my')
    getMyProfiles(@Headers('x-user-id') userId: string) {
        return this.businessService.getProfilesByUserId(userId);
    }

    @Get('profiles/:id')
    getProfile(@Param('id') id: string) {
        return this.businessService.getProfile(id);
    }

    @Patch('profiles/:id')
    updateProfile(
        @Headers('x-user-id') userId: string,
        @Param('id') id: string,
        @Body() data: any,
    ) {
        return this.businessService.updateProfile(userId, id, data);
    }

    @Delete('profiles/:id')
    deleteProfile(
        @Headers('x-user-id') userId: string,
        @Param('id') id: string
    ) {
        return this.businessService.deleteProfile(userId, id);
    }

    // ─── Business Slot Endpoints ──────────────────────────────────────────────

    @Post('profiles/:profileId/slots')
    createSlot(
        @Headers('x-user-id') userId: string,
        @Param('profileId') profileId: string,
        @Body() data: any
    ) {
        return this.businessService.createSlot(userId, profileId, data);
    }

    @Patch('profiles/:profileId/slots/:slotId')
    updateSlot(
        @Headers('x-user-id') userId: string,
        @Param('profileId') profileId: string,
        @Param('slotId') slotId: string,
        @Body() data: any
    ) {
        return this.businessService.updateSlot(userId, profileId, slotId, data);
    }

    @Delete('profiles/:profileId/slots/:slotId')
    deleteSlot(
        @Headers('x-user-id') userId: string,
        @Param('profileId') profileId: string,
        @Param('slotId') slotId: string
    ) {
        return this.businessService.deleteSlot(userId, profileId, slotId);
    }

    @Get('profiles/:profileId/slots')
    getSlots(
        @Param('profileId') profileId: string,
        @Query('date') date?: string
    ) {
        return this.businessService.getSlots(profileId, date);
    }

    @Get('profiles/:profileId/slots/:slotId')
    getSlotById(
        @Param('profileId') profileId: string,
        @Param('slotId') slotId: string,
        @Query('date') date?: string
    ) {
        return this.businessService.getSlotById(profileId, slotId, date);
    }

    // ─── Booking Endpoints ────────────────────────────────────────────────────

    @Post('profiles/:profileId/slots/:slotId/book')
    createBooking(
        @Headers('x-user-id') userId: string,
        @Param('profileId') profileId: string,
        @Param('slotId') slotId: string,
        @Body() data: any
    ) {
        return this.businessService.createBooking(userId, profileId, slotId, data);
    }

    @Get('profiles/:profileId/slots/:slotId/bookings')
    getSlotBookings(
        @Param('profileId') profileId: string,
        @Param('slotId') slotId: string,
        @Query('date') date: string
    ) {
        return this.businessService.getSlotBookings(profileId, slotId, date);
    }

    @Get('profiles/:profileId/bookings')
    getProfileBookings(
        @Headers('x-user-id') userId: string,
        @Param('profileId') profileId: string
    ) {
        return this.businessService.getProfileBookings(userId, profileId);
    }

    /**
     * Increments the public profile view counter. Owners viewing their own
     * profile are skipped by the service.
     */
    @Post('profiles/:profileId/view')
    trackProfileView(
        @Headers('x-user-id') userId: string,
        @Param('profileId') profileId: string,
    ) {
        return this.businessService.trackProfileView(profileId, userId || undefined);
    }

    /**
     * Owner-only booking report — supports an inclusive [from, to] date
     * window (YYYY-MM-DD). Defaults to the trailing 30 days when omitted.
     */
    @Get('profiles/:profileId/report')
    getBookingReport(
        @Headers('x-user-id') userId: string,
        @Param('profileId') profileId: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.businessService.getBookingReport(userId, profileId, { from, to });
    }
}
