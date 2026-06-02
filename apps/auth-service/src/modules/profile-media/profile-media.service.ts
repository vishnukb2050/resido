import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ProfileMediaQueueService } from './profile-media-queue.service';

@Injectable()
export class ProfileMediaService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly queue: ProfileMediaQueueService,
        private readonly config: ConfigService,
    ) {}

    assertWorkerSecret(header?: string) {
        const expected = this.config.get<string>('MEDIA_WORKER_SECRET') || 'resido-media-dev-secret';
        if (!header || header !== expected) {
            throw new ForbiddenException('Invalid media worker credentials');
        }
    }

    /** Normalise stored value to an R2 object key when possible. */
    extractStorageKey(value?: string | null): string | null {
        if (!value?.trim()) return null;
        const trimmed = value.trim();
        if (trimmed.startsWith('resido/')) return trimmed;
        const publicUrlBase = this.config.get<string>('CLOUDFLARE_R2_PUBLIC_URL')?.replace(/\/$/, '');
        if (publicUrlBase && trimmed.startsWith(publicUrlBase + '/')) {
            return trimmed.slice(publicUrlBase.length + 1);
        }
        const bucket = this.config.get<string>('AWS_S3_BUCKET_NAME') || this.config.get<string>('AWS_S3_BUCKET');
        if (bucket) {
            const marker = `/${bucket}/`;
            const idx = trimmed.indexOf(marker);
            if (idx >= 0) return trimmed.slice(idx + marker.length);
        }
        return null;
    }

    async enqueueAfterPhotoUpdate(userId: string, tenantId: string, profilePhotoValue: string) {
        const sourceKey =
            this.extractStorageKey(profilePhotoValue) ||
            (profilePhotoValue.startsWith('resido/') ? profilePhotoValue : null);
        if (!sourceKey) return;
        await this.queue.enqueueProfilePhoto(userId, tenantId, sourceKey);
    }

    async completeProfilePhoto(
        userId: string,
        body: {
            status?: 'READY' | 'FAILED';
            thumbnailKey?: string;
            posterKey?: string;
            errorMessage?: string;
        },
    ) {
        const user = await this.prisma.userRead.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        if (body.status === 'FAILED') {
            return { ok: false, errorMessage: body.errorMessage };
        }

        const data: Record<string, string | null> = {};
        if (body.thumbnailKey) data.profilePhotoThumb = body.thumbnailKey;
        if (body.posterKey) data.profilePhoto = body.posterKey;

        if (Object.keys(data).length) {
            const updated = await this.prisma.userClient.user.update({
                where: { id: userId },
                data,
            });

            if (updated.phone) {
                try {
                    await this.prisma.coreClient.member.updateMany({
                        where: { phone: updated.phone },
                        data: {
                            profilePhoto: updated.profilePhoto,
                        },
                    });
                } catch {
                    /* non-fatal */
                }
            }
        }

        return { ok: true };
    }

    resolvePhotoFields(user: { profilePhoto?: string | null; profilePhotoThumb?: string | null }) {
        const profilePhoto = this.storage.resolvePublicMediaUrl(user.profilePhoto);
        const thumb = user.profilePhotoThumb
            ? this.storage.resolvePublicMediaUrl(user.profilePhotoThumb)
            : null;
        return {
            profilePhoto,
            profilePhotoThumb: thumb || profilePhoto,
        };
    }

    async getAvatarsBatch(userIds: string[]): Promise<Record<string, { profilePhoto: string | null; profilePhotoThumb: string | null }>> {
        if (!userIds.length) return {};
        const users = await this.prisma.userRead.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, profilePhoto: true, profilePhotoThumb: true },
        });
        return users.reduce((acc, u) => {
            acc[u.id] = this.resolvePhotoFields(u);
            return acc;
        }, {} as Record<string, { profilePhoto: string | null; profilePhotoThumb: string | null }>);
    }
}
