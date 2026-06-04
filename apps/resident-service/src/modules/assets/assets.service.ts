import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class AssetsService {
    constructor(private prisma: PrismaService) {}

    async createAsset(tenantId: string, data: any) {
        const parseDate = (d: any) => {
            if (!d) return null;
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? null : parsed;
        };

        return this.prisma.client.communityAsset.create({
            data: {
                tenantId,
                name: data.name,
                category: data.category,
                status: data.status || 'ACTIVE',
                serialNumber: data.serialNumber,
                purchaseDate: parseDate(data.purchaseDate),
                purchaseCost: data.purchaseCost ? Number(data.purchaseCost) : null,
                warrantyExpiry: parseDate(data.warrantyExpiry),
                location: data.location,
                description: data.description,
                photoUrl: data.photoUrl,
                billUrl: data.billUrl,
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
            orderBy: { createdAt: 'desc' },
            // Tenant-scoped; defensive bound so a long-lived community's asset
            // register can't grow into an unbounded payload.
            take: 2000,
        });
    }

    async getAsset(tenantId: string, id: string) {
        return this.prisma.client.communityAsset.findFirst({
            where: { tenantId, id }
        });
    }

    async updateAsset(tenantId: string, id: string, data: any) {
        const parseDate = (d: any) => {
            if (d === undefined) return undefined;
            if (!d) return null;
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? null : parsed;
        };

        return this.prisma.client.communityAsset.update({
            where: { id },
            data: {
                name: data.name,
                category: data.category,
                status: data.status,
                serialNumber: data.serialNumber,
                purchaseDate: parseDate(data.purchaseDate),
                purchaseCost: data.purchaseCost ? Number(data.purchaseCost) : undefined,
                warrantyExpiry: parseDate(data.warrantyExpiry),
                location: data.location,
                description: data.description,
                photoUrl: data.photoUrl,
                billUrl: data.billUrl,
            }
        });
    }

    async deleteAsset(tenantId: string, id: string) {
        return this.prisma.client.communityAsset.delete({
            where: { id }
        });
    }
}
