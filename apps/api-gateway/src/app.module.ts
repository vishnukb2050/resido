import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ProxyModule } from './modules/proxy/proxy.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        // Edge rate limiting: protects every downstream service from abuse /
        // accidental client retry storms. Defaults to 120 req / 60s per IP,
        // tunable via THROTTLE_TTL / THROTTLE_LIMIT env.
        ThrottlerModule.forRoot([
            {
                ttl: Number(process.env.THROTTLE_TTL) || 60_000,
                limit: Number(process.env.THROTTLE_LIMIT) || 120,
            },
        ]),
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
