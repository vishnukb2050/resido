import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class AssetsService {
    constructor(private prisma: PrismaService) {}

    async createAsset(tenantId: string, data: any) {
        return this.prisma.client.communityAsset.create({
            data: {
                tenantId,
                name: data.name,
                category: data.category,
                status: data.status || 'ACTIVE',
                serialNumber: data.serialNumber,
                purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
                purchaseCost: data.purchaseCost ? Number(data.purchaseCost) : null,
                warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
                location: data.location,
                description: data.description,
                photoUrl: data.photoUrl,
            }
        });
    }

    async getAssets(tenantId: string, query?: any) {
        const { category, status } = query || {};
        const where: any = { tenantId };
        if (category) where.category = category;
        if (status) where.status = status;

        return this.prisma.client.communityAsset.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
    }

    async getAsset(tenantId: string, id: string) {
        return this.prisma.client.communityAsset.findFirst({
            where: { tenantId, id }
        });
    }

    async updateAsset(tenantId: string, id: string, data: any) {
        return this.prisma.client.communityAsset.update({
            where: { id },
            data: {
                name: data.name,
                category: data.category,
                status: data.status,
                serialNumber: data.serialNumber,
                purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
                purchaseCost: data.purchaseCost ? Number(data.purchaseCost) : undefined,
                warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
                location: data.location,
                description: data.description,
                photoUrl: data.photoUrl,
            }
        });
    }

    async deleteAsset(tenantId: string, id: string) {
        return this.prisma.client.communityAsset.delete({
            where: { id }
        });
    }
}
