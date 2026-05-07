import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotesService {
    constructor(private prisma: PrismaService) {}

    // Folders
    async listFolders(userId: string) {
        return this.prisma.userRead.noteFolder.findMany({
            where: { userId },
            include: { pages: true },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async createFolder(userId: string, name: string) {
        return this.prisma.userClient.noteFolder.create({
            data: { userId, name }
        });
    }

    async deleteFolder(userId: string, id: string) {
        return this.prisma.userClient.noteFolder.delete({
            where: { id, userId }
        });
    }

    // Pages
    async listPages(folderId: string) {
        return this.prisma.userRead.notePage.findMany({
            where: { folderId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async createPage(folderId: string, data: any) {
        return this.prisma.userClient.notePage.create({
            data: { ...data, folderId }
        });
    }

    async updatePage(id: string, data: any) {
        return this.prisma.userClient.notePage.update({
            where: { id },
            data
        });
    }

    async deletePage(id: string) {
        return this.prisma.userClient.notePage.delete({
            where: { id }
        });
    }

    // Sharing
    async shareNote(userId: string, data: { folderId?: string; pageId?: string; targetType: any; targetId: string }) {
        return this.prisma.userClient.noteShare.create({
            data: {
                userId,
                folderId: data.folderId,
                pageId: data.pageId,
                targetType: data.targetType,
                targetId: data.targetId
            }
        });
    }

    async listShares(userId: string) {
        return this.prisma.userRead.noteShare.findMany({
            where: { userId },
            include: { folder: true, page: true }
        });
    }
}
