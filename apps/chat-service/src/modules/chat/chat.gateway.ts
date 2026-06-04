import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { buildRedisClient } from '../../common/redis-connection';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
    @WebSocketServer()
    server: Server;

    constructor(
        private chatService: ChatService,
        private jwtService: JwtService,
        private config: ConfigService,
    ) { }

    async handleConnection(client: Socket) {
        const token = client.handshake.auth?.token;
        const tenantId = client.handshake.auth?.tenantId;
        const memberId = client.handshake.auth?.memberId;

        // Authenticate the socket: a valid JWT is required, and the tenant the
        // client claims must match the token so a user can't attach to another
        // community's chat data (all communities share resido_chat; rows are
        // isolated by tenantId).
        let payload: any;
        try {
            payload = this.jwtService.verify(token, {
                secret: this.config.get('JWT_SECRET'),
            });
        } catch {
            console.warn('[ws] rejected connection: invalid/missing token');
            client.disconnect(true);
            return;
        }

        // memberId must be present and match the authenticated user — a client
        // cannot attach as someone else.
        const authedUserId = payload.sub;
        if (!memberId || (authedUserId && memberId !== authedUserId)) {
            console.warn('[ws] rejected connection: missing/mismatched member');
            client.disconnect(true);
            return;
        }

        // tenantId is OPTIONAL: personal/contact chats have no community. When a
        // community is claimed it must match the token's tenant (if any) so a
        // user can't attach to another community's context. The `global`
        // sentinel (personal chats) is always allowed.
        const claimedTenant = typeof tenantId === 'string' && tenantId ? tenantId : 'global';
        if (payload.tenantId && claimedTenant !== 'global' && claimedTenant !== payload.tenantId) {
            console.warn('[ws] rejected connection: tenant mismatch');
            client.disconnect(true);
            return;
        }

        client.data.tenantId = claimedTenant;
        client.data.memberId = memberId;
        client.data.userId = payload.sub;

        client.join(`tenant:${claimedTenant}:member:${memberId}`);
        // Also join a per-user room so targeted notifications (which only
        // carry a userId) can reach this client without a global broadcast.
        client.join(`user:${memberId}`);
        if (payload.sub) client.join(`user:${payload.sub}`);
        console.log(`Client connected: ${memberId} in tenant ${tenantId}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join_conversation')
    async handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ) {
        const { memberId } = client.data;
        if (!memberId) return { error: 'Unauthorized' };
        // Only let a client subscribe to conversations it actually belongs to.
        const allowed = await this.chatService.isConversationMember(data.conversationId, memberId);
        if (!allowed) return { error: 'Forbidden' };
        client.join(`conversation:${data.conversationId}`);
        return { event: 'joined', data: data.conversationId };
    }

    @SubscribeMessage('leave_conversation')
    handleLeaveConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ) {
        // The chat socket is shared across the app (notifications + open chat),
        // so when a chat screen closes it leaves just that conversation room
        // while keeping the connection alive for the rest of the app.
        if (data?.conversationId) {
            client.leave(`conversation:${data.conversationId}`);
        }
        return { event: 'left', data: data?.conversationId };
    }

    @SubscribeMessage('send_message')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId: string;
            content: string;
            type: string;
            mediaUrl?: string;
            poll?: {
                question: string;
                options: string[];
                durationDays?: number;
            }
        },
    ) {
        const { memberId } = client.data;
        if (!memberId) return { error: 'Unauthorized' };

        // Reject sends to conversations the client isn't a member of.
        const allowed = await this.chatService.isConversationMember(data.conversationId, memberId);
        if (!allowed) return { error: 'Forbidden' };

        const message = await this.chatService.createMessage({
            conversationId: data.conversationId,
            senderId: memberId,
            content: data.content,
            type: data.type as any,
            mediaUrl: data.mediaUrl,
            poll: data.poll
        });

        // Broadcast to all members in conversation
        this.broadcastMessage(data.conversationId, message);

        return { event: 'message_sent', data: message };
    }

    /**
     * Emit a freshly-persisted message to everyone joined to the conversation
     * room (the open chat screen), AND fan a lightweight `inbox_message` out to
     * every member's personal room so clients that aren't currently viewing the
     * conversation still get unread-badge + notification-sound updates.
     */
    async broadcastMessage(conversationId: string, message: any) {
        if (!this.server) return;
        this.server.to(`conversation:${conversationId}`).emit('new_message', message);
        try {
            const memberIds = await this.chatService.getConversationMemberIds(conversationId);
            for (const uid of memberIds) {
                this.server.to(`user:${uid}`).emit('inbox_message', { conversationId, message });
            }
        } catch (e: any) {
            console.warn('[chat] inbox fan-out failed:', e?.message);
        }
    }

    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string; memberId: string },
    ) {
        client.to(`conversation:${data.conversationId}`).emit('user_typing', {
            memberId: data.memberId,
        });
    }

    private subscriber: any;

    onModuleInit() {
        try {
            const subscriber = buildRedisClient(this.config);
            this.subscriber = subscriber;

            subscriber.subscribe('resido_notifications', (err) => {
                if (err) console.error('Failed to subscribe to notifications:', err);
            });

            subscriber.on('message', (channel, message) => {
            if (channel === 'resido_notifications') {
                try {
                    const data = JSON.parse(message);
                    // Deliver only to the target user's room. Previously this did
                    // `server.emit(...)` — a fan-out to EVERY connected socket on
                    // EVERY tenant for each notification, which does not scale.
                    if (data.userId) {
                        this.server.to(`user:${data.userId}`).emit('push_notification', data);
                    } else if (Array.isArray(data.userIds)) {
                        for (const uid of data.userIds) {
                            this.server.to(`user:${uid}`).emit('push_notification', data);
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse notification message:', e);
                }
            }
            });
        } catch (e: any) {
            console.warn('[chat] Redis notification subscriber unavailable:', e?.message);
        }
    }

    async onModuleDestroy() {
        try {
            await this.subscriber?.quit();
        } catch {
            // ignore on shutdown
        }
    }
}
