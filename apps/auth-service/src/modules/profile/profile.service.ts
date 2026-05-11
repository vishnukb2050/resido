import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
    constructor(private prisma: PrismaService) {}

    async updateProfile(userId: string, data: any) {
        const user = await this.prisma.userClient.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                age: data.age ? parseInt(data.age) : undefined,
                description: data.description,
                profilePhoto: data.profilePhoto,
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
                    // userId is often not updatable via updateMany in some Prisma versions/configs
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
}
