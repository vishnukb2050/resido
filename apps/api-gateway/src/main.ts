import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bodyParser: false });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    // Restrict CORS to known origins in prod (CORS_ORIGINS=comma,separated).
    // Native mobile clients don't send an Origin header so they're unaffected;
    // this only constrains browser/admin callers. Falls back to '*' if unset.
    const origins = process.env.CORS_ORIGINS;
    app.enableCors(
        origins
            ? { origin: origins.split(',').map((o) => o.trim()), credentials: true }
            : { origin: '*' },
    );

    // Let Nest run onModuleDestroy/Prisma $disconnect on SIGTERM (ECS rolling
    // deploys send SIGTERM) so in-flight requests drain cleanly.
    app.enableShutdownHooks();

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`API Gateway running on port ${port}`);
}
bootstrap();
