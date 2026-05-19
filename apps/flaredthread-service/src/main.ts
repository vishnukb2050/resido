import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
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
    await app.listen(3008);
    console.log(`Blog Service is running on: ${await app.getUrl()}`);
}
bootstrap();
