import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import type Redis from 'ioredis';
import { ProxyModule } from './modules/proxy/proxy.module';
import { RedisModule } from './common/redis.module';
import { RedisThrottlerStorage } from './common/redis-throttler.storage';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisModule,
        // Edge rate limiting: protects every downstream service from abuse /
        // accidental client retry storms. Defaults to 120 req / 60s per IP,
        // tunable via THROTTLE_TTL / THROTTLE_LIMIT env. Backed by Redis so the
        // limit is enforced ACROSS all gateway tasks (not per-instance).
        ThrottlerModule.forRootAsync({
            imports: [RedisModule],
            inject: ['REDIS_CLIENT'],
            useFactory: (redis: Redis) => ({
                throttlers: [
                    {
                        ttl: Number(process.env.THROTTLE_TTL) || 60_000,
                        limit: Number(process.env.THROTTLE_LIMIT) || 120,
                    },
                ],
                storage: new RedisThrottlerStorage(redis),
            }),
        }),
        ProxyModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
