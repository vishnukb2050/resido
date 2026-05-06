import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  app.setGlobalPrefix('resident');
  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Resident-service running on port ${port}`);
}
bootstrap();
