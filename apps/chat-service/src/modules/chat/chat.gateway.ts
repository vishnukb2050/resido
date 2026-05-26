import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    @WebSocketServer()
    server: Server;

    constructor(private chatService: ChatService) { }

    async handleConnection(client: Socket) {
        const tenantId = client.handshake.auth?.tenantId;
        const memberId = client.handshake.auth?.memberId;
        const dbName = client.handshake.auth?.dbName;
        
        if (tenantId && memberId && dbName) {
            client.data.dbName = dbName;
            client.data.tenantId = tenantId;
            client.data.memberId = memberId;
            
            client.join(`tenant:${tenantId}:member:${memberId}`);
            console.log(`Client connected: ${memberId} in tenant ${tenantId} (${dbName})`);
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join_conversation')
    handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ) {
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
        const { dbName, memberId, tenantId } = client.data;
        if (!dbName || !memberId) return { error: 'Unauthorized' };

        const message = await this.chatService.createMessage(dbName, {
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

    onModuleInit() {
        const redisHost = process.env.REDIS_HOST || 'redis';
        const redisPort = parseInt(process.env.REDIS_PORT || '6379');
        const redisPassword = process.env.REDIS_PASSWORD;
        const subscriber = new (require('ioredis'))({ host: redisHost, port: redisPort, password: redisPassword, tls: {} });

        subscriber.subscribe('resido_notifications', (err) => {
            if (err) console.error('Failed to subscribe to notifications:', err);
        });

        subscriber.on('message', (channel, message) => {
            if (channel === 'resido_notifications') {
                try {
                    const data = JSON.parse(message);
                    if (data.userId) {
                        // Assuming clients also join user:${userId} or we can iterate over sockets
                        // In handleConnection we join `tenant:${tenantId}:member:${memberId}`
                        // We will broadcast the notification directly by matching the user ID.
                        // memberId is often the userId or we could broadcast to a dedicated user channel.
                        this.server.emit('push_notification', data);
                    }
                } catch (e) {
                    console.error('Failed to parse notification message:', e);
                }
            }
        });
    }
}
