import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
    // NOTE: Schema sync is intentionally NOT done here. `prisma db push` in the
    // request/boot path races multiple replicas and slows cold starts. The
    // docker-compose `start.sh` (local) and the dedicated `db-migrate` ECS task
    // (prod) own schema changes instead.

    const app = await NestFactory.create(AppModule);

    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ limit: '50mb', extended: true }));

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    const corsOrigins = process.env.CORS_ORIGINS;
    app.enableCors(
        corsOrigins ? { origin: corsOrigins.split(',').map((o) => o.trim()), credentials: true } : { origin: '*' },
    );
    app.enableShutdownHooks();
    app.getHttpAdapter().getInstance().get('/health', (_req: any, res: any) =>
        res.status(200).json({ status: 'ok' }),
    );

    // Prioritize 3001 to avoid the global PORT=3000 conflict in the .env
    const port = process.env.AUTH_PORT || 3001;
    await app.listen(port);
    console.log(`Auth Service running on port ${port}`);
}
bootstrap();
