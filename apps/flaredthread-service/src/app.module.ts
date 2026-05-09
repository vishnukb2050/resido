import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        BlogsModule,
        StorageModule,
    ],
})
export class AppModule {}
