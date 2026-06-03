import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
    private adapterConstructor: ReturnType<typeof createAdapter>;

    async connectToRedis(): Promise<void> {
        const isTls = process.env.REDIS_TLS === 'true';
        const redisUrl = `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
        
        const pubClient = createClient({
            url: redisUrl,
            socket: isTls ? { tls: true } : undefined,
        });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        this.adapterConstructor = createAdapter(pubClient, subClient);
    }

    createIOServer(port: number, options?: any): any {
        const server = super.createIOServer(port, options);
        server.adapter(this.adapterConstructor);
        return server;
    }
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    const origins = process.env.CORS_ORIGINS;
    app.enableCors(
        origins ? { origin: origins.split(',').map((o) => o.trim()), credentials: true } : { origin: '*', credentials: true },
    );

    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);

    app.enableShutdownHooks();
    app.getHttpAdapter().getInstance().get('/health', (_req: any, res: any) =>
        res.status(200).json({ status: 'ok' }),
    );

    const port = process.env.PORT || 3004;
    await app.listen(port);
    console.log(`Chat Service running on port ${port}`);
}
bootstrap();
