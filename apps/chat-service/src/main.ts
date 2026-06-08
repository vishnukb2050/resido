import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { RedisIoAdapter } from './common/redis-io.adapter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    const origins = process.env.CORS_ORIGINS;
    app.enableCors(
        origins ? { origin: origins.split(',').map((o) => o.trim()), credentials: true } : { origin: '*', credentials: true },
    );

    const redisIoAdapter = new RedisIoAdapter(app);
    try {
        await redisIoAdapter.connectToRedis();
        app.useWebSocketAdapter(redisIoAdapter);
    } catch (e: any) {
        // In production we run multiple replicas; without the Redis adapter,
        // `server.to(room)` would only reach sockets on the local task and
        // chat messages would silently miss users on other tasks. Fail fast so
        // the task is replaced rather than serving a broken, split-brain socket
        // layer. Locally (single instance) the in-memory fallback is fine.
        if (process.env.NODE_ENV === 'production') {
            console.error('[chat] FATAL: Redis Socket.IO adapter unavailable in production:', e?.message);
            process.exit(1);
        }
        console.warn('[chat] Redis adapter unavailable, using in-memory sockets:', e?.message);
    }

    app.enableShutdownHooks();
    app.getHttpAdapter().getInstance().get('/health', (_req: any, res: any) =>
        res.status(200).json({ status: 'ok' }),
    );

    const port = process.env.PORT || 3004;
    await app.listen(port);
    console.log(`Chat Service running on port ${port}`);
}
bootstrap();
