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
        @Query('location') location?: string
    ) {
        return this.businessService.listProfiles(tenantId, category, location);
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
