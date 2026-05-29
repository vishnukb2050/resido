import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { FlareGateway } from './flare.gateway';
import { PrismaService } from '../prisma/tenant-prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { StorageService } from '../storage/storage.service';

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
        private flareGateway: FlareGateway
    ) {}

    /** Batch fetch of each author's profileVisibility from auth-service. */
    private async fetchAuthorVisibilities(authorIds: string[]): Promise<Record<string, string>> {
        const unique = Array.from(new Set(authorIds.filter(Boolean)));
        if (unique.length === 0) return {};
        try {
            const res = await firstValueFrom(
                this.http.get(
                    `http://auth-service:3001/profile/users/visibilities/batch?ids=${encodeURIComponent(unique.join(','))}`,
                ),
            );
            return (res?.data || {}) as Record<string, string>;
        } catch (err: any) {
            console.warn('[visibility] failed to fetch author visibilities', err?.message);
            return {};
        }
    }

    /**
     * Returns the set of user IDs that follow `viewerId`. Used to enforce
     * CONTACTS-visibility: a post tagged CONTACTS is only visible to people
     * the author has followed back (synced contacts auto-follow each other,
     * so mutual-follow is our best proxy for "in author's contact list").
     */
    private async fetchFollowersOf(viewerId: string): Promise<Set<string>> {
        if (!viewerId) return new Set();
        try {
            const res = await firstValueFrom(
                this.http.get(`http://auth-service:3001/follow/followers/${viewerId}`)
            );
            const rows: any[] = Array.isArray(res?.data) ? res.data : [];
            return new Set<string>(
                rows
                    .map((r) => r?.followerId)
                    .filter((id): id is string => typeof id === 'string' && id.length > 0),
            );
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

    private decorateMedia<T extends { mediaUrls?: string[] | null; audioUrl?: string | null; authorAvatar?: string | null }>(blog: T): T {
        const resolvedMedia = (blog.mediaUrls || []).map(u => this.resolveMediaValue(u)).filter(Boolean) as string[];
        const resolvedAudio = blog.audioUrl ? this.resolveMediaValue(blog.audioUrl) : null;
        const resolvedAvatar = blog.authorAvatar ? this.resolveMediaValue(blog.authorAvatar) : null;
        return {
            ...blog,
            mediaUrls: resolvedMedia,
            audioUrl: resolvedAudio,
            authorAvatar: resolvedAvatar,
        } as T;
    }

    async listBlogs(
        type?: 'THREAD' | 'FLARE',
        userId?: string,
        feedType: 'PUBLIC' | 'FOLLOWING' | 'MY' | 'SAVED' | 'RESHARE' | 'AUTHOR' = 'PUBLIC',
        followingIds: string[] = [],
        tenantId?: string,
        category?: string,
        businessProfileId?: string,
        authorId?: string,
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

        if (feedType === 'AUTHOR') {
            // Public profile / "posts by this user" view. Caller passes
            // authorId; per-post visibility is still enforced in the
            // second pass below (a non-follower won't see FOLLOWERS posts,
            // a non-contact won't see CONTACTS posts, etc.) so we can
            // safely include all the author's posts here at the DB level.
            if (!authorId) return [];
            where.authorId = authorId;
            // Cross-tenant: a profile page is global to the user's identity,
            // not scoped to a single community workspace.
            where.__ignoreTenant = true;
        } else if (feedType === 'MY') {
            where.authorId = userId;
        } else if (feedType === 'FOLLOWING') {
            where.authorId = { in: followingIds };
            // First-pass DB filter: drop anything not intended for a follower
            // audience. CONTACTS results are further narrowed below to only
            // authors who follow the viewer back.
            where.visibility = { in: ['PUBLIC', 'FOLLOWERS', 'CONTACTS'] };
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
            // PUBLIC feed - Global visibility
            where.visibility = 'PUBLIC';
        }

        let blogs = await this.prisma.reader.blog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                poll: {
                    include: {
                        options: {
                            include: {
                                _count: {
                                    select: { votes: true }
                                }
                            }
                        },
                        votes: userId ? {
                            where: { userId }
                        } : false
                    }
                }
            }
        });

        // Second-pass visibility enforcement — runs two checks:
        //   1) per-post visibility (PUBLIC / FOLLOWERS / CONTACTS)
        //   2) author's profileVisibility — a CONTACTS-only profile's posts
        //      are hidden from anyone who can't view that profile, even if
        //      the post itself is PUBLIC.
        // Skipped for MY/RESHARE/SAVED feeds and business-profile pages.
        if (
            userId &&
            !businessProfileId &&
            feedType !== 'MY' &&
            feedType !== 'RESHARE' &&
            feedType !== 'SAVED'
        ) {
            const followers = await this.fetchFollowersOf(userId);
            const followingSet = new Set(followingIds);
            const authorIds = blogs.map((b: any) => b.authorId).filter(Boolean);
            const authorVisibilities = await this.fetchAuthorVisibilities(authorIds);

            blogs = blogs.filter((b: any) => {
                // (a) per-post visibility
                if (!this.canSee(
                    b.visibility, b.authorId, userId,
                    followingSet, followers, b.businessProfileId,
                )) {
                    return false;
                }
                // (b) author profile-visibility gate (skip for self & business posts)
                if (b.businessProfileId || b.authorId === userId) return true;
                const authorVis = authorVisibilities[b.authorId] || 'GLOBAL';
                if (authorVis === 'GLOBAL') return true;
                if (authorVis === 'FOLLOWERS') return followingSet.has(b.authorId);
                if (authorVis === 'CONTACTS') return followingSet.has(b.authorId) && followers.has(b.authorId);
                // COMMUNITY is enforced at the profile screen; for now treat
                // it as visible-in-feed so posts surface within shared
                // workspaces (the post still respects its own visibility).
                return true;
            });
        }

        if (!userId) return blogs.map(b => this.decorateMedia(b));

        // Fetch user's interactions (likes) for these blogs
        const blogIds = blogs.map(b => b.id);
        const interactions = await (this.prisma.reader as any).blogInteraction.findMany({
            where: {
                blogId: { in: blogIds },
                userId: userId,
                type: { in: ['LIKE', 'SAVE', 'RESHARE'] },
                tenantId // Ensure interaction is for this tenant
            }
        });

        const likedBlogIds = new Set(interactions.filter((i: any) => i.type === 'LIKE').map((i: any) => i.blogId));
        const savedBlogIds = new Set(interactions.filter((i: any) => i.type === 'SAVE').map((i: any) => i.blogId));
        const resharedBlogIds = new Set(interactions.filter((i: any) => i.type === 'RESHARE').map((i: any) => i.blogId));

        return blogs.map(blog => this.decorateMedia({
            ...blog,
            liked: likedBlogIds.has(blog.id),
            saved: savedBlogIds.has(blog.id),
            reshared: resharedBlogIds.has(blog.id)
        }));
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
                hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
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

            const blog = await (this.prisma.client as any).blog.create({
                data: blogData,
                include: {
                    poll: {
                        include: {
                            options: { include: { _count: { select: { votes: true } } } },
                        },
                    },
                },
            });

            if (data.tags && data.tags.length > 0) {
                for (const taggedUserId of data.tags) {
                    try {
                        await firstValueFrom(this.http.post('http://notification-service:3005/notifications/send', {
                            userId: taggedUserId,
                            title: 'You were tagged in a blog',
                            body: `A new blog post titled "${blog.title}" tagged you.`,
                            type: 'CHAT',
                        }));
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

    async updateBlog(id: string, data: any) {
        return this.prisma.client.blog.update({ where: { id }, data });
    }

    async deleteBlog(id: string) {
        return this.prisma.client.blog.update({ where: { id }, data: { isActive: false } });
    }

    async generateUploadUrl(tenantId: string, userId: string, fileName: string, contentType: string, blogType: 'THREAD' | 'FLARE', mediaType: 'IMAGE' | 'VIDEO') {
        return this.storage.generatePresignedUrl(fileName, contentType, tenantId, userId, blogType, mediaType);
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

    async getComments(blogId: string, userId?: string) {
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
            orderBy: { createdAt: 'desc' }
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
