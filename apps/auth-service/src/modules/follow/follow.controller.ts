import { Controller, Post, Delete, Get, Param, Headers, Query, Body, BadRequestException } from '@nestjs/common';
import { FollowService } from './follow.service';

@Controller('follow')
export class FollowController {
    constructor(private followService: FollowService) {}

    @Post(':id')
    follow(@Headers('x-user-id') followerId: string, @Param('id') followingId: string) {
        if (!followerId) throw new BadRequestException('User ID required');
        return this.followService.followUser(followerId, followingId);
    }

    @Delete(':id')
    unfollow(@Headers('x-user-id') followerId: string, @Param('id') followingId: string) {
        if (!followerId) throw new BadRequestException('User ID required');
        return this.followService.unfollowUser(followerId, followingId);
    }

    @Get('stats/:id')
    getStats(@Param('id') userId: string) {
        return this.followService.getFollowStats(userId);
    }

    @Get('status/:id')
    getStatus(@Headers('x-user-id') followerId: string, @Param('id') followingId: string) {
        return this.followService.getFollowStatus(followerId, followingId);
    }

    @Get('followers/:id')
    getFollowers(
        @Param('id') userId: string,
        @Query('skip') skip?: string,
        @Query('take') take?: string,
    ) {
        return this.followService.getFollowers(userId, Number(skip) || 0, take ? Number(take) : undefined);
    }

    @Get('following/:id')
    getFollowing(
        @Param('id') userId: string,
        @Query('skip') skip?: string,
        @Query('take') take?: string,
    ) {
        return this.followService.getFollowing(userId, Number(skip) || 0, take ? Number(take) : undefined);
    }

    // Bounded relationship probes for the feed's visibility gating. Internal
    // (service-to-service) callers POST the page's author ids; we return only
    // the ids that have the given relationship with the viewer.
    @Post('followers-among/:id')
    getFollowersAmong(@Param('id') userId: string, @Body() body: { candidateIds?: string[] }) {
        return this.followService.getFollowersAmong(userId, body?.candidateIds || []);
    }

    @Post('following-among/:id')
    getFollowingAmong(@Param('id') userId: string, @Body() body: { candidateIds?: string[] }) {
        return this.followService.getFollowingAmong(userId, body?.candidateIds || []);
    }
}
