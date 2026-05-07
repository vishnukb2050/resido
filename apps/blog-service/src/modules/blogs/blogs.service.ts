import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class BlogsService {
    constructor(private prisma: PrismaService) {}

    async listBlogs() {
        return this.prisma.reader.blog.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async createBlog(authorId: string, data: any) {
        return this.prisma.client.blog.create({
            data: { ...data, authorId }
        });
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
}
