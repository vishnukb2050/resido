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
                const port = config.get('REDIS_PORT', 6379);
                const password = config.get('REDIS_PASSWORD');
                
                return new Redis({
                    host,
                    port,
                    password,
                    lazyConnect: false,
                    enableReadyCheck: false,
                    enableOfflineQueue: false, // This will prevent the hang and throw an error instead
                    maxRetriesPerRequest: 0,
                });
            },
            inject: [ConfigService],
        },
    ],
    exports: ['REDIS_CLIENT'],
})
export class CacheModule {}
