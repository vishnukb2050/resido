import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/flares' })
export class FlareGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log(`Flare client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Flare client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join_flare')
    handleJoinFlare(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { flareId: string },
    ) {
        client.join(`flare:${data.flareId}`);
        return { event: 'joined', data: data.flareId };
    }

    @SubscribeMessage('join_global_feed')
    handleJoinGlobalFeed(@ConnectedSocket() client: Socket) {
        client.join('global_feed');
        return { event: 'joined', data: 'global_feed' };
    }

    broadcastComment(flareId: string, comment: any) {
        // Broadcast to specific room for detailed view
        this.server.to(`flare:${flareId}`).emit('new_comment', comment);
        // Broadcast to global feed for list updates
        this.server.to('global_feed').emit('feed_comment_update', { flareId, comment });
    }
}
