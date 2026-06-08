import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis client for the gateway. Used to enforce the single-device session
 * policy: every authenticated request checks that the token's session id
 * matches the user's current active session (`session:<userId>`).
 *
 * Mirrors the connection setup used by the other services (REDIS_URL first,
 * then REDIS_HOST/PORT). Fails open if Redis is unreachable so the gateway
 * never hard-blocks traffic on a Redis hiccup.
 */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useFactory: (config: ConfigService) => {
                const url = config.get<string>('REDIS_URL');
                if (url) {
                    const client = new Redis(url, {
                        connectTimeout: 5000,
                        maxRetriesPerRequest: 1,
                        enableOfflineQueue: false,
                    });
                    client.on('error', (err) => console.error('[gateway] Redis error:', err.message));
                    return client;
                }

                const host = config.get('REDIS_HOST', 'localhost');
                const port = parseInt(config.get('REDIS_PORT', '6379'), 10);
                const password = config.get('REDIS_PASSWORD');
                const redisTls = config.get('REDIS_TLS') === 'true';

                const client = new Redis({
                    host,
                    port,
                    password: password || undefined,
                    ...(redisTls ? { tls: {} } : {}),
                    connectTimeout: 5000,
                    maxRetriesPerRequest: 1,
                    enableOfflineQueue: false,
                });
                client.on('error', (err) => console.error('[gateway] Redis error:', err.message));
                return client;
            },
            inject: [ConfigService],
        },
    ],
    exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
