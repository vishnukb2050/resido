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
  app.enableCors();
  const port = process.env.PORT || 3007;
  await app.listen(port);
  console.log(`Complaint-service running on port ${port}`);
}
bootstrap();
