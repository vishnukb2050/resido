import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { buildRedisClient, REDIS_CLIENT } from './redis.client';

@Global()
@Module({
    providers: [
        {
            provide: REDIS_CLIENT,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => buildRedisClient(config),
        },
        CacheService,
    ],
    exports: [CacheService, REDIS_CLIENT],
})
export class CacheModule {}
