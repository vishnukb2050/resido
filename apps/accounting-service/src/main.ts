import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { execSync } from 'child_process';

async function bootstrap() {
  // Auto-sync database on startup
  // try {
  //     console.log('Syncing database schema...');
  //     execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  //     console.log('Database synced successfully.');
  // } catch (error) {
  //     console.error('Database sync failed, but starting app anyway:', error.message);
  // }

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
  const port = process.env.PORT || 3003;
  await app.listen(port);
  console.log(`Accounting-service running on port ${port}`);
}
bootstrap();
