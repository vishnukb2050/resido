import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Param, Post, Query, Req, UseInterceptors } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { PermissionService } from './permission.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('chat')
@UseInterceptors(TenantInterceptor)
export class ChatController {
    constructor(
        private chatService: ChatService,
        private chatGateway: ChatGateway,
        private permissions: PermissionService,
    ) {}

    /**
     * Ensure the caller is a member of their active community's default group
     * chat, creating the group on first use. Returns the conversation so the
     * mobile app can render it under the "Community" filter. Requires an active
     * community (x-tenant-id).
     */
    @Post('communities/ensure')
    async ensureCommunityGroup(
        @Req() req: any,
        @Headers('x-user-id') memberId: string,
        @Body() body: { name?: string },
    ) {
        if (!req.tenantId) {
            throw new BadRequestException('Select a community to access its group chat');
        }
        if (!memberId) throw new BadRequestException('Missing user');
        return this.chatService.ensureCommunityGroup(req.tenantId, body?.name || 'Community', memberId);
    }

    @Post('conversations')
    async createConversation(
        @Req() req: any,
        @Headers('x-user-id') callerId: string,
        @Body() body: { memberIds: string[]; groupId?: string; name?: string; type?: 'DIRECT' | 'GROUP' },
    ) {
        if (!callerId) throw new BadRequestException('Missing user');
        const others = (body.memberIds || []).filter((id) => id && id !== callerId);
        const ids = Array.from(new Set([callerId, ...others]));
        if (ids.length < 2) {
            throw new BadRequestException('memberIds must include at least one other user');
        }

        // Community group bound to a resident-service group entity.
        if (body.groupId) {
            return this.chatService.getOrCreateGroupConversation(req.tenantId, body.groupId, ids, body.name || 'Group');
        }

        // Explicit / inferred ad-hoc group (3+ members or named non-direct).
        if (body.type === 'GROUP' || (body.name && body.type !== 'DIRECT' && ids.length > 2)) {
            return this.chatService.createAdhocGroup(req.tenantId, body.name || 'Group', ids);
        }

        // DIRECT (1:1) personal chat — gate on the relationship rules owned by
        // auth-service (global / follower / contact / community; restricted
        // profiles require an accepted follow).
        const targetId = others[0];
        const verdict = await this.permissions.canMessage(callerId, targetId);
        if (!verdict.allowed) {
            throw new ForbiddenException({
                message:
                    verdict.reason === 'FOLLOW_REQUIRED'
                        ? 'This user only accepts messages from approved followers. Send a follow request first.'
                        : 'You cannot message this user.',
                reason: verdict.reason,
                followStatus: verdict.followStatus,
            });
        }
        return this.chatService.getOrCreateDirectConversation(ids);
    }

    @Get('conversations')
    getConversations(
        @Headers('x-user-id') memberId: string,
        @Query('skip') skip = '0',
        @Query('take') take = '30',
    ) {
        return this.chatService.getConversations(memberId, +skip, +take);
    }

    @Post('conversations/:id/read')
    async markRead(
        @Param('id') conversationId: string,
        @Headers('x-user-id') memberId: string,
    ) {
        if (!memberId) throw new BadRequestException('Missing user');
        return this.chatService.markRead(conversationId, memberId);
    }

    @Get('conversations/:id/messages')
    async getMessages(
        @Param('id') conversationId: string,
        @Headers('x-user-id') userId: string,
        @Query('skip') skip = '0',
        @Query('take') take = '50',
    ) {
        const allowed = await this.chatService.isConversationMember(conversationId, userId);
        if (!allowed) throw new ForbiddenException('Not a member of this conversation');
        return this.chatService.getMessages(conversationId, +skip, +take, userId);
    }

    /**
     * Reliable HTTP send. Used by the mobile app as the primary send path so
     * messages are persisted even when the socket connection is degraded.
     */
    @Post('conversations/:id/messages')
    async sendMessage(
        @Param('id') conversationId: string,
        @Headers('x-user-id') senderId: string,
        @Body() body: { content?: string; type?: string; mediaUrl?: string; poll?: any },
    ) {
        if (!senderId) throw new BadRequestException('Missing sender');
        const allowed = await this.chatService.isConversationMember(conversationId, senderId);
        if (!allowed) throw new ForbiddenException('Not a member of this conversation');
        const message = await this.chatService.createMessage({
            conversationId,
            senderId,
            content: body.content,
            type: (body.type as any) || 'TEXT',
            mediaUrl: body.mediaUrl,
            poll: body.poll,
        });
        this.chatGateway.broadcastMessage(conversationId, message);
        return message;
    }

    @Post('polls/:id/vote')
    votePoll(
        @Param('id') pollId: string,
        @Headers('x-user-id') userId: string,
        @Body() body: { optionId: string },
    ) {
        return this.chatService.votePoll(pollId, body.optionId, userId);
    }
}
