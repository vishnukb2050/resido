import { Injectable, NotFoundException } from '@nestjs/common';
import { FlareGateway } from './flare.gateway';
import { PrismaService } from '../prisma/tenant-prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { StorageService } from '../storage/storage.service';

@Injectable()
export class BlogsService {
    constructor(
        private prisma: PrismaService,
        private http: HttpService,
        private storage: StorageService,
        private flareGateway: FlareGateway
    ) {}

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
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) return trimmed;
        return this.storage.buildPublicUrl(trimmed);
    }

    private decorateMedia<T extends { mediaUrls?: string[] | null; audioUrl?: string | null }>(blog: T): T {
        const resolvedMedia = (blog.mediaUrls || []).map(u => this.resolveMediaValue(u)).filter(Boolean) as string[];
        const resolvedAudio = blog.audioUrl ? this.resolveMediaValue(blog.audioUrl) : null;
        return { ...blog, mediaUrls: resolvedMedia, audioUrl: resolvedAudio } as T;
    }

    async listBlogs(
        type?: 'THREAD' | 'FLARE',
        userId?: string,
        feedType: 'PUBLIC' | 'FOLLOWING' | 'MY' | 'SAVED' | 'RESHARE' = 'PUBLIC',
        followingIds: string[] = [],
        tenantId?: string,
        category?: string,
        businessProfileId?: string,
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

        if (feedType === 'MY') {
            where.authorId = userId;
        } else if (feedType === 'FOLLOWING') {
            where.authorId = { in: followingIds };
            // Enforce visibility: only show what the author intended for followers/contacts
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

        const blogs = await this.prisma.reader.blog.findMany({
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

        const blogData: any = {
            title: data.title || (data.content ? data.content.substring(0, 50) : "Untitled"),
            content: data.content || "",
            authorId,
            authorName: data.authorName || "Anonymous",
            authorAvatar: data.authorAvatar,
            location: data.location,
            isVerified: data.isVerified || false,
            musicName: data.musicName || "Original Audio",
            musicId: data.musicId || null,
            type: data.type || 'THREAD',
            mediaUrls: data.mediaUrls || [],
            mediaType: data.mediaType || 'IMAGE',
            tags: data.tags || [],
            hashtags: data.hashtags || [],
            visibility: data.visibility || 'PUBLIC',
            targetCommunities: data.targetCommunities || [],
            audioUrl: data.audioUrl || null,
            businessProfileId: data.businessProfileId || null,
            commentsEnabled: data.commentsEnabled !== undefined ? data.commentsEnabled : true
        };

        if (pollId) {
            blogData.poll = {
                connect: {
                    id_tenantId: { id: pollId, tenantId }
                }
            };
        }

        const blog = await (this.prisma.client as any).blog.create({
            data: blogData,
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

        // Notify tagged users
        if (data.tags && data.tags.length > 0) {
            for (const taggedUserId of data.tags) {
                try {
                    await firstValueFrom(this.http.post('http://notification-service:3005/notifications/send', {
                        userId: taggedUserId,
                        title: 'You were tagged in a blog',
                        body: `A new blog post titled "${blog.title}" tagged you.`,
                        type: 'CHAT' // Reuse CHAT type or add BLOG type
                    }));
                } catch (e) {
                    console.error('Failed to notify tagged user', taggedUserId, e.message);
                }
            }
        }

        return blog;
    }

    async getBlog(id: string) {
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
