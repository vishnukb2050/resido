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

        if (!tenantId || !memberId) {
            client.disconnect(true);
            return;
        }
        if (!payload.tenantId) {
            console.warn('[ws] rejected connection: token missing tenantId');
            client.disconnect(true);
            return;
        }
        if (payload.tenantId !== tenantId) {
            console.warn('[ws] rejected connection: tenant mismatch');
            client.disconnect(true);
            return;
        }

        client.data.tenantId = tenantId;
        client.data.memberId = memberId;
        client.data.userId = payload.sub;

        client.join(`tenant:${tenantId}:member:${memberId}`);
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
        const { tenantId, memberId } = client.data;
        if (!tenantId || !memberId) return { error: 'Unauthorized' };
        // Only let a client subscribe to conversations it actually belongs to.
        const allowed = await this.chatService.isConversationMember(tenantId, data.conversationId, memberId);
        if (!allowed) return { error: 'Forbidden' };
        client.join(`conversation:${data.conversationId}`);
        return { event: 'joined', data: data.conversationId };
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
        const { tenantId, memberId } = client.data;
        if (!tenantId || !memberId) return { error: 'Unauthorized' };

        // Reject sends to conversations the client isn't a member of.
        const allowed = await this.chatService.isConversationMember(tenantId, data.conversationId, memberId);
        if (!allowed) return { error: 'Forbidden' };

        const message = await this.chatService.createMessage(tenantId, {
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

    /** Emit a freshly-persisted message to everyone joined to the conversation room. */
    broadcastMessage(conversationId: string, message: any) {
        if (!this.server) return;
        this.server.to(`conversation:${conversationId}`).emit('new_message', message);
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
        const redisHost = process.env.REDIS_HOST || 'redis';
        const redisPort = parseInt(process.env.REDIS_PORT || '6379');
        const redisPassword = process.env.REDIS_PASSWORD;
        const useTls = process.env.REDIS_TLS === 'true';
        const subscriber = new (require('ioredis'))({ host: redisHost, port: redisPort, password: redisPassword, ...(useTls ? { tls: {} } : {}) });
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
    }

    async onModuleDestroy() {
        try {
            await this.subscriber?.quit();
        } catch {
            // ignore on shutdown
        }
    }
}
