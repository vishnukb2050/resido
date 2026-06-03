import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const origins = process.env.CORS_ORIGINS;
  app.enableCors(
    origins ? { origin: origins.split(',').map((o) => o.trim()), credentials: true } : { origin: '*' },
  );
  app.enableShutdownHooks();
  app.getHttpAdapter().getInstance().get('/health', (_req: any, res: any) =>
    res.status(200).json({ status: 'ok' }),
  );
  const port = process.env.PORT || 3005;
  await app.listen(port);
  console.log(`Notification-service running on port ${port}`);
}
bootstrap();
