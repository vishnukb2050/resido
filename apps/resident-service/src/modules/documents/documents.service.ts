import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class DocumentsService {
    constructor(private prisma: PrismaService) {}

    async getMyFolders(memberId: string, tenantId: string) {
        return this.prisma.client.docFolder.findMany({
            where: { ownerId: memberId, tenantId },
            include: { _count: { select: { files: true } } },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async getSharedFolders(memberId: string, tenantId: string) {
        // Folders shared with this member or groups this member belongs to
        const memberGroups = await this.prisma.client.groupMember.findMany({
            where: { memberId, tenantId },
            select: { groupId: true }
        });
        const groupIds = memberGroups.map(g => g.groupId);

        return this.prisma.client.docFolder.findMany({
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
                _count: { select: { files: true } } 
            }
        });
    }

    async createFolder(memberId: string, tenantId: string, data: any) {
        return this.prisma.client.docFolder.create({
            data: {
                ...data,
                ownerId: memberId,
                tenantId
            }
        });
    }

    async getFolderFiles(folderId: string, tenantId: string) {
        return this.prisma.client.docFile.findMany({
            where: { folderId, tenantId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async shareItem(tenantId: string, data: { fileId?: string, folderId?: string, memberIds?: string[], groupIds?: string[], accessLevel: string }) {
        const { fileId, folderId, memberIds, groupIds, accessLevel } = data;
        const permissions: any[] = [];

        if (memberIds) {
            memberIds.forEach(mId => {
                permissions.push({
                    tenantId,
                    fileId,
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
                    fileId,
                    folderId,
                    groupId: gId,
                    accessLevel: accessLevel as any
                });
            });
        }

        return this.prisma.client.docPermission.createMany({
            data: permissions
        });
    }

    async getFilePermissions(fileId: string, tenantId: string) {
        return this.prisma.client.docPermission.findMany({
            where: { fileId, tenantId },
            include: {
                member: { select: { name: true, profilePhoto: true } },
                group: { select: { name: true } }
            }
        });
    }
}
