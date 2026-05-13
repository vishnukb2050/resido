import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bodyParser: false });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.enableCors({ origin: '*' });
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`API Gateway running on port ${port}`);
}
bootstrap();
