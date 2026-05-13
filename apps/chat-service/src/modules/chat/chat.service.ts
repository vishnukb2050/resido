import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

interface CreateMessageDto {
    conversationId: string;
    senderId: string;
    content?: string;
    type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO' | 'POLL';
    mediaUrl?: string;
    poll?: {
        question: string;
        options: string[];
        durationDays?: number;
    }
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
        
        let pollId = undefined;
        if (dto.type === 'POLL' && dto.poll) {
            const poll = await prisma.poll.create({
                data: {
                    question: dto.poll.question,
                    expiresAt: new Date(Date.now() + (dto.poll.durationDays || 7) * 24 * 60 * 60 * 1000),
                    options: {
                        create: dto.poll.options.map(text => ({ text }))
                    }
                }
            });
            pollId = poll.id;
        }

        return prisma.message.create({
            data: {
                conversationId: dto.conversationId,
                senderId: dto.senderId,
                content: dto.content,
                type: dto.type,
                mediaUrl: dto.mediaUrl,
                pollId
            },
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
    }

    async votePoll(dbName: string, pollId: string, optionId: string, userId: string) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        
        // Check if already voted
        const existing = await prisma.pollVote.findFirst({
            where: { pollId, userId }
        });

        if (existing) {
            throw new Error('Already voted in this poll');
        }

        return prisma.pollVote.create({
            data: {
                pollId,
                optionId,
                userId
            }
        });
    }

    async getMessages(dbName: string, conversationId: string, skip = 0, take = 50, userId?: string) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.message.findMany({
            where: { conversationId, isDeleted: false },
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
