import { Controller, Get, Post, Put, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @UseGuards(JwtAuthGuard)
    @Put('user')
    async updateProfile(@Req() req: any, @Body() data: any) {
        return this.profileService.updateProfile(req.user.userId, data);
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
        @Query('location') location: string,
    ) {
        return this.profileService.searchServices(category, location);
    }
}
