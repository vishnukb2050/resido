import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Param, Post, Query, Req, UseInterceptors } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('chat')
@UseInterceptors(TenantInterceptor)
export class ChatController {
    constructor(
        private chatService: ChatService,
        private chatGateway: ChatGateway,
    ) {}

    @Post('conversations')
    createConversation(
        @Req() req: any,
        @Headers('x-user-id') callerId: string,
        @Body() body: { memberIds: string[]; groupId?: string; name?: string; type?: 'DIRECT' | 'GROUP' },
    ) {
        const ids = Array.from(new Set([callerId, ...(body.memberIds || [])].filter(Boolean)));
        if (ids.length < 2) {
            throw new BadRequestException('memberIds must include at least one other user');
        }

        // Explicit GROUP type or a name supplied with >2 members => create an ad-hoc group.
        if (body.groupId) {
            return this.chatService.getOrCreateGroupConversation(req.tenantDbName, body.groupId, ids, body.name || 'Group');
        }
        if (body.type === 'GROUP' || (body.name && ids.length >= 2 && body.type !== 'DIRECT' && ids.length > 2)) {
            return this.chatService.createAdhocGroup(req.tenantDbName, body.name || 'Group', ids);
        }
        return this.chatService.getOrCreateDirectConversation(req.tenantDbName, ids);
    }

    @Get('conversations')
    getConversations(
        @Req() req: any,
        @Headers('x-user-id') memberId: string,
        @Query('skip') skip = '0',
        @Query('take') take = '30',
    ) {
        return this.chatService.getConversations(req.tenantDbName, memberId, +skip, +take);
    }

    @Get('conversations/:id/messages')
    async getMessages(
        @Req() req: any,
        @Param('id') conversationId: string,
        @Headers('x-user-id') userId: string,
        @Query('skip') skip = '0',
        @Query('take') take = '50',
    ) {
        // Don't let a user read history of a conversation they're not in.
        const allowed = await this.chatService.isConversationMember(req.tenantDbName, conversationId, userId);
        if (!allowed) throw new ForbiddenException('Not a member of this conversation');
        return this.chatService.getMessages(req.tenantDbName, conversationId, +skip, +take, userId);
    }

    /**
     * Reliable HTTP send. Used by the mobile app as the primary send path so
     * messages are persisted even when the socket connection is degraded.
     * The websocket gateway still receives the broadcast so other connected
     * clients see the message in real time.
     */
    @Post('conversations/:id/messages')
    async sendMessage(
        @Req() req: any,
        @Param('id') conversationId: string,
        @Headers('x-user-id') senderId: string,
        @Body() body: { content?: string; type?: string; mediaUrl?: string; poll?: any },
    ) {
        if (!senderId) throw new BadRequestException('Missing sender');
        const allowed = await this.chatService.isConversationMember(req.tenantDbName, conversationId, senderId);
        if (!allowed) throw new ForbiddenException('Not a member of this conversation');
        const message = await this.chatService.createMessage(req.tenantDbName, {
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
        @Req() req: any,
        @Param('id') pollId: string,
        @Headers('x-user-id') userId: string,
        @Body() body: { optionId: string },
    ) {
        return this.chatService.votePoll(req.tenantDbName, pollId, body.optionId, userId);
    }
}
