import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowService {
    constructor(private prisma: PrismaService) {}

    async followUser(followerId: string, followingId: string) {
        if (followerId === followingId) {
            throw new BadRequestException('You cannot follow yourself');
        }

        const existing = await this.prisma.userRead.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });

        if (existing) return existing;

        return this.prisma.userClient.follow.create({
            data: {
                followerId,
                followingId,
            },
        });
    }

    async unfollowUser(followerId: string, followingId: string) {
        return this.prisma.userClient.follow.delete({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        }).catch(() => {
            throw new BadRequestException('You are not following this user');
        });
    }

    async getFollowers(userId: string) {
        return this.prisma.userRead.follow.findMany({
            where: { followingId: userId },
            include: {
                follower: {
                    select: {
                        id: true,
                        name: true,
                        profileName: true,
                        profilePhoto: true,
                    },
                },
            },
        });
    }

    async getFollowing(userId: string) {
        return this.prisma.userRead.follow.findMany({
            where: { followerId: userId },
            include: {
                following: {
                    select: {
                        id: true,
                        name: true,
                        profileName: true,
                        profilePhoto: true,
                    },
                },
            },
        });
    }

    async getFollowStats(userId: string) {
        const [followersCount, followingCount] = await Promise.all([
            this.prisma.userRead.follow.count({ where: { followingId: userId } }),
            this.prisma.userRead.follow.count({ where: { followerId: userId } }),
        ]);
        return { followersCount, followingCount };
    }
}
