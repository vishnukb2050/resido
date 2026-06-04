import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useFactory: (config: ConfigService) => {
                const url = config.get<string>('REDIS_URL');
                if (url) {
                    console.log('[DEBUG] Connecting to Redis via REDIS_URL');
                    const client = new Redis(url, {
                        connectTimeout: 5000,
                        maxRetriesPerRequest: 1,
                        enableOfflineQueue: false,
                    });
                    client.on('connect', () => console.log('[DEBUG] Redis Client Connected'));
                    client.on('ready', () => console.log('[DEBUG] Redis Client Ready'));
                    client.on('error', (err) => console.error('[DEBUG] Redis Client Error:', err.message));
                    return client;
                }

                const host = config.get('REDIS_HOST', 'localhost');
                const port = parseInt(config.get('REDIS_PORT', '6379'), 10);
                const password = config.get('REDIS_PASSWORD');
                const redisTls = config.get('REDIS_TLS') === 'true';

                console.log(`[DEBUG] Connecting to Redis: ${host}:${port} tls=${redisTls}`);
                const client = new Redis({
                    host,
                    port,
                    password: password || undefined,
                    ...(redisTls ? { tls: {} } : {}),
                    connectTimeout: 5000,
                    maxRetriesPerRequest: 1,
                    enableOfflineQueue: false,
                });

                client.on('connect', () => console.log('[DEBUG] Redis Client Connected'));
                client.on('ready', () => console.log('[DEBUG] Redis Client Ready'));
                client.on('error', (err) => console.error('[DEBUG] Redis Client Error:', err.message));

                return client;
            },
            inject: [ConfigService],
        },
    ],
    exports: ['REDIS_CLIENT'],
})
export class CacheModule {}
