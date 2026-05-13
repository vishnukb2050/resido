import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ProfileService {
    constructor(
        private prisma: PrismaService,
        private storageService: StorageService
    ) {}

    async updateProfile(userId: string, data: any, file?: any) {
        let profilePhotoUrl = data.profilePhoto;

        if (file) {
            // Get user's first membership for structured key
            const userWithMembership = await this.prisma.userRead.user.findUnique({
                where: { id: userId },
                include: { workspaceMemberships: { take: 1 } }
            });
            
            const tenantId = (userWithMembership as any)?.workspaceMemberships?.[0]?.tenantId || 'global';
            
            const uploadResult = await this.storageService.uploadFile(
                file, 
                tenantId, 
                userId, 
                'profiles'
            );
            profilePhotoUrl = uploadResult.fileUrl;
        }

        const user = await this.prisma.userClient.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                age: data.age ? parseInt(data.age) : undefined,
                description: data.description,
                profilePhoto: profilePhotoUrl,
                profileName: data.profileName,
                phoneVisibility: data.phoneVisibility,
            }
        });

        // Sync to resident-service members with same phone
        if (user.phone) {
            await this.prisma.coreClient.member.updateMany({
                where: { phone: user.phone },
                data: {
                    profileName: user.profileName,
                    phoneVisibility: user.phoneVisibility,
                    name: user.name,
                    profilePhoto: user.profilePhoto,
                }
            });
        }

        return user;
    }

    async getJobProfile(userId: string) {
        return this.prisma.userRead.jobProfile.findUnique({
            where: { userId }
        });
    }

    async upsertJobProfile(userId: string, data: any) {
        return this.prisma.userClient.jobProfile.upsert({
            where: { userId },
            update: {
                category: data.category,
                description: data.description,
                pincode: data.pincode,
                city: data.city,
                district: data.district,
                state: data.state,
                expertise: data.expertise,
                images: data.images,
                isActive: true
            },
            create: {
                userId,
                category: data.category,
                description: data.description,
                pincode: data.pincode,
                city: data.city,
                district: data.district,
                state: data.state,
                expertise: data.expertise,
                images: data.images
            }
        });
    }

    async searchServices(category: string, location: string) {
        // Simple search by pincode or city or district or state
        return this.prisma.userRead.jobProfile.findMany({
            where: {
                category: category,
                OR: [
                    { pincode: location },
                    { city: { contains: location, mode: 'insensitive' } },
                    { district: { contains: location, mode: 'insensitive' } },
                    { state: { contains: location, mode: 'insensitive' } }
                ],
                isActive: true
            },
            include: {
                user: {
                    select: {
                        name: true,
                        phone: true
                    }
                }
            }
        });
    }

    async saveScan(userId: string, data: string, type?: string) {
        return this.prisma.userClient.savedScan.create({
            data: { userId, data, type }
        });
    }

    async getSavedScans(userId: string) {
        return this.prisma.userRead.savedScan.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async searchUsers(query: string) {
        if (!query || query.length < 3) return [];

        return this.prisma.userRead.user.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query } },
                    { profileName: { contains: query, mode: 'insensitive' } }
                ],
                isActive: true
            },
            select: {
                id: true,
                name: true,
                phone: true,
                profileName: true,
                profilePhoto: true
            },
            take: 20
        });
    }

    async followUser(followerId: string, followingId: string) {
        if (followerId === followingId) return;
        return this.prisma.userClient.follow.upsert({
            where: { followerId_followingId: { followerId, followingId } },
            create: { followerId, followingId },
            update: {}
        });
    }

    async unfollowUser(followerId: string, followingId: string) {
        return this.prisma.userClient.follow.deleteMany({
            where: { followerId, followingId }
        });
    }

    async getFollowing(userId: string) {
        const follows = await this.prisma.userRead.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });
        return follows.map(f => f.followingId);
    }
}
