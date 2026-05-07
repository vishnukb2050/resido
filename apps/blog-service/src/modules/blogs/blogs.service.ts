import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class BlogsService {
    constructor(private tenantPrisma: TenantPrismaService) {}

    async listBlogs(dbName: string) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.blog.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async createBlog(dbName: string, authorId: string, data: any) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        return prisma.blog.create({
            data: { ...data, authorId }
        });
    }

    async getBlog(dbName: string, id: string) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.blog.findUnique({ where: { id } });
    }

    async updateBlog(dbName: string, id: string, data: any) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        return prisma.blog.update({ where: { id }, data });
    }

    async deleteBlog(dbName: string, id: string) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        return prisma.blog.update({ where: { id }, data: { isActive: false } });
    }
}
