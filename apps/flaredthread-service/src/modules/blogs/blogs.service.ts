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

    async listBlogs() {
        return this.prisma.reader.blog.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async createBlog(authorId: string, data: any) {
        const blog = await this.prisma.client.blog.create({
            data: { 
                ...data, 
                authorId,
                type: data.type || 'THREAD',
                mediaType: data.mediaType || 'IMAGE',
                tags: data.tags || []
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

    async generateUploadUrl(tenantId: string, fileName: string, contentType: string, blogType: 'THREAD' | 'FLARE', mediaType: 'IMAGE' | 'VIDEO') {
        return this.storage.generatePresignedUrl(fileName, contentType, tenantId, blogType, mediaType);
    }
}
