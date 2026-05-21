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
        @Query('query') query?: string
    ) {
        return this.businessService.listProfiles({ 
            tenantId, 
            category, 
            pincode, 
            district, 
            state, 
            lat: lat ? parseFloat(lat) : undefined,
            lng: lng ? parseFloat(lng) : undefined,
            radius: radius ? parseInt(radius) : undefined,
            query
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

    @Get('profiles/my')
    getMyProfiles(@Headers('x-user-id') userId: string) {
        return this.businessService.getProfilesByUserId(userId);
    }

    @Get('profiles/:id')
    getProfile(@Param('id') id: string) {
        return this.businessService.getProfile(id);
    }

    @Patch('profiles/:id')
    updateProfile(@Param('id') id: string, @Body() data: any) {
        return this.businessService.updateProfile(id, data);
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
}
