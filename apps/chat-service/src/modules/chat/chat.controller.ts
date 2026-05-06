import { Controller, Get, Post, Body, Param, Req, Query, UseInterceptors, Headers } from '@nestjs/common';
import { ChatService } from './chat.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('chat')
@UseInterceptors(TenantInterceptor)
export class ChatController {
    constructor(private chatService: ChatService) { }

    @Post('conversations')
    createConversation(
        @Req() req: any,
        @Body() body: { memberIds: string[]; groupId?: string; name?: string },
    ) {
        if (body.groupId) {
            return this.chatService.getOrCreateGroupConversation(req.tenantDbName, body.groupId, body.memberIds, body.name || 'Group');
        }
        return this.chatService.getOrCreateDirectConversation(req.tenantDbName, body.memberIds);
    }

    @Get('conversations')
    getConversations(
        @Req() req: any,
        @Headers('x-user-id') memberId: string, // Fallback or use a custom header
    ) {
        // Typically memberId should be extracted from JWT in the gateway and passed here
        return this.chatService.getConversations(req.tenantDbName, memberId);
    }

    @Get('conversations/:id/messages')
    getMessages(
        @Req() req: any,
        @Param('id') conversationId: string,
        @Query('skip') skip = '0',
        @Query('take') take = '50',
    ) {
        return this.chatService.getMessages(req.tenantDbName, conversationId, +skip, +take);
    }
}
