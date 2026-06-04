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
