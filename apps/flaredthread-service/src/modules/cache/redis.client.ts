import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

/**
 * Builds ioredis connection options from the same env vars the BullMQ queues
 * use, so the cache shares the project's single AWS ElastiCache instance.
 * Prefers REDIS_URL; otherwise falls back to discrete REDIS_HOST/PORT vars.
 */
export function buildRedisClient(config: ConfigService): Redis {
    const url = config.get<string>('REDIS_URL');
    if (url) {
        return new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: false });
    }
    const host = config.get<string>('REDIS_HOST', 'localhost');
    const port = parseInt(config.get<string>('REDIS_PORT', '6379'), 10);
    const password = config.get<string>('REDIS_PASSWORD');
    const tls = config.get<string>('REDIS_TLS') === 'true';
    const opts: RedisOptions = {
        host,
        port,
        password: password || undefined,
        maxRetriesPerRequest: 2,
        // Don't crash the whole service if Redis is briefly unreachable — the
        // cache layer degrades gracefully to direct calls.
        enableOfflineQueue: false,
        ...(tls ? { tls: {} } : {}),
    };
    return new Redis(opts);
}

export const REDIS_CLIENT = 'REDIS_CLIENT';
