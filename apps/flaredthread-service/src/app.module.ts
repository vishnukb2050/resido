import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { StorageModule } from './modules/storage/storage.module';
import { MediaModule } from './modules/media/media.module';
import { CacheModule } from './modules/cache/cache.module';
import { TenantMiddleware } from './middleware/tenant.middleware';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CacheModule,
        PrismaModule,
        BlogsModule,
        StorageModule,
        MediaModule,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // Bind tenant context per-request via als.run (replaces the previous
        // enterWith interceptor). Covers all tenant-scoped route prefixes.
        consumer
            .apply(TenantMiddleware)
            .forRoutes('threads', 'flares', 'blogs', 'storage', 'media');
    }
}
