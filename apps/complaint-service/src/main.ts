import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  app.setGlobalPrefix('complaint');
  const port = process.env.PORT || 3007;
  await app.listen(port);
  console.log(`Complaint-service running on port ${port}`);
}
bootstrap();
