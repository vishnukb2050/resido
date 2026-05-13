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
        console.log(`Client ${client.id} joined flare room: ${data.flareId}`);
        return { event: 'joined', data: data.flareId };
    }

    broadcastComment(flareId: string, comment: any) {
        this.server.to(`flare:${flareId}`).emit('new_comment', comment);
    }
}
