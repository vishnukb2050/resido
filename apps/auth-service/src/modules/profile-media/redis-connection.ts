import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';

export function bullmqRedisConnection(config: ConfigService): ConnectionOptions {
    const url = config.get<string>('REDIS_URL');
    if (url) {
        return { url };
    }
    const host = config.get<string>('REDIS_HOST', 'localhost');
    const port = parseInt(config.get<string>('REDIS_PORT', '6379'), 10);
    const password = config.get<string>('REDIS_PASSWORD');
    const tls = config.get<string>('REDIS_TLS') === 'true';
    return {
        host,
        port,
        password: password || undefined,
        ...(tls ? { tls: {} } : {}),
        maxRetriesPerRequest: null,
    };
}
