import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './api';

export interface ChatSocketAuth {
    token: string;
    tenantId?: string;
    dbName?: string;
    memberId: string;
}

let socket: Socket | null = null;
let refCount = 0;
let currentKey = '';

function keyOf(a: ChatSocketAuth): string {
    return [a.token, a.tenantId || 'global', a.dbName || '', a.memberId].join('|');
}

/**
 * Returns the process-wide shared chat socket, creating it on first use.
 *
 * Every chat consumer (global notifications, the conversation list, the open
 * chat screen) shares ONE connection instead of each opening its own. With up
 * to three chat surfaces mounted at once, that previously meant three sockets
 * per user — at millions of concurrent users that triples the server's socket
 * count, memory and handshake load for no benefit.
 *
 * Ref-counted: the connection is torn down only when the last consumer releases
 * it. If the auth context changes (login / workspace switch) the underlying
 * socket is rebuilt so the handshake always carries fresh credentials; each
 * consumer re-attaches its own listeners via effects keyed on the same auth.
 *
 * Consumers MUST attach listeners with a named handler and remove exactly that
 * handler on cleanup (`socket.off(event, handler)`) — never `removeAllListeners`
 * — since the socket is shared.
 */
export function acquireChatSocket(auth: ChatSocketAuth): Socket {
    const key = keyOf(auth);
    if (socket && key !== currentKey) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
    if (!socket) {
        currentKey = key;
        socket = io(`${SOCKET_URL}/chat`, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            auth: {
                token: auth.token,
                tenantId: auth.tenantId || 'global',
                dbName: auth.dbName,
                memberId: auth.memberId,
            },
        });
    }
    refCount += 1;
    return socket;
}

/** Release a previously-acquired reference. Tears the socket down at zero. */
export function releaseChatSocket(): void {
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0 && socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
        currentKey = '';
    }
}
