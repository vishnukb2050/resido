import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

// Custom path so the ALB can route flare WebSockets separately from chat
// (/socket.io/* → chat-service). Must match mobile FLARES_SOCKET_PATH and
// the listener rule path-pattern /flares-io/* in terraform_infra/modules/alb.
@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/flares',
    path: '/flares-io',
})
export class FlareGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) { }

    // Every connection must present a valid JWT in the handshake auth payload.
    // Without this, any anonymous client could `join_flare`/`join_global_feed`
    // and receive live comment traffic for posts across the platform.
    handleConnection(client: Socket) {
        const token = client.handshake.auth?.token;
        try {
            const payload: any = this.jwtService.verify(token, {
                secret: this.config.get('JWT_SECRET'),
            });
            client.data.userId = payload.sub;
        } catch {
            console.warn('[flares-ws] rejected connection: invalid/missing token');
            client.disconnect(true);
            return;
        }
        console.log(`Flare client connected: ${client.id} (user ${client.data.userId})`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Flare client disconnected: ${client.id}`);
    }

    private isAuthed(client: Socket): boolean {
        if (!client.data?.userId) {
            client.disconnect(true);
            return false;
        }
        return true;
    }

    @SubscribeMessage('join_flare')
    handleJoinFlare(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { flareId: string },
    ) {
        if (!this.isAuthed(client)) return;
        if (!data?.flareId) return { event: 'error', data: 'flareId required' };
        client.join(`flare:${data.flareId}`);
        return { event: 'joined', data: data.flareId };
    }

    @SubscribeMessage('leave_flare')
    handleLeaveFlare(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { flareId: string },
    ) {
        if (!data?.flareId) return;
        client.leave(`flare:${data.flareId}`);
        return { event: 'left', data: data.flareId };
    }

    // Subscribe to live comment-count updates for a specific set of flares
    // (e.g. the flares currently visible in the feed). This replaces the old
    // `join_global_feed` room, which fanned every comment on the platform out
    // to every connected client — a cross-tenant data leak and a fan-out that
    // does not scale.
    @SubscribeMessage('watch_flares')
    handleWatchFlares(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { flareIds: string[] },
    ) {
        if (!this.isAuthed(client)) return;
        const ids = Array.isArray(data?.flareIds) ? data.flareIds : [];
        for (const id of ids) {
            if (id) client.join(`flare:${id}`);
        }
        return { event: 'watching', data: ids.length };
    }

    @SubscribeMessage('unwatch_flares')
    handleUnwatchFlares(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { flareIds: string[] },
    ) {
        const ids = Array.isArray(data?.flareIds) ? data.flareIds : [];
        for (const id of ids) {
            if (id) client.leave(`flare:${id}`);
        }
        return { event: 'unwatched', data: ids.length };
    }

    broadcastComment(flareId: string, comment: any) {
        // Emit only to clients that have explicitly joined this flare's room
        // (detail view or feed watchers). No platform-wide broadcast.
        this.server.to(`flare:${flareId}`).emit('new_comment', comment);
        this.server.to(`flare:${flareId}`).emit('feed_comment_update', { flareId, comment });
    }
}
