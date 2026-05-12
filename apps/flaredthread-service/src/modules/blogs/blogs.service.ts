import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { StorageService } from '../storage/storage.service';

@Injectable()
export class BlogsService {
    constructor(
        private prisma: PrismaService,
        private http: HttpService,
        private storage: StorageService
    ) {}

    async listBlogs(type?: 'THREAD' | 'FLARE', userId?: string, feedType: 'PUBLIC' | 'FOLLOWING' | 'MY' = 'PUBLIC', followingIds: string[] = [], tenantId?: string) {
        const where: any = {
            isActive: true,
            tenantId, // Strict tenant isolation
        };

        if (type) where.type = type;

        if (feedType === 'MY') {
            where.authorId = userId;
        } else if (feedType === 'FOLLOWING') {
            where.authorId = { in: followingIds };
            // Optional: Include public flares from non-following? 
            // Usually FOLLOWING tab is strict.
        } else {
            // PUBLIC feed
            where.visibility = 'PUBLIC';
        }

        const blogs = await this.prisma.reader.blog.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        if (!userId) return blogs;

        // Fetch user's interactions (likes) for these blogs
        const blogIds = blogs.map(b => b.id);
        const interactions = await (this.prisma.reader as any).interaction.findMany({
            where: {
                blogId: { in: blogIds },
                userId: userId,
                type: 'LIKE',
                tenantId // Ensure interaction is for this tenant
            }
        });

        const likedBlogIds = new Set(interactions.map((i: any) => i.blogId));

        return blogs.map(blog => ({
            ...blog,
            liked: likedBlogIds.has(blog.id)
        }));
    }

    async createBlog(authorId: string, data: any, tenantId: string) {
        const blog = await this.prisma.client.blog.create({
            data: { 
                ...data, 
                authorId,
                tenantId, // Explicitly save tenantId
                authorName: data.authorName,
                authorAvatar: data.authorAvatar,
                location: data.location,
                isVerified: data.isVerified || false,
                musicName: data.musicName || "Original Audio",
                musicId: data.musicId || null,
                type: data.type || 'THREAD',
                mediaType: data.mediaType || 'IMAGE',
                tags: data.tags || [],
                hashtags: data.hashtags || [],
                visibility: data.visibility || 'PUBLIC',
                targetCommunities: data.targetCommunities || [],
                commentsEnabled: data.commentsEnabled !== undefined ? data.commentsEnabled : true
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
        return this.prisma.reader.blog.findUnique({ where: { id } });
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
        const existing = await (this.prisma.reader as any).interaction.findFirst({
            where: { blogId, userId, type: 'LIKE', tenantId }
        });

        if (existing) {
            await (this.prisma.client as any).$transaction([
                (this.prisma.client as any).interaction.delete({ where: { id: existing.id } }),
                (this.prisma.client as any).blog.update({ where: { id: blogId }, data: { likesCount: { decrement: 1 } } })
            ]);
            return { liked: false };
        } else {
            await (this.prisma.client as any).$transaction([
                (this.prisma.client as any).interaction.create({ data: { blogId, userId, type: 'LIKE', tenantId } }),
                (this.prisma.client as any).blog.update({ where: { id: blogId }, data: { likesCount: { increment: 1 } } })
            ]);
            return { liked: true };
        }
    }

    async addComment(blogId: string, userId: string, data: { content: string; userName: string; userAvatar?: string }, tenantId: string) {
        const comment = await (this.prisma.client as any).comment.create({
            data: {
                blogId,
                userId,
                userName: data.userName,
                userAvatar: data.userAvatar,
                content: data.content,
                tenantId
            }
        });

        await (this.prisma.client as any).blog.update({
            where: { id: blogId },
            data: { commentsCount: { increment: 1 } }
        });

        return comment;
    }

    async getComments(blogId: string) {
        return (this.prisma.reader as any).comment.findMany({
            where: { blogId },
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

    async toggleSave(blogId: string, userId: string) {
        const existing = await (this.prisma.reader as any).interaction.findFirst({
            where: { blogId, userId, type: 'SAVE' }
        });

        if (existing) {
            await (this.prisma.client as any).$transaction([
                (this.prisma.client as any).interaction.delete({ where: { id: existing.id } }),
                (this.prisma.client as any).blog.update({ where: { id: blogId }, data: { savesCount: { decrement: 1 } } })
            ]);
            return { saved: false };
        } else {
            await (this.prisma.client as any).$transaction([
                (this.prisma.client as any).interaction.create({ data: { blogId, userId, type: 'SAVE' } }),
                (this.prisma.client as any).blog.update({ where: { id: blogId }, data: { savesCount: { increment: 1 } } })
            ]);
            return { saved: true };
        }
    }
}
