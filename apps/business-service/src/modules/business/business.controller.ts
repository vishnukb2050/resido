import { Controller, Post, Get, Body, Param, Query, Headers, Patch } from '@nestjs/common';
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
}
