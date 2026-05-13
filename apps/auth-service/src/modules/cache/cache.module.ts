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
                const host = config.get('REDIS_HOST', 'localhost');
                const port = parseInt(config.get('REDIS_PORT', '6379'));
                const password = config.get('REDIS_PASSWORD');
                const redisTls = config.get('REDIS_TLS') === 'true';
                
                console.log(`[DEBUG] Connecting to Redis: ${host}:${port}`);
                const client = new Redis({
                    host,
                    port,
                    password,
                    ...(redisTls ? { tls: {} } : {}), // Only use TLS if configured
                    connectTimeout: 10000,
                    maxRetriesPerRequest: 3,
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
