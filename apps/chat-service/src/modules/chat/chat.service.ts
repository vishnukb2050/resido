import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

interface CreateMessageDto {
    conversationId: string;
    senderId: string;
    content?: string;
    type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO';
    mediaUrl?: string;
}

@Injectable()
export class ChatService {
    constructor(private tenantPrisma: TenantPrismaService) {}

    async getOrCreateDirectConversation(dbName: string, memberIds: string[]) {
        const [a, b] = memberIds.sort();
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        
        const existing = await prisma.conversation.findFirst({
            where: {
                type: 'DIRECT',
                members: { every: { memberId: { in: [a, b] } } },
            },
            include: { members: true },
        });
        if (existing) return existing;

        return prisma.conversation.create({
            data: {
                type: 'DIRECT',
                members: { create: memberIds.map((id) => ({ memberId: id })) },
            },
            include: { members: true },
        });
    }

    async getOrCreateGroupConversation(dbName: string, groupId: string, memberIds: string[], name: string) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        const existing = await prisma.conversation.findFirst({ where: { groupId } });
        if (existing) return existing;

        return prisma.conversation.create({
            data: {
                type: 'GROUP',
                name,
                groupId,
                members: { create: memberIds.map((id) => ({ memberId: id })) },
            },
        });
    }

    async createMessage(dbName: string, dto: CreateMessageDto) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        return prisma.message.create({
            data: {
                conversationId: dto.conversationId,
                senderId: dto.senderId,
                content: dto.content,
                type: dto.type,
                mediaUrl: dto.mediaUrl,
            },
        });
    }

    async getMessages(dbName: string, conversationId: string, skip = 0, take = 50) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.message.findMany({
            where: { conversationId, isDeleted: false },
            orderBy: { createdAt: 'asc' },
            skip,
            take,
        });
    }

    async getConversations(dbName: string, memberId: string) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.conversation.findMany({
            where: { members: { some: { memberId } } },
            include: {
                members: true,
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
