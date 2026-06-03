import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './modules/cache/redis-io.adapter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    // Back WebSockets with Redis pub/sub so live comment/feed broadcasts reach
    // clients across every replica (required once we scale past one instance).
    const redisIoAdapter = new RedisIoAdapter(app);
    try {
        await redisIoAdapter.connectToRedis();
        app.useWebSocketAdapter(redisIoAdapter);
    } catch (e: any) {
        console.warn('[ws] Redis adapter unavailable, falling back to in-memory:', e?.message);
    }

    app.enableShutdownHooks();
    app.getHttpAdapter().getInstance().get('/health', (_req: any, res: any) =>
        res.status(200).json({ status: 'ok' }),
    );

    await app.listen(3008);
    console.log(`Blog Service is running on: ${await app.getUrl()}`);
}
bootstrap();
