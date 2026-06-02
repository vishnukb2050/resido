import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/tenant-prisma.service';
import { MediaQueueService } from './media-queue.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MediaService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly queue: MediaQueueService,
        private readonly storage: StorageService,
        private readonly config: ConfigService,
    ) {}

    assertWorkerSecret(header?: string) {
        const expected = this.config.get<string>('MEDIA_WORKER_SECRET') || 'resido-media-dev-secret';
        if (!header || header !== expected) {
            throw new ForbiddenException('Invalid media worker credentials');
        }
    }

    async attachMediaAssetsToBlog(
        tenantId: string,
        ownerUserId: string,
        blogId: string,
        blogType: 'THREAD' | 'FLARE',
        mediaAssetsInput: Array<{ sourceKey: string; kind: 'VIDEO' | 'IMAGE'; id?: string }>,
    ) {
        if (!mediaAssetsInput?.length) return;

        const assetIds: string[] = [];
        for (const item of mediaAssetsInput) {
            const asset = await (this.prisma.client as any).mediaAsset.create({
                data: {
                    tenantId,
                    ownerUserId,
                    blogId,
                    kind: item.kind,
                    sourceKey: item.sourceKey,
                    status: 'QUEUED',
                },
            });
            assetIds.push(asset.id);
            await this.queue.enqueueMediaProcess({
                mediaAssetId: asset.id,
                tenantId,
                ownerUserId,
                sourceKey: item.sourceKey,
                kind: item.kind,
                blogId,
                blogType,
            });
        }

        await (this.prisma.client as any).blog.update({
            where: { id_tenantId: { id: blogId, tenantId } },
            data: {
                mediaAssetIds: assetIds,
                mediaStatus: 'PROCESSING',
            },
        });
    }

    async completeProcessing(
        mediaAssetId: string,
        tenantId: string,
        body: {
            status?: 'READY' | 'FAILED';
            errorMessage?: string;
            durationSec?: number;
            width?: number;
            height?: number;
            thumbnailKey?: string;
            posterKey?: string;
            hlsManifestKey?: string;
            dashManifestKey?: string;
            renditions?: any;
            mp4Keys?: string[];
        },
    ) {
        const asset = await (this.prisma.client as any).mediaAsset.findFirst({
            where: { id: mediaAssetId, tenantId },
        });
        if (!asset) throw new NotFoundException('Media asset not found');

        const status = body.status || 'READY';
        await (this.prisma.client as any).mediaAsset.update({
            where: { id_tenantId: { id: mediaAssetId, tenantId } },
            data: {
                status,
                errorMessage: body.errorMessage || null,
                durationSec: body.durationSec ?? null,
                width: body.width ?? null,
                height: body.height ?? null,
                thumbnailKey: body.thumbnailKey || null,
                posterKey: body.posterKey || null,
                hlsManifestKey: body.hlsManifestKey || null,
                dashManifestKey: body.dashManifestKey || null,
                renditions: body.renditions ?? null,
            },
        });

        if (!asset.blogId) return { ok: true };

        await this.syncBlogMediaFromAssets(asset.blogId, tenantId);
        return { ok: true };
    }

    async syncBlogMediaFromAssets(blogId: string, tenantId: string) {
        const assets = await (this.prisma.client as any).mediaAsset.findMany({
            where: { blogId, tenantId },
        });
        if (!assets.length) return;

        const anyFailed = assets.some((a: any) => a.status === 'FAILED');
        const anyPending = assets.some((a: any) =>
            ['PENDING', 'QUEUED', 'PROCESSING'].includes(a.status),
        );
        const blogStatus = anyFailed ? 'FAILED' : anyPending ? 'PROCESSING' : 'READY';

        const mediaUrls: string[] = [];
        for (const a of assets) {
            const renditions = (a.renditions as any[]) || [];
            const best =
                renditions.find((r: any) => r.height === 720)?.mp4Key ||
                renditions.find((r: any) => r.height === 480)?.mp4Key ||
                renditions[0]?.mp4Key;
            if (best) {
                mediaUrls.push(this.storage.buildPublicUrl(best));
            } else if (a.status === 'READY' && a.sourceKey) {
                mediaUrls.push(this.storage.buildPublicUrl(a.sourceKey));
            }
        }

        await (this.prisma.client as any).blog.update({
            where: { id_tenantId: { id: blogId, tenantId } },
            data: {
                mediaStatus: blogStatus,
                mediaUrls: mediaUrls.length ? mediaUrls : undefined,
            },
        });
    }

    async retryProcessing(mediaAssetId: string, tenantId: string) {
        const asset = await (this.prisma.client as any).mediaAsset.findFirst({
            where: { id: mediaAssetId, tenantId },
        });
        if (!asset) throw new NotFoundException('Media asset not found');

        await (this.prisma.client as any).mediaAsset.update({
            where: { id_tenantId: { id: mediaAssetId, tenantId } },
            data: { status: 'QUEUED', errorMessage: null },
        });

        const blog = asset.blogId
            ? await (this.prisma.client as any).blog.findFirst({
                where: { id: asset.blogId, tenantId },
            })
            : null;

        await this.queue.enqueueMediaProcess({
            mediaAssetId: asset.id,
            tenantId,
            ownerUserId: asset.ownerUserId,
            sourceKey: asset.sourceKey,
            kind: asset.kind,
            blogId: asset.blogId || undefined,
            blogType: blog?.type === 'FLARE' ? 'FLARE' : 'THREAD',
        });

        return { ok: true };
    }
}
