import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    const corsOrigins = process.env.CORS_ORIGINS;
    app.enableCors(
        corsOrigins ? { origin: corsOrigins.split(',').map((o) => o.trim()), credentials: true } : { origin: '*' },
    );
    app.enableShutdownHooks();
    app.getHttpAdapter().getInstance().get('/health', (_req: any, res: any) =>
        res.status(200).json({ status: 'ok' }),
    );
    const port = process.env.PORT || 3009;
    await app.listen(port);
    console.log(`Business Service is running on port ${port}`);
}
bootstrap();
