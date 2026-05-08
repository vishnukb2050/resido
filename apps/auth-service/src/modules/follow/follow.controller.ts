import { Controller, Post, Delete, Get, Param, Headers, BadRequestException } from '@nestjs/common';
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

    @Get('followers/:id')
    getFollowers(@Param('id') userId: string) {
        return this.followService.getFollowers(userId);
    }

    @Get('following/:id')
    getFollowing(@Param('id') userId: string) {
        return this.followService.getFollowing(userId);
    }
}
