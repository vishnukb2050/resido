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

    // Hard cap so a single call can never load an unbounded follower/following
    // list for a viral account. Callers that need full lists must page.
    private static readonly LIST_MAX_TAKE = 100;

    private clampTake(take?: number): number {
        const n = Number(take) || FollowService.LIST_MAX_TAKE;
        return Math.min(Math.max(n, 1), FollowService.LIST_MAX_TAKE);
    }

    async getFollowers(userId: string, skip = 0, take?: number) {
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
            orderBy: { createdAt: 'desc' },
            skip: Math.max(0, Number(skip) || 0),
            take: this.clampTake(take),
        });
    }

    async getFollowing(userId: string, skip = 0, take?: number) {
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
            orderBy: { createdAt: 'desc' },
            skip: Math.max(0, Number(skip) || 0),
            take: this.clampTake(take),
        });
    }

    /**
     * Bounded relationship probe used by the feed for visibility gating.
     * Returns the subset of `candidateIds` that FOLLOW `userId` (i.e. each
     * returned id is a follower of the viewer). The `IN (...)` list is the
     * page's author ids (≤ a few dozen), so this is a tiny indexed lookup —
     * unlike loading the viewer's entire follower list on every feed request.
     */
    async getFollowersAmong(userId: string, candidateIds: string[]): Promise<{ followerIds: string[] }> {
        if (!userId || !Array.isArray(candidateIds) || candidateIds.length === 0) {
            return { followerIds: [] };
        }
        const capped = Array.from(new Set(candidateIds.filter(Boolean))).slice(0, 500);
        if (capped.length === 0) return { followerIds: [] };
        const rows = await this.prisma.userRead.follow.findMany({
            where: { followingId: userId, followerId: { in: capped } },
            select: { followerId: true },
        });
        return { followerIds: rows.map((r) => r.followerId) };
    }

    /**
     * Bounded relationship probe: returns the subset of `candidateIds` that
     * `userId` FOLLOWS (i.e. the viewer follows each returned id). Mirrors
     * getFollowersAmong for the other direction.
     */
    async getFollowingAmong(userId: string, candidateIds: string[]): Promise<{ followingIds: string[] }> {
        if (!userId || !Array.isArray(candidateIds) || candidateIds.length === 0) {
            return { followingIds: [] };
        }
        const capped = Array.from(new Set(candidateIds.filter(Boolean))).slice(0, 500);
        if (capped.length === 0) return { followingIds: [] };
        const rows = await this.prisma.userRead.follow.findMany({
            where: { followerId: userId, followingId: { in: capped } },
            select: { followingId: true },
        });
        return { followingIds: rows.map((r) => r.followingId) };
    }

    async getFollowStatus(followerId: string, followingId: string) {
        if (!followerId || followerId === followingId) {
            return { isFollowing: false };
        }
        const existing = await this.prisma.userRead.follow.findUnique({
            where: {
                followerId_followingId: { followerId, followingId },
            },
            select: { followerId: true },
        });
        return { isFollowing: !!existing };
    }

    async getFollowStats(userId: string) {
        const [followersCount, followingCount] = await Promise.all([
            this.prisma.userRead.follow.count({ where: { followingId: userId } }),
            this.prisma.userRead.follow.count({ where: { followerId: userId } }),
        ]);
        return { followersCount, followingCount };
    }
}
