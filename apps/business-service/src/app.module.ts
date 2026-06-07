import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { BusinessModule } from './modules/business/business.module';
import { CacheModule } from './modules/cache/cache.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CacheModule,
        PrismaModule,
        BusinessModule,
    ],
})
export class AppModule {}
