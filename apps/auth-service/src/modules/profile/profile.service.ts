import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
    constructor(private prisma: PrismaService) {}

    async updateProfile(userId: string, data: any) {
        return this.prisma.userClient.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                age: data.age ? parseInt(data.age) : undefined,
                description: data.description,
                profilePhoto: data.profilePhoto,
            }
        });
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
}
