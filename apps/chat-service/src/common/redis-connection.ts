import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

/**
 * Shared Redis client options for Socket.IO adapter and pub/sub subscribers.
 * Prefers REDIS_URL (ECS Secrets Manager); falls back to REDIS_HOST/PORT.
 */
export function buildRedisClient(config: ConfigService): Redis {
    const url = config.get<string>('REDIS_URL');
    if (url) {
        return new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
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
        enableOfflineQueue: false,
        ...(tls ? { tls: {} } : {}),
    };
    return new Redis(opts);
}
