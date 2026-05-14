import { Controller, Get, Post, Put, Body, Query, UseGuards, Req, Param, Delete, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @UseGuards(JwtAuthGuard)
    @Put('user')
    @UseInterceptors(FileInterceptor('file'))
    async updateProfile(
        @Req() req: any, 
        @Body() data: any,
        @UploadedFile() file?: any
    ) {
        return this.profileService.updateProfile(req.user.userId, data, file);
    }

    @UseGuards(JwtAuthGuard)
    @Get('job')
    async getJobProfile(@Req() req: any) {
        return this.profileService.getJobProfile(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('job')
    async upsertJobProfile(@Req() req: any, @Body() data: any) {
        return this.profileService.upsertJobProfile(req.user.userId, data);
    }

    @Get('search')
    async searchServices(
        @Query('category') category: string,
        @Query('pincode') pincode?: string,
        @Query('district') district?: string,
        @Query('state') state?: string,
        @Query('lat') lat?: string,
        @Query('lng') lng?: string,
        @Query('radius') radius?: string,
    ) {
        return this.profileService.searchServices(category, { 
            pincode, 
            district, 
            state,
            lat: lat ? parseFloat(lat) : undefined,
            lng: lng ? parseFloat(lng) : undefined,
            radius: radius ? parseFloat(radius) : undefined
        });
    }

    @Get('locations/search')
    async searchLocations(@Query('query') query: string, @Res() res: any) {
        const results = await this.profileService.searchLocations(query);
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');
        return res.json(results);
    }

    @Get('locations/reverse-geocode')
    async reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
        return this.profileService.reverseGeocode(parseFloat(lat), parseFloat(lng));
    }

    @UseGuards(JwtAuthGuard)
    @Post('scans')
    async saveScan(@Req() req: any, @Body() body: { data: string, type?: string }) {
        return this.profileService.saveScan(req.user.userId, body.data, body.type);
    }

    @UseGuards(JwtAuthGuard)
    @Get('scans')
    async getSavedScans(@Req() req: any) {
        return this.profileService.getSavedScans(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('users/search')
    async searchUsers(@Query('query') query: string) {
        return this.profileService.searchUsers(query);
    }

    @UseGuards(JwtAuthGuard)
    @Post('follow/:id')
    async follow(@Req() req: any, @Param('id') id: string) {
        return this.profileService.followUser(req.user.userId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('follow/:id')
    async unfollow(@Req() req: any, @Param('id') id: string) {
        return this.profileService.unfollowUser(req.user.userId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('following')
    async getFollowing(@Req() req: any) {
        return this.profileService.getFollowing(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('storage/presigned-url')
    async getPresignedUrl(
        @Req() req: any,
        @Query('fileName') fileName: string,
        @Query('contentType') contentType: string,
        @Query('resourceType') resourceType?: string
    ) {
        // Find tenantId for the user
        const userWithMembership = await this.profileService.getUserWithMembership(req.user.userId);
        const tenantId = userWithMembership?.workspaceMemberships?.[0]?.tenantId || 'global';
        
        return this.profileService.getPresignedUrl(
            fileName,
            contentType,
            tenantId,
            req.user.userId,
            resourceType
        );
    }
}
