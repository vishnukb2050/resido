import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { FlareGateway } from './flare.gateway';
import { PrismaService } from '../prisma/tenant-prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { StorageService } from '../storage/storage.service';
import { MediaService } from '../media/media.service';
import { CacheService } from '../cache/cache.service';

// Cache TTLs (seconds). Short enough that a stale avatar/visibility/follower
// set self-heals within a minute or two, long enough to absorb the bulk of
// repeated feed reads at scale.
const AVATAR_TTL = 300;
const VISIBILITY_TTL = 300;
const FOLLOWERS_TTL = 60;

// Allowed post visibility values. Anything else from the client is coerced
// to PUBLIC on create so we never silently store an unknown bucket that
// would then bypass our visibility filters at read time.
const VALID_VISIBILITIES = new Set(['PUBLIC', 'CONTACTS', 'FOLLOWERS']);

@Injectable()
export class BlogsService {
    constructor(
        private prisma: PrismaService,
        private http: HttpService,
        private storage: StorageService,
        private flareGateway: FlareGateway,
        private mediaService: MediaService,
        private cache: CacheService,
    ) {}

    /** Batch fetch of each author's profileVisibility from auth-service. */
    private async fetchAuthorAvatars(
        authorIds: string[],
    ): Promise<Record<string, { profilePhoto: string | null; profilePhotoThumb: string | null }>> {
        const unique = Array.from(new Set(authorIds.filter(Boolean)));
        if (unique.length === 0) return {};

        type Avatar = { profilePhoto: string | null; profilePhotoThumb: string | null };
        const result: Record<string, Avatar> = {};

        // 1) Pull whatever we already have cached (one MGET, not N gets).
        const cached = await this.cache.mgetJson<Avatar>(unique.map((id) => `avatar:${id}`));
        const misses: string[] = [];
        unique.forEach((id, i) => {
            if (cached[i]) result[id] = cached[i] as Avatar;
            else misses.push(id);
        });
        if (misses.length === 0) return result;

        // 2) Fetch only the misses from auth-service, then warm the cache.
        try {
            const res = await firstValueFrom(
                this.http.get(
                    `${this.authBaseUrl()}/profile/users/avatars/batch?ids=${encodeURIComponent(misses.join(','))}`,
                    { headers: this.internalHeaders() },
                ),
            );
            const fetched = (res?.data || {}) as Record<string, Avatar>;
            const toCache = misses.map((id) => ({
                key: `avatar:${id}`,
                value: fetched[id] || { profilePhoto: null, profilePhotoThumb: null },
                ttlSeconds: AVATAR_TTL,
            }));
            await this.cache.msetJson(toCache);
            Object.assign(result, fetched);
        } catch (err: any) {
            console.warn('[avatars] failed to fetch author avatars', err?.message);
        }
        return result;
    }

    /** Invalidate a single author's cached avatar (call after a photo change). */
    async invalidateAuthorAvatar(userId: string) {
        await this.cache.del(`avatar:${userId}`);
    }

    /** Base URL for auth-service (Cloud Map in prod, compose name locally). */
    private authBaseUrl(): string {
        return process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    }

    /** Shared-secret header for internal service-to-service calls. */
    private internalHeaders(): Record<string, string> {
        const secret = process.env.INTERNAL_SERVICE_SECRET;
        return secret ? { 'x-internal-secret': secret } : {};
    }

    private enrichBlogsWithAuthorAvatars(blogs: any[], avatars: Record<string, any>) {
        return blogs.map((b) => {
            const a = avatars[b.authorId];
            if (!a) return b;
            return {
                ...b,
                authorAvatar: a.profilePhoto || b.authorAvatar,
                authorAvatarThumb: a.profilePhotoThumb || a.profilePhoto || b.authorAvatar,
            };
        });
    }

    private async fetchAuthorVisibilities(authorIds: string[]): Promise<Record<string, string>> {
        const unique = Array.from(new Set(authorIds.filter(Boolean)));
        if (unique.length === 0) return {};

        const result: Record<string, string> = {};
        const cached = await this.cache.mgetJson<string>(unique.map((id) => `vis:${id}`));
        const misses: string[] = [];
        unique.forEach((id, i) => {
            if (cached[i]) result[id] = cached[i] as string;
            else misses.push(id);
        });
        if (misses.length === 0) return result;

        try {
            const res = await firstValueFrom(
                this.http.get(
                    `${this.authBaseUrl()}/profile/users/visibilities/batch?ids=${encodeURIComponent(misses.join(','))}`,
                    { headers: this.internalHeaders() },
                ),
            );
            const fetched = (res?.data || {}) as Record<string, string>;
            const toCache = misses.map((id) => ({
                key: `vis:${id}`,
                value: fetched[id] || 'GLOBAL',
                ttlSeconds: VISIBILITY_TTL,
            }));
            await this.cache.msetJson(toCache);
            Object.assign(result, fetched);
        } catch (err: any) {
            console.warn('[visibility] failed to fetch author visibilities', err?.message);
        }
        return result;
    }

    /**
     * Returns the set of user IDs that follow `viewerId`. Used to enforce
     * CONTACTS-visibility: a post tagged CONTACTS is only visible to people
     * the author has followed back (synced contacts auto-follow each other,
     * so mutual-follow is our best proxy for "in author's contact list").
     */
    private async fetchFollowersOf(viewerId: string): Promise<Set<string>> {
        if (!viewerId) return new Set();

        const cacheKey = `followers:${viewerId}`;
        const cached = await this.cache.getJson<string[]>(cacheKey);
        if (cached) return new Set(cached);

        try {
            const res = await firstValueFrom(
                this.http.get(`${this.authBaseUrl()}/follow/followers/${viewerId}`, {
                    headers: this.internalHeaders(),
                })
            );
            const rows: any[] = Array.isArray(res?.data) ? res.data : [];
            const ids = rows
                .map((r) => r?.followerId)
                .filter((id): id is string => typeof id === 'string' && id.length > 0);
            await this.cache.setJson(cacheKey, ids, FOLLOWERS_TTL);
            return new Set<string>(ids);
        } catch (err: any) {
            console.warn('[visibility] failed to fetch followers of viewer', viewerId, err?.message);
            return new Set();
        }
    }

    /**
     * Whether `viewerId` is allowed to see a post by `authorId` with the
     * given visibility. Used by single-blog fetches; list endpoints inline
     * the same logic for batch efficiency.
     */
    private canSee(
        visibility: string | null | undefined,
        authorId: string,
        viewerId: string | undefined,
        viewerFollowing: Set<string>,
        viewerFollowers: Set<string>,
        businessProfileId?: string | null,
    ): boolean {
        // The author can always see their own posts.
        if (viewerId && viewerId === authorId) return true;
        // Public posts and posts attached to a public business profile are
        // always visible (the business page is meant to surface them).
        if (visibility === 'PUBLIC' || !!businessProfileId) return true;
        if (visibility === 'FOLLOWERS') {
            return viewerFollowing.has(authorId);
        }
        if (visibility === 'CONTACTS') {
            // Viewer must follow the author AND the author must follow the
            // viewer back — the contact-sync auto-follow pairs the two
            // accounts only when each side has the other's phone number.
            return viewerFollowing.has(authorId) && viewerFollowers.has(authorId);
        }
        return false;
    }

    /**
     * Resolves a stored media value to a fully-qualified, browser-loadable URL.
     * Accepts:
     *   - Fully-qualified https URLs (returned unchanged)
     *   - Local file/content URIs (returned unchanged — helpful for previews)
     *   - Bare R2 keys ("tenants/...", "flares/...", "resido/...") → prefixed with the
     *     configured public R2 base so old rows without absolute URLs still load.
     */
    private resolveMediaValue(value?: string | null): string | null {
        if (!value) return null;
        const trimmed = String(value).trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) return trimmed;
        if (/^https?:\/\//i.test(trimmed)) {
            // Rewrite legacy auth-only r2.cloudflarestorage.com URLs to the
            // public r2.dev domain so old rows render correctly.
            return this.storage.healPublicUrl(trimmed);
        }
        return this.storage.buildPublicUrl(trimmed);
    }

    private decorateMedia<T extends {
        mediaUrls?: string[] | null;
        audioUrl?: string | null;
        authorAvatar?: string | null;
        thumbnailUrl?: string | null;
        posterUrl?: string | null;
        playback?: { hlsUrl?: string; dashUrl?: string; duration?: number } | null;
        mediaStatus?: string;
    }>(blog: T): T {
        const resolvedMedia = (blog.mediaUrls || []).map(u => this.resolveMediaValue(u)).filter(Boolean) as string[];
        const resolvedAudio = blog.audioUrl ? this.resolveMediaValue(blog.audioUrl) : null;
        const resolvedAvatar = blog.authorAvatar ? this.resolveMediaValue(blog.authorAvatar) : null;
        const thumb = (blog as any).thumbnailUrl
            ? this.resolveMediaValue((blog as any).thumbnailUrl)
            : resolvedMedia[0] || null;
        const poster = (blog as any).posterUrl
            ? this.resolveMediaValue((blog as any).posterUrl)
            : thumb;
        const playback = (blog as any).playback
            ? {
                ...(blog as any).playback,
                hlsUrl: (blog as any).playback.hlsUrl
                    ? this.resolveMediaValue((blog as any).playback.hlsUrl)
                    : undefined,
                dashUrl: (blog as any).playback.dashUrl
                    ? this.resolveMediaValue((blog as any).playback.dashUrl)
                    : undefined,
            }
            : null;
        return {
            ...blog,
            mediaUrls: resolvedMedia,
            audioUrl: resolvedAudio,
            authorAvatar: resolvedAvatar,
            thumbnailUrl: thumb,
            posterUrl: poster,
            previewUrl: poster || thumb,
            playback,
            mediaStatus: (blog as any).mediaStatus || 'READY',
        } as T;
    }

    private decodeFeedCursor(raw?: string): { createdAt: Date; id: string } | null {
        if (!raw) return null;
        try {
            const json = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
            if (!json?.id || !json?.createdAt) return null;
            return { id: String(json.id), createdAt: new Date(json.createdAt) };
        } catch {
            return null;
        }
    }

    private encodeFeedCursor(blog: { id: string; createdAt: Date }) {
        return Buffer.from(
            JSON.stringify({ id: blog.id, createdAt: blog.createdAt.toISOString() }),
            'utf8',
        ).toString('base64url');
    }

    private applyFeedCursor(where: any, cursor: { createdAt: Date; id: string } | null) {
        if (!cursor) return where;
        return {
            AND: [
                where,
                {
                    OR: [
                        { createdAt: { lt: cursor.createdAt } },
                        {
                            AND: [
                                { createdAt: cursor.createdAt },
                                { id: { lt: cursor.id } },
                            ],
                        },
                    ],
                },
            ],
        };
    }

    private blogListInclude(userId?: string) {
        return {
            poll: {
                include: {
                    options: {
                        include: {
                            _count: { select: { votes: true } },
                        },
                    },
                    votes: userId ? { where: { userId } } : false,
                },
            },
            mediaAssets: true,
        };
    }

    private buildPlaybackFromAssets(assets: any[] | undefined) {
        const primary = assets?.[0];
        if (!primary) return null;
        const renditions = (primary.renditions as any[]) || [];
        const pickMp4Key =
            renditions.find((r) => r.height === 720)?.mp4Key ||
            renditions.find((r) => r.height === 480)?.mp4Key ||
            renditions[0]?.mp4Key;
        const mp4Fallback = pickMp4Key ? this.storage.buildPublicUrl(pickMp4Key) : undefined;
        return {
            hlsUrl: primary.hlsManifestKey
                ? this.storage.buildPublicUrl(primary.hlsManifestKey)
                : undefined,
            dashUrl: primary.dashManifestKey
                ? this.storage.buildPublicUrl(primary.dashManifestKey)
                : undefined,
            mp4Url: mp4Fallback,
            duration: primary.durationSec ?? undefined,
        };
    }

    private toFeedItem(blog: any) {
        const assets = blog.mediaAssets || [];
        const primary = assets[0];
        const thumbKey = primary?.thumbnailKey || primary?.posterKey;
        const thumbFromAsset = thumbKey ? this.storage.buildPublicUrl(thumbKey) : null;

        const d = this.decorateMedia({
            ...blog,
            mediaStatus: blog.mediaStatus || 'READY',
            thumbnailUrl: thumbFromAsset || blog.mediaUrls?.[0],
            posterUrl: primary?.posterKey ? this.storage.buildPublicUrl(primary.posterKey) : thumbFromAsset,
            playback: this.buildPlaybackFromAssets(assets),
        });
        return {
            id: d.id,
            type: d.type,
            title: d.title,
            content: d.content,
            authorId: d.authorId,
            authorName: d.authorName,
            authorAvatar: d.authorAvatar,
            authorAvatarThumb: (blog as any).authorAvatarThumb || d.authorAvatar,
            thumbnailUrl: (d as any).thumbnailUrl,
            previewUrl: (d as any).previewUrl,
            mediaUrls: d.mediaUrls,
            mediaType: d.mediaType,
            mediaStatus: (d as any).mediaStatus || 'READY',
            playback: (d as any).playback || null,
            visibility: d.visibility,
            hashtags: d.hashtags,
            category: d.category,
            location: d.location,
            likesCount: d.likesCount,
            commentsCount: d.commentsCount,
            resharesCount: d.resharesCount,
            savesCount: d.savesCount,
            createdAt: d.createdAt,
            liked: !!d.liked,
            saved: !!d.saved,
            reshared: !!d.reshared,
            isLiked: !!d.liked,
            poll: d.poll,
            audioUrl: d.audioUrl,
            musicName: d.musicName,
            commentsEnabled: d.commentsEnabled,
            businessProfileId: d.businessProfileId,
        };
    }

    private emptyFeedPage() {
        return { items: [] as any[], nextCursor: null as string | null, hasMore: false };
    }

    async listBlogs(
        type?: 'THREAD' | 'FLARE',
        userId?: string,
        feedType: 'PUBLIC' | 'FOLLOWING' | 'FORYOU' | 'MY' | 'SAVED' | 'RESHARE' | 'AUTHOR' | 'HASHTAG' = 'PUBLIC',
        followingIds: string[] = [],
        tenantId?: string,
        category?: string,
        businessProfileId?: string,
        authorId?: string,
        hashtag?: string,
        limit = 15,
        cursor?: string,
    ) {
        const where: any = {
            isActive: true,
        };

        if (type) where.type = type;
        if (category) where.category = category;
        if (businessProfileId) {
            // Cross-tenant: a business profile page must show all its pinned posts
            // regardless of which workspace the author was in.
            where.businessProfileId = businessProfileId;
            where.__ignoreTenant = true;
        }

        // Normalise once so HASHTAG handling and the post-feed filter below
        // can both reuse the canonical form (stored as lower-case-ish in DB).
        const normalizedHashtag = typeof hashtag === 'string'
            ? hashtag.replace(/^#+/, '').trim().toLowerCase()
            : '';

        if (feedType === 'HASHTAG') {
            if (!normalizedHashtag) return this.emptyFeedPage();
            where.hashtags = { has: normalizedHashtag };
            where.__ignoreTenant = true;
        } else if (feedType === 'AUTHOR') {
            if (!authorId) return this.emptyFeedPage();
            where.authorId = authorId;
            where.__ignoreTenant = true;
        } else if (feedType === 'MY') {
            where.authorId = userId;
        } else if (feedType === 'FOLLOWING') {
            where.authorId = { in: followingIds };
            // First-pass DB filter: drop anything not intended for a follower
            // audience. CONTACTS results are further narrowed below to only
            // authors who follow the viewer back.
            where.visibility = { in: ['PUBLIC', 'FOLLOWERS', 'CONTACTS'] };
        } else if (feedType === 'FORYOU') {
            // Unified "For You" feed: PUBLIC posts from anyone PLUS posts from
            // authors the viewer follows (incl. their FOLLOWERS/CONTACTS posts).
            // This collapses what the client previously did as 4 separate calls
            // (PUBLIC+FOLLOWING × threads+flares) into ONE ordered query. Type is
            // left unset so threads AND flares are returned together. Tenant
            // scoping matches the existing PUBLIC/FOLLOWING feeds (no
            // __ignoreTenant), and the per-author visibility pass below still
            // enforces gating — so a followed author's FOLLOWERS/CONTACTS post is
            // only kept when the relationship actually permits it.
            where.OR = [
                { visibility: 'PUBLIC' },
                ...(followingIds.length
                    ? [{ authorId: { in: followingIds }, visibility: { in: ['PUBLIC', 'FOLLOWERS', 'CONTACTS'] } }]
                    : []),
            ];
        } else if (feedType === 'SAVED') {
            where.__ignoreTenant = true;
            where.interactions = {
                some: {
                    userId,
                    type: 'SAVE'
                }
            };
        } else if (feedType === 'RESHARE') {
            where.authorId = userId;
            where.parentId = { not: null };
        } else {
            where.visibility = 'PUBLIC';
        }

        // ---- P1 feed page cache ------------------------------------------
        // Only the *first* page of the hot read-only feeds (PUBLIC / HASHTAG)
        // is cached, and the key includes the viewer id so per-user
        // personalization (visibility filtering + like/save flags) is never
        // shared across accounts. Short TTL keeps it effectively real-time
        // while absorbing repeated reads (tab re-entry, pull-to-refresh).
        const isFirstPage = !cursor;
        const feedCacheable =
            isFirstPage &&
            !businessProfileId &&
            (feedType === 'PUBLIC' || feedType === 'HASHTAG');
        const feedCacheKey = feedCacheable
            ? [
                  'feed',
                  feedType,
                  type || 'ALL',
                  feedType === 'HASHTAG' ? 'GLOBAL' : tenantId || 'GLOBAL',
                  category || '',
                  normalizedHashtag || '',
                  userId || 'anon',
              ].join(':')
            : null;
        if (feedCacheKey) {
            const hit = await this.cache.getJson<{
                items: any[];
                nextCursor: string | null;
                hasMore: boolean;
            }>(feedCacheKey);
            if (hit) return hit;
        }
        const FEED_PAGE_TTL = 15;

        const pageSize = Math.min(Math.max(Number(limit) || 15, 1), 20);
        const needCount = pageSize + 1;
        const skipVisibilityPass =
            !userId ||
            !!businessProfileId ||
            feedType === 'MY' ||
            feedType === 'RESHARE' ||
            feedType === 'SAVED';

        let followers = new Set<string>();
        let followingSet = new Set(followingIds);
        if (userId && !skipVisibilityPass) {
            followers = await this.fetchFollowersOf(userId);
            followingSet = new Set(followingIds);
        }

        const collected: any[] = [];
        let scanCursor = this.decodeFeedCursor(cursor);
        const maxScans = 6;

        for (let scan = 0; scan < maxScans && collected.length < needCount; scan++) {
            const batch = await this.prisma.reader.blog.findMany({
                where: this.applyFeedCursor(where, scanCursor),
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: Math.max(pageSize * 3, 30),
                include: this.blogListInclude(userId) as any,
            });

            if (!batch.length) break;

            scanCursor = {
                createdAt: batch[batch.length - 1].createdAt,
                id: batch[batch.length - 1].id,
            };

            let visible = batch;
            if (!skipVisibilityPass && userId) {
                const authorIds = batch.map((b: any) => b.authorId).filter(Boolean);
                const authorVisibilities = await this.fetchAuthorVisibilities(authorIds);
                visible = batch.filter((b: any) => {
                    if (!this.canSee(
                        b.visibility, b.authorId, userId,
                        followingSet, followers, b.businessProfileId,
                    )) {
                        return false;
                    }
                    if (b.businessProfileId || b.authorId === userId) return true;
                    const authorVis = authorVisibilities[b.authorId] || 'GLOBAL';
                    if (authorVis === 'GLOBAL') return true;
                    if (authorVis === 'FOLLOWERS') return followingSet.has(b.authorId);
                    if (authorVis === 'CONTACTS') {
                        return followingSet.has(b.authorId) && followers.has(b.authorId);
                    }
                    return true;
                });
            }

            collected.push(...visible);
            if (batch.length < Math.max(pageSize * 3, 30)) break;
        }

        const hasMore = collected.length > pageSize;
        const page = collected.slice(0, pageSize);
        const authorIds = [...new Set(page.map((b: any) => b.authorId).filter(Boolean))] as string[];
        const avatars = await this.fetchAuthorAvatars(authorIds);
        const pageWithAvatars = this.enrichBlogsWithAuthorAvatars(page, avatars);

        if (!userId) {
            const anonResult = {
                items: pageWithAvatars.map((b) => this.toFeedItem(b)),
                nextCursor: hasMore && page.length ? this.encodeFeedCursor(page[page.length - 1]) : null,
                hasMore,
            };
            if (feedCacheKey) await this.cache.setJson(feedCacheKey, anonResult, FEED_PAGE_TTL);
            return anonResult;
        }

        const blogIds = pageWithAvatars.map((b) => b.id);
        const interactions = blogIds.length
            ? await (this.prisma.reader as any).blogInteraction.findMany({
                where: {
                    blogId: { in: blogIds },
                    userId,
                    type: { in: ['LIKE', 'SAVE', 'RESHARE'] },
                    tenantId,
                },
            })
            : [];

        const likedBlogIds = new Set(
            interactions.filter((i: any) => i.type === 'LIKE').map((i: any) => i.blogId),
        );
        const savedBlogIds = new Set(
            interactions.filter((i: any) => i.type === 'SAVE').map((i: any) => i.blogId),
        );
        const resharedBlogIds = new Set(
            interactions.filter((i: any) => i.type === 'RESHARE').map((i: any) => i.blogId),
        );

        const items = pageWithAvatars.map((blog) =>
            this.toFeedItem({
                ...blog,
                liked: likedBlogIds.has(blog.id),
                saved: savedBlogIds.has(blog.id),
                reshared: resharedBlogIds.has(blog.id),
            }),
        );

        const result = {
            items,
            nextCursor: hasMore && pageWithAvatars.length ? this.encodeFeedCursor(pageWithAvatars[pageWithAvatars.length - 1]) : null,
            hasMore,
        };
        if (feedCacheKey) await this.cache.setJson(feedCacheKey, result, FEED_PAGE_TTL);
        return result;
    }

    async createBlog(authorId: string, data: any, tenantId: string) {
        // Validate required inputs early with a friendly, surfaced error
        // (otherwise Prisma throws a long unfriendly "Missing required field"
        // string that bubbles up as a generic 500 to the client).
        if (!authorId) {
            throw new BadRequestException('Missing user (x-user-id header). Please re-login.');
        }
        if (!tenantId) {
            throw new BadRequestException('Missing tenant scope. Switch to a community first.');
        }
        if (!data || typeof data !== 'object') {
            throw new BadRequestException('Empty body. Cannot create flare/thread.');
        }

        try {
            let pollId: string | undefined;

            if (data.poll) {
                const poll = await (this.prisma.client as any).blogPoll.create({
                    data: {
                        tenantId,
                        question: data.poll.question,
                        expiresAt: new Date(Date.now() + (data.poll.durationDays || 7) * 24 * 60 * 60 * 1000),
                        options: {
                            create: (data.poll.options || []).map((opt: string) => ({
                                tenantId,
                                text: opt,
                            })),
                        },
                    },
                });
                pollId = poll.id;
            }

            const mediaUrls: string[] = Array.isArray(data.mediaUrls)
                ? data.mediaUrls.filter((u: any) => typeof u === 'string' && u.length > 0)
                : [];

            // Only include fields that exist in the Prisma schema. Frontends
            // occasionally pass extras (like `visibilities`, `tenantId`) which
            // would cause Prisma to throw "Unknown arg".
            const blogData: any = {
                title: data.title || (data.content ? String(data.content).substring(0, 50) : 'Untitled'),
                content: data.content || '',
                authorId,
                authorName: data.authorName || 'Anonymous',
                authorAvatar: data.authorAvatar || null,
                location: data.location || null,
                isVerified: !!data.isVerified,
                category: data.category || null,
                musicName: data.musicName || 'Original Audio',
                musicId: data.musicId || null,
                type: data.type || 'THREAD',
                mediaUrls,
                mediaType: data.mediaType || 'IMAGE',
                tags: Array.isArray(data.tags) ? data.tags : [],
                // Normalise hashtags to lower-case, leading-# stripped, deduped,
                // capped at a sensible length. Storing in canonical form means
                // the HASHTAG feed (`hashtags: { has: tag }`) and the suggest
                // endpoint (which builds counts in memory) agree on the same
                // representation and case-insensitive matching just works.
                hashtags: (() => {
                    if (!Array.isArray(data.hashtags)) return [];
                    const seen = new Set<string>();
                    const out: string[] = [];
                    for (const raw of data.hashtags) {
                        if (typeof raw !== 'string') continue;
                        const tag = raw.replace(/^#+/, '').trim().toLowerCase();
                        if (!tag || tag.length > 50) continue;
                        if (seen.has(tag)) continue;
                        seen.add(tag);
                        out.push(tag);
                        if (out.length >= 12) break;
                    }
                    return out;
                })(),
                visibility: VALID_VISIBILITIES.has(String(data.visibility))
                    ? data.visibility
                    : 'PUBLIC',
                targetCommunities: Array.isArray(data.targetCommunities) ? data.targetCommunities : [],
                audioUrl: data.audioUrl || null,
                businessProfileId: data.businessProfileId || null,
                commentsEnabled: data.commentsEnabled !== undefined ? !!data.commentsEnabled : true,
            };

            if (pollId) {
                blogData.poll = {
                    connect: { id_tenantId: { id: pollId, tenantId } },
                };
            }

            const hasMediaAssets =
                Array.isArray(data.mediaAssets) && data.mediaAssets.length > 0;

            if (hasMediaAssets) {
                blogData.mediaUrls = [];
                blogData.mediaStatus = 'PROCESSING';
            }

            const blog = await (this.prisma.client as any).blog.create({
                data: blogData,
                include: {
                    poll: {
                        include: {
                            options: { include: { _count: { select: { votes: true } } } },
                        },
                    },
                    mediaAssets: true,
                },
            });

            if (hasMediaAssets) {
                await this.mediaService.attachMediaAssetsToBlog(
                    tenantId,
                    authorId,
                    blog.id,
                    blog.type === 'FLARE' ? 'FLARE' : 'THREAD',
                    data.mediaAssets.map((m: any) => ({
                        sourceKey: m.sourceKey || m.key,
                        kind: m.kind === 'IMAGE' ? 'IMAGE' : 'VIDEO',
                    })),
                );
                const refreshed = await (this.prisma.client as any).blog.findFirst({
                    where: { id: blog.id, tenantId },
                    include: { poll: true, mediaAssets: true },
                });
                if (refreshed) return refreshed;
            }

            if (data.tags && data.tags.length > 0) {
                const notificationBase =
                    process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005';
                const internalSecret = process.env.INTERNAL_SERVICE_SECRET;
                for (const taggedUserId of data.tags) {
                    try {
                        await firstValueFrom(this.http.post(
                            `${notificationBase}/send`,
                            {
                                userId: taggedUserId,
                                title: 'You were tagged in a blog',
                                body: `A new blog post titled "${blog.title}" tagged you.`,
                                data: { type: 'CHAT' },
                            },
                            internalSecret
                                ? { headers: { 'x-internal-secret': internalSecret } }
                                : undefined,
                        ));
                    } catch (e: any) {
                        console.error('Failed to notify tagged user', taggedUserId, e?.message);
                    }
                }
            }

            return blog;
        } catch (err: any) {
            // Surface the actual underlying reason to the client so the mobile
            // app's "Publish Failed" alert is actionable instead of a generic
            // "internal server error".
            const code = err?.code;
            const meta = err?.meta;
            console.error('[createBlog] failed', {
                code,
                meta,
                msg: err?.message,
                tenantId,
                authorId,
                payloadKeys: Object.keys(data || {}),
            });
            if (err instanceof BadRequestException) throw err;
            // Prisma's "Unknown argument" usually means schema drift — surface it.
            if (typeof err?.message === 'string' && err.message.includes('Unknown arg')) {
                throw new BadRequestException(
                    'Server schema mismatch while saving the post. Please try again in a moment.',
                );
            }
            throw new InternalServerErrorException(
                err?.message || 'Failed to save the flare/thread. Please try again.',
            );
        }
    }

    async getBlog(id: string, viewerId?: string) {
        const blog = await (this.prisma.reader as any).blog.findFirst({
            where: { id, __ignoreTenant: true },
            include: {
                poll: {
                    include: {
                        options: {
                            include: {
                                _count: {
                                    select: { votes: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!blog) return null;

        // Anyone with the post ID could otherwise read a CONTACTS / FOLLOWERS
        // post just by guessing the URL — enforce the same visibility rules
        // used by the feed for single fetches too.
        if (viewerId && viewerId !== blog.authorId && !blog.businessProfileId) {
            if (blog.visibility === 'CONTACTS' || blog.visibility === 'FOLLOWERS') {
                const [following, followers] = await Promise.all([
                    firstValueFrom(
                        this.http.get(`http://auth-service:3001/follow/following/${viewerId}`),
                    ).catch(() => ({ data: [] as any[] })),
                    this.fetchFollowersOf(viewerId),
                ]);
                const followingSet = new Set<string>(
                    ((following as any)?.data || [])
                        .map((r: any) => r?.followingId as string | undefined)
                        .filter((id): id is string => typeof id === 'string' && id.length > 0),
                );
                const allowed = this.canSee(
                    blog.visibility,
                    blog.authorId,
                    viewerId,
                    followingSet,
                    followers,
                    blog.businessProfileId,
                );
                if (!allowed) {
                    throw new NotFoundException('Blog not found');
                }
            } else if (blog.visibility !== 'PUBLIC') {
                throw new NotFoundException('Blog not found');
            }
        }

        return this.decorateMedia(blog);
    }

    async votePoll(pollId: string, optionId: string, userId: string, tenantId: string) {
        // Check if already voted
        const existing = await (this.prisma.reader as any).blogPollVote.findFirst({
            where: { pollId, userId, tenantId }
        });

        if (existing) {
            throw new Error('Already voted in this poll');
        }

        return (this.prisma.client as any).blogPollVote.create({
            data: {
                pollId,
                optionId,
                userId,
                tenantId
            }
        });
    }

    async updateBlog(id: string, data: any, userId: string, tenantId: string) {
        await this.assertBlogOwnership(id, userId, tenantId);
        // Never allow the caller to reassign ownership/tenant via the body.
        const safe = { ...(data || {}) };
        delete safe.authorId;
        delete safe.tenantId;
        delete safe.id;
        return (this.prisma.client as any).blog.update({
            where: { id, tenantId },
            data: safe,
        });
    }

    async deleteBlog(id: string, userId: string, tenantId: string) {
        await this.assertBlogOwnership(id, userId, tenantId);
        return (this.prisma.client as any).blog.update({
            where: { id, tenantId },
            data: { isActive: false },
        });
    }

    private async assertBlogOwnership(id: string, userId: string, tenantId: string) {
        if (!userId) throw new ForbiddenException('Authentication required');
        const blog = await (this.prisma.reader as any).blog.findFirst({
            where: { id, tenantId },
            select: { authorId: true },
        });
        if (!blog) throw new NotFoundException('Post not found');
        if (blog.authorId !== userId) {
            throw new ForbiddenException('You can only modify your own posts');
        }
    }

    async generateUploadUrl(tenantId: string, userId: string, fileName: string, contentType: string, blogType: 'THREAD' | 'FLARE', mediaType: 'IMAGE' | 'VIDEO') {
        return this.storage.generatePresignedUrl(fileName, contentType, tenantId, userId, blogType, mediaType);
    }

    /**
     * Suggest matching hashtags for the search dropdowns on ThreadScreen /
     * FlaresScreen. Hashtags are stored as a Postgres `text[]` on each Blog
     * row (`hashtags String[]`), so we pull a window of recently-active
     * posts, flatten + dedupe their tags, and return up to 12 that match
     * the prefix/substring `q`. Restricting by `type` keeps THREAD-only
     * tags out of the FLARE picker and vice versa.
     *
     * Returned shape is intentionally a flat list:
     *   [{ tag: 'summer', count: 42 }, ...]
     * sorted by count desc, then alphabetically.
     */
    async suggestHashtags(q: string, type?: 'THREAD' | 'FLARE') {
        const query = (q || '').replace(/^#+/, '').trim().toLowerCase();
        if (!query || query.length < 1) return [];

        const where: any = {
            isActive: true,
            hashtags: { isEmpty: false },
            // Hashtags are global by nature — a #summer post in another
            // workspace should still surface when the user searches for it.
            __ignoreTenant: true,
            // Only consider PUBLIC posts when feeding the suggest dropdown
            // so we never leak a hashtag that was only used inside a
            // FOLLOWERS-only or CONTACTS-only post.
            visibility: 'PUBLIC',
        };
        if (type) where.type = type;

        // Pull a recent window. We dedupe in memory so we don't depend on a
        // Prisma `distinct` against an array column (which Postgres can't
        // express directly without a custom raw query).
        const rows = await this.prisma.reader.blog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: { hashtags: true },
            take: 500,
        });

        const counts = new Map<string, number>();
        for (const row of rows) {
            const tags: string[] = Array.isArray((row as any).hashtags) ? (row as any).hashtags : [];
            for (const raw of tags) {
                if (typeof raw !== 'string') continue;
                const tag = raw.replace(/^#+/, '').trim().toLowerCase();
                if (!tag) continue;
                if (!tag.includes(query)) continue;
                counts.set(tag, (counts.get(tag) || 0) + 1);
            }
        }

        return Array.from(counts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                // Prefer prefix matches over substring matches when counts tie.
                const aPrefix = a.tag.startsWith(query) ? 0 : 1;
                const bPrefix = b.tag.startsWith(query) ? 0 : 1;
                if (aPrefix !== bPrefix) return aPrefix - bPrefix;
                return a.tag.localeCompare(b.tag);
            })
            .slice(0, 12);
    }

    async toggleLike(blogId: string, userId: string, tenantId: string) {
        const existing = await (this.prisma.reader as any).blogInteraction.findFirst({
            where: { blogId, userId, type: 'LIKE', tenantId }
        });

        if (existing) {
            await (this.prisma.client as any).$transaction([
                (this.prisma.client as any).blogInteraction.delete({ where: { id: existing.id } }),
                (this.prisma.client as any).blog.update({ where: { id: blogId }, data: { likesCount: { decrement: 1 } } })
            ]);
            return { liked: false };
        } else {
            await (this.prisma.client as any).$transaction([
                (this.prisma.client as any).blogInteraction.create({ data: { blogId, userId, type: 'LIKE', tenantId } }),
                (this.prisma.client as any).blog.update({ where: { id: blogId }, data: { likesCount: { increment: 1 } } })
            ]);
            return { liked: true };
        }
    }

    async addComment(blogId: string, userId: string, data: { content: string; userName: string; userAvatar?: string; poll?: any }, tenantId: string) {
        let pollId = undefined;
        if (data.poll) {
            const poll = await (this.prisma.client as any).blogPoll.create({
                data: {
                    tenantId,
                    question: data.poll.question,
                    expiresAt: new Date(Date.now() + (data.poll.durationDays || 7) * 24 * 60 * 60 * 1000),
                    options: {
                        create: data.poll.options.map((opt: string) => ({
                            tenantId,
                            text: opt
                        }))
                    }
                }
            });
            pollId = poll.id;
        }

        const comment = await (this.prisma.client as any).blogComment.create({
            data: {
                blogId,
                userId,
                userName: data.userName,
                userAvatar: data.userAvatar,
                content: data.content,
                tenantId,
                pollId
            }
        });

        await (this.prisma.client as any).blog.update({
            where: { id: blogId },
            data: { commentsCount: { increment: 1 } }
        });

        // Fetch complete comment with poll for broadcasting
        const completeComment = await (this.prisma.reader as any).blogComment.findUnique({
            where: { id: comment.id },
            include: {
                poll: {
                    include: {
                        options: {
                            include: {
                                _count: { select: { votes: true } }
                            }
                        }
                    }
                }
            }
        });

        this.flareGateway.broadcastComment(blogId, completeComment);

        return completeComment;
    }

    async getComments(blogId: string, userId?: string, skip = 0, take = 50) {
        const safeTake = Math.min(Math.max(take, 1), 100);
        return (this.prisma.reader as any).blogComment.findMany({
            where: { blogId },
            include: {
                poll: {
                    include: {
                        options: {
                            include: {
                                _count: { select: { votes: true } }
                            }
                        },
                        votes: userId ? {
                            where: { userId }
                        } : false
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: Math.max(skip, 0),
            take: safeTake,
        });
    }

    async reshare(blogId: string, userId: string) {
        await (this.prisma.client as any).blog.update({
            where: { id: blogId },
            data: { resharesCount: { increment: 1 } }
        });
        // We could also create an interaction record here if we want to track who reshared
        return { success: true };
    }

    async toggleSave(blogId: string, userId: string, tenantId: string) {
        const existing = await (this.prisma.reader as any).blogInteraction.findFirst({
            where: { blogId, userId, type: 'SAVE', tenantId }
        });

        if (existing) {
            await (this.prisma.client as any).$transaction([
                (this.prisma.client as any).blogInteraction.delete({ 
                    where: { 
                        id_tenantId: { id: existing.id, tenantId } 
                    } 
                }),
                (this.prisma.client as any).blog.update({ where: { id: blogId }, data: { savesCount: { decrement: 1 } } })
            ]);
            return { saved: false };
        } else {
            await (this.prisma.client as any).$transaction([
                (this.prisma.client as any).blogInteraction.create({ 
                    data: { blogId, userId, type: 'SAVE', tenantId } 
                }),
                (this.prisma.client as any).blog.update({ where: { id: blogId }, data: { savesCount: { increment: 1 } } })
            ]);
            return { saved: true };
        }
    }

    async reshareBlog(blogId: string, userId: string, tenantId: string, userData?: any) {
        const original = await (this.prisma.reader as any).blog.findFirst({
            where: { id: blogId, __ignoreTenant: true }
        });

        if (!original) throw new NotFoundException('Original flare not found');

        // Check if already reshared by this user
        const existing = await (this.prisma.reader as any).blog.findFirst({
            where: {
                parentId: blogId,
                authorId: userId,
                tenantId: tenantId
            }
        });

        if (existing) {
            // UN-RESHARE: Delete the reshare, delete interaction, and decrement count
            await Promise.all([
                (this.prisma.client as any).blog.delete({ where: { id: existing.id } }),
                (this.prisma.client as any).blogInteraction.deleteMany({
                    where: {
                        blogId: blogId,
                        userId: userId,
                        type: 'RESHARE'
                    }
                }),
                (this.prisma.client as any).blog.update({ 
                    where: { id: blogId, __ignoreTenant: true }, 
                    data: { resharesCount: { decrement: 1 } } 
                })
            ]);
            return { reshared: false };
        } else {
            // 1. Create the reshared blog post
            const reshare = await (this.prisma.client as any).blog.create({
                data: {
                    title: original.title,
                    content: original.content,
                    type: original.type,
                    visibility: 'PUBLIC', // Reshares are typically public in this context
                    mediaUrls: original.mediaUrls,
                    mediaType: original.mediaType,
                    category: original.category,
                    authorId: userId,
                    tenantId: tenantId,
                    authorName: userData?.authorName || "Anonymous",
                    authorAvatar: userData?.authorAvatar,
                    parentId: blogId,
                    isActive: true,
                    musicName: original.musicName,
                    musicId: original.musicId,
                    location: original.location
                }
            });

            // 2. Track interaction and increment count
            try {
                await (this.prisma.client as any).$transaction([
                    (this.prisma.client as any).blogInteraction.create({
                        data: {
                            blogId: blogId,
                            userId: userId,
                            type: 'RESHARE',
                            tenantId: original.tenantId
                        }
                    }),
                    (this.prisma.client as any).blog.update({
                        where: { id: blogId, __ignoreTenant: true },
                        data: { resharesCount: { increment: 1 } }
                    })
                ]);
            } catch (e) {
                console.error('Failed to track reshare interaction', e);
            }

            return { reshared: true, reshare };
        }
    }
}
