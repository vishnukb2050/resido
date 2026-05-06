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
                
                console.log(`[DEBUG] Redis Connection Attempt: ${host}:${port} (Password set: ${!!password})`);
                
                const client = new Redis({
                    host,
                    port,
                    password,
                    retryStrategy: (times) => {
                        console.log(`[DEBUG] Redis retry attempt ${times}`);
                        return Math.min(times * 50, 2000);
                    }
                });

                client.on('connect', () => console.log('[DEBUG] Redis Client Connected'));
                client.on('ready', () => console.log('[DEBUG] Redis Client Ready'));
                client.on('error', (err) => console.error('[DEBUG] Redis Client Error:', err.message));
                client.on('close', () => console.log('[DEBUG] Redis Client Closed'));

                return client;
            },
            inject: [ConfigService],
        },
    ],
    exports: ['REDIS_CLIENT'],
})
export class CacheModule {}
