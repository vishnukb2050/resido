import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class NotesService {
    constructor(private prisma: PrismaService) {}

    async getMyFolders(memberId: string, tenantId: string) {
        return this.prisma.client.noteFolder.findMany({
            where: { ownerId: memberId, tenantId },
            include: { _count: { select: { notes: true } } },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async getSharedFolders(memberId: string, tenantId: string) {
        const memberGroups = await this.prisma.client.groupMember.findMany({
            where: { memberId, tenantId },
            select: { groupId: true }
        });
        const groupIds = memberGroups.map(g => g.groupId);

        return this.prisma.client.noteFolder.findMany({
            where: {
                tenantId,
                permissions: {
                    some: {
                        OR: [
                            { memberId },
                            { groupId: { in: groupIds } }
                        ]
                    }
                }
            },
            include: { 
                owner: { select: { name: true } },
                _count: { select: { notes: true } } 
            }
        });
    }

    async createFolder(memberId: string, tenantId: string, data: any) {
        return this.prisma.client.noteFolder.create({
            data: {
                ...data,
                ownerId: memberId,
                tenantId
            }
        });
    }

    async getFolderNotes(folderId: string, tenantId: string) {
        return this.prisma.client.note.findMany({
            where: { folderId, tenantId },
            orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }]
        });
    }

    async createNote(memberId: string, tenantId: string, data: any) {
        return this.prisma.client.note.create({
            data: {
                ...data,
                ownerId: memberId,
                tenantId
            }
        });
    }

    async updateNote(noteId: string, tenantId: string, data: any) {
        return this.prisma.client.note.update({
            where: { id: noteId, tenantId },
            data
        });
    }

    async shareItem(tenantId: string, data: { noteId?: string, folderId?: string, memberIds?: string[], groupIds?: string[], accessLevel: string }) {
        const { noteId, folderId, memberIds, groupIds, accessLevel } = data;
        const permissions: any[] = [];

        if (memberIds) {
            memberIds.forEach(mId => {
                permissions.push({
                    tenantId,
                    noteId,
                    folderId,
                    memberId: mId,
                    accessLevel: accessLevel as any
                });
            });
        }

        if (groupIds) {
            groupIds.forEach(gId => {
                permissions.push({
                    tenantId,
                    noteId,
                    folderId,
                    groupId: gId,
                    accessLevel: accessLevel as any
                });
            });
        }

        return this.prisma.client.notePermission.createMany({
            data: permissions
        });
    }
}
