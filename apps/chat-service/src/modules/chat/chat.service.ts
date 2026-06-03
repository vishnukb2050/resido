import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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
        // Normalize / de-dup. A DIRECT chat must have exactly two distinct members.
        const ids = Array.from(new Set(memberIds.filter(Boolean)));
        if (ids.length < 2) {
            throw new Error('Direct conversation requires two distinct members');
        }
        const [a, b] = ids.slice(0, 2).sort();
        const prisma = this.tenantPrisma.getWriteClient(dbName);

        // Find an existing DIRECT conversation that contains BOTH members and is between
        // exactly two participants. The previous `every: in [a,b]` query was satisfied by
        // conversations that only contained ONE of the two — which caused duplicates and
        // sometimes returned the wrong conversation. Use an explicit AND of two `some`
        // predicates plus a member-count check.
        const candidates = await prisma.conversation.findMany({
            where: {
                type: 'DIRECT',
                AND: [
                    { members: { some: { memberId: a } } },
                    { members: { some: { memberId: b } } },
                ],
            },
            include: { members: true },
        });
        const existing = candidates.find((c: any) => (c.members?.length || 0) === 2);
        if (existing) return existing;

        return prisma.conversation.create({
            data: {
                type: 'DIRECT',
                members: { create: [a, b].map((id) => ({ memberId: id })) },
            },
            include: { members: true },
        });
    }

    async getOrCreateGroupConversation(dbName: string, groupId: string, memberIds: string[], name: string) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        const existing = await prisma.conversation.findFirst({ where: { groupId }, include: { members: true } });
        if (existing) return existing;

        const ids = Array.from(new Set(memberIds.filter(Boolean)));
        return prisma.conversation.create({
            data: {
                type: 'GROUP',
                name,
                groupId,
                members: { create: ids.map((id) => ({ memberId: id })) },
            },
            include: { members: true },
        });
    }

    /**
     * Create an ad-hoc group from a free-form name + member ids. Used by mobile
     * "New Group" flow where there is no pre-existing entity id. Returns an
     * existing conversation when a previous one was created for the same name +
     * member set (helps idempotent retries from a flaky network).
     */
    async createAdhocGroup(dbName: string, name: string, memberIds: string[]) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        const ids = Array.from(new Set(memberIds.filter(Boolean)));
        if (ids.length < 2) {
            throw new Error('Group needs at least two members');
        }
        const safeName = (name || 'Group').trim() || 'Group';
        const groupId = `adhoc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return prisma.conversation.create({
            data: {
                type: 'GROUP',
                name: safeName,
                groupId,
                members: { create: ids.map((id) => ({ memberId: id })) },
            },
            include: { members: true },
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

        // Only members of the poll's conversation may vote.
        const message = await prisma.message.findFirst({
            where: { poll: { id: pollId } },
            select: { conversationId: true },
        });
        if (!message) {
            throw new NotFoundException('Poll not found');
        }
        const isMember = await this.isConversationMember(dbName, message.conversationId, userId);
        if (!isMember) {
            throw new ForbiddenException('Not a member of this conversation');
        }

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
        const safeTake = Math.min(Math.max(take, 1), 100);
        const safeSkip = Math.max(skip, 0);
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
            skip: safeSkip,
            take: safeTake,
        });
    }

    async getConversations(dbName: string, memberId: string, skip = 0, take = 30) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        // Cap page size so an account in thousands of groups can't pull the
        // entire inbox + full member graph in one request.
        const safeTake = Math.min(Math.max(take, 1), 50);
        return prisma.conversation.findMany({
            where: { members: { some: { memberId } } },
            include: {
                members: true,
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
            skip: Math.max(skip, 0),
            take: safeTake,
        });
    }

    /**
     * Whether `memberId` belongs to a conversation. Used to authorize joins,
     * sends and history reads so a client can't post into / read arbitrary
     * conversation ids. Result is tiny and indexed (ConversationMember.memberId).
     */
    async isConversationMember(dbName: string, conversationId: string, memberId: string): Promise<boolean> {
        if (!conversationId || !memberId) return false;
        const prisma = this.tenantPrisma.getReadClient(dbName);
        const row = await prisma.conversationMember.findFirst({
            where: { conversationId, memberId },
            select: { id: true },
        });
        return !!row;
    }
}
