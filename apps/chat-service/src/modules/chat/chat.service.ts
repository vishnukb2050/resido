import { BadRequestException, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@resido/chat-client';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { buildRedisClient } from '../../common/redis-connection';

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

/**
 * Sentinel community id for personal / contact direct chats that do not belong
 * to any community. Using a fixed tenant (instead of nullable columns) keeps the
 * existing schema and unique constraints intact while letting these chats show
 * up regardless of which community a user currently has selected.
 */
export const PERSONAL_TENANT = 'global';

@Injectable()
export class ChatService {
    private redis: Redis | null = null;

    constructor(
        private tenantPrisma: TenantPrismaService,
        private config: ConfigService,
    ) {
        try {
            this.redis = buildRedisClient(this.config);
        } catch (e: any) {
            console.warn('[ChatService] Redis client initialization failed; running without member cache:', e?.message);
        }
    }

    /**
     * Direct (1:1) chats are personal and cross-community: a single conversation
     * between two users regardless of which community either has selected. They
     * live under the PERSONAL_TENANT sentinel.
     */
    async getOrCreateDirectConversation(memberIds: string[]) {
        const ids = Array.from(new Set(memberIds.filter(Boolean)));
        if (ids.length < 2) {
            throw new BadRequestException('Direct conversation requires two distinct members');
        }
        const [a, b] = ids.slice(0, 2).sort();
        const prisma = this.tenantPrisma.getWriteClient();

        const candidates = await prisma.conversation.findMany({
            where: {
                tenantId: PERSONAL_TENANT,
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
                tenantId: PERSONAL_TENANT,
                type: 'DIRECT',
                members: { create: [a, b].map((id) => ({ tenantId: PERSONAL_TENANT, memberId: id })) },
            },
            include: { members: true },
        });
    }

    /**
     * The default community group chat. Every community has exactly one, keyed by
     * `comm-<tenantId>`. Idempotently creates it and makes sure `memberId` is in
     * it — so the first time any resident opens chat they are auto-joined.
     */
    async ensureCommunityGroup(tenantId: string, communityName: string, memberId: string) {
        if (!tenantId) throw new BadRequestException('Community is required');
        if (!memberId) throw new BadRequestException('Member is required');
        const prisma = this.tenantPrisma.getWriteClient();
        const groupId = `comm-${tenantId}`;
        const name = (communityName || 'Community').trim() || 'Community';

        let conversation = await prisma.conversation.findFirst({
            where: { tenantId, groupId },
            include: { members: true },
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    tenantId,
                    type: 'GROUP',
                    name,
                    groupId,
                    members: { create: [{ tenantId, memberId }] },
                },
                include: { members: true },
            });
            return conversation;
        }

        const already = conversation.members?.some((m: any) => m.memberId === memberId);
        if (!already) {
            await prisma.conversationMember.create({
                data: { tenantId, conversationId: conversation.id, memberId },
            });
            if (this.redis) {
                await this.redis.del(`chat:members:${conversation.id}`).catch((err) => {
                    console.warn('[ChatService] Redis cache invalidation failed:', err?.message);
                });
            }
            conversation = await prisma.conversation.findFirst({
                where: { id: conversation.id },
                include: { members: true },
            });
        }
        return conversation;
    }

    async getOrCreateGroupConversation(tenantId: string, groupId: string, memberIds: string[], name: string) {
        if (!tenantId) throw new BadRequestException('Community is required for a group');
        const prisma = this.tenantPrisma.getWriteClient();
        const existing = await prisma.conversation.findFirst({ where: { tenantId, groupId }, include: { members: true } });
        if (existing) return existing;

        const ids = Array.from(new Set(memberIds.filter(Boolean)));
        return prisma.conversation.create({
            data: {
                tenantId,
                type: 'GROUP',
                name,
                groupId,
                members: { create: ids.map((id) => ({ tenantId, memberId: id })) },
            },
            include: { members: true },
        });
    }

    /**
     * Create an ad-hoc group from a free-form name + member ids. Used by mobile
     * "New Group" flow where there is no pre-existing entity id. Ad-hoc groups
     * with no community fall back to the personal tenant.
     */
    async createAdhocGroup(tenantId: string | null, name: string, memberIds: string[]) {
        const prisma = this.tenantPrisma.getWriteClient();
        const ids = Array.from(new Set(memberIds.filter(Boolean)));
        if (ids.length < 2) {
            throw new BadRequestException('Group needs at least two members');
        }
        const scope = tenantId || PERSONAL_TENANT;
        const safeName = (name || 'Group').trim() || 'Group';
        const groupId = `adhoc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return prisma.conversation.create({
            data: {
                tenantId: scope,
                type: 'GROUP',
                name: safeName,
                groupId,
                members: { create: ids.map((id) => ({ tenantId: scope, memberId: id })) },
            },
            include: { members: true },
        });
    }

    async createMessage(dto: CreateMessageDto) {
        const prisma = this.tenantPrisma.getWriteClient();

        // The conversation is the source of truth for the tenant; we never trust
        // the request's tenant for an existing conversation.
        const conversation = await prisma.conversation.findFirst({
            where: { id: dto.conversationId },
            select: { id: true, tenantId: true },
        });
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }
        const tenantId = conversation.tenantId;

        let pollId = undefined;
        if (dto.type === 'POLL' && dto.poll) {
            const poll = await prisma.poll.create({
                data: {
                    tenantId,
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
                tenantId,
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

    async votePoll(pollId: string, optionId: string, userId: string) {
        const prisma = this.tenantPrisma.getWriteClient();

        const message = await prisma.message.findFirst({
            where: { poll: { id: pollId } },
            select: { conversationId: true, tenantId: true },
        });
        if (!message) {
            throw new NotFoundException('Poll not found');
        }
        const isMember = await this.isConversationMember(message.conversationId, userId);
        if (!isMember) {
            throw new ForbiddenException('Not a member of this conversation');
        }

        const existing = await prisma.pollVote.findFirst({
            where: { pollId, userId }
        });
        if (existing) {
            throw new BadRequestException('Already voted in this poll');
        }

        return prisma.pollVote.create({
            data: {
                tenantId: message.tenantId,
                pollId,
                optionId,
                userId
            }
        });
    }

    /**
     * Cursor-paginated message history. Returns the most recent `take` messages
     * (optionally those created before the `before` message id, for loading
     * older pages), ordered oldest→newest for natural top-to-bottom display.
     *
     * Previously this used ascending order + offset, which (a) returned the
     * OLDEST messages first — wrong for a chat that should open at the latest —
     * and (b) degraded on deep offsets in long conversations. The cursor form
     * rides the `[conversationId, createdAt desc]` index and stays O(take)
     * regardless of how long the conversation gets.
     */
    async getMessages(
        conversationId: string,
        opts: { take?: number; before?: string } = {},
        userId?: string,
    ) {
        const prisma = this.tenantPrisma.getReadClient();
        const safeTake = Math.min(Math.max(opts.take ?? 50, 1), 100);
        const where: any = { conversationId, isDeleted: false };

        if (opts.before) {
            const anchor = await prisma.message.findUnique({
                where: { id: opts.before },
                select: { createdAt: true },
            });
            if (anchor) where.createdAt = { lt: anchor.createdAt };
        }

        const rows = await prisma.message.findMany({
            where,
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
            orderBy: { createdAt: 'desc' },
            take: safeTake,
        });

        // DB gave us newest→oldest; flip to oldest→newest for display.
        return rows.reverse();
    }

    /**
     * All conversations the user belongs to — personal direct chats AND every
     * community group — regardless of which community is currently selected.
     * Membership is the access boundary, so this is safe across tenants.
     */
    async getConversations(memberId: string, skip = 0, take = 30) {
        const prisma = this.tenantPrisma.getReadClient();
        const safeTake = Math.min(Math.max(take, 1), 50);
        const conversations = await prisma.conversation.findMany({
            where: { members: { some: { memberId } } },
            include: {
                members: true,
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
            skip: Math.max(skip, 0),
            take: safeTake,
        });

        if (conversations.length === 0) return [];

        // Per-conversation unread count for this member: messages from OTHER
        // members created after the member's lastReadAt (or all of them if the
        // member has never opened the conversation). One grouped aggregate for
        // the whole page instead of a COUNT per conversation (no N+1).
        const ids = conversations.map((c: any) => c.id);
        const rows = await prisma.$queryRaw<Array<{ id: string; unread: number }>>(Prisma.sql`
            SELECT m."conversationId" AS id, COUNT(*)::int AS unread
            FROM "messages" m
            JOIN "conversation_members" cm
              ON cm."conversationId" = m."conversationId" AND cm."memberId" = ${memberId}
            WHERE m."conversationId" IN (${Prisma.join(ids)})
              AND m."isDeleted" = false
              AND m."senderId" <> ${memberId}
              AND m."createdAt" > COALESCE(cm."lastReadAt", to_timestamp(0))
            GROUP BY m."conversationId"
        `);
        const unreadById = new Map(rows.map((r) => [r.id, Number(r.unread)]));
        return conversations.map((c: any) => ({ ...c, unreadCount: unreadById.get(c.id) || 0 }));
    }

    /**
     * Mark a conversation read for `memberId` (stamps `lastReadAt = now`). Used
     * by the client when the user opens / is viewing a conversation so unread
     * badges clear. Idempotent.
     */
    async markRead(conversationId: string, memberId: string) {
        if (!conversationId || !memberId) {
            throw new BadRequestException('conversationId and member are required');
        }
        const prisma = this.tenantPrisma.getWriteClient();
        const member = await prisma.conversationMember.findFirst({
            where: { conversationId, memberId },
            select: { id: true },
        });
        if (!member) throw new ForbiddenException('Not a member of this conversation');
        await prisma.conversationMember.update({
            where: { id: member.id },
            data: { lastReadAt: new Date() },
        });
        return { ok: true };
    }

    /** Member ids of a conversation — used to fan a new message out to each
     * member's personal socket room (inbox notifications). */
    async getConversationMemberIds(conversationId: string): Promise<string[]> {
        if (!conversationId) return [];
        const cacheKey = `chat:members:${conversationId}`;

        if (this.redis) {
            try {
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (err: any) {
                console.warn('[ChatService] Redis cache read failed:', err?.message);
            }
        }

        const prisma = this.tenantPrisma.getReadClient();
        const rows = await prisma.conversationMember.findMany({
            where: { conversationId },
            select: { memberId: true },
        });
        const memberIds = rows.map((r: any) => r.memberId);

        if (this.redis && memberIds.length > 0) {
            try {
                await this.redis.set(cacheKey, JSON.stringify(memberIds), 'EX', 60);
            } catch (err: any) {
                console.warn('[ChatService] Redis cache write failed:', err?.message);
            }
        }

        return memberIds;
    }

    /**
     * Whether `memberId` belongs to a conversation. Used to authorize joins,
     * sends and history reads so a client can't post into / read arbitrary
     * conversation ids. Membership alone is sufficient (a user is only ever a
     * member of conversations they were added to), so this is tenant-agnostic.
     */
    async isConversationMember(conversationId: string, memberId: string): Promise<boolean> {
        if (!conversationId || !memberId) return false;
        const prisma = this.tenantPrisma.getReadClient();
        const row = await prisma.conversationMember.findFirst({
            where: { conversationId, memberId },
            select: { id: true },
        });
        return !!row;
    }

    async getConversation(id: string) {
        if (!id) return null;
        const prisma = this.tenantPrisma.getReadClient();
        return prisma.conversation.findUnique({
            where: { id },
            select: { id: true, type: true, name: true, tenantId: true },
        });
    }
}

