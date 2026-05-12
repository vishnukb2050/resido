import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantPrismaModule } from './modules/prisma/tenant-prisma.module';
import { MembersModule } from './modules/members/members.module';
import { StorageModule } from './modules/storage/storage.module';
import { CommunityModule } from './modules/community/community.module';
import { EventsModule } from './modules/events/events.module';
import { TenantMiddleware } from './middleware/tenant.middleware';

import { DocumentsModule } from './modules/documents/documents.module';
import { NotesModule } from './modules/notes/notes.module';
import { FinanceModule } from './modules/finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantPrismaModule,
    MembersModule,
    StorageModule,
    CommunityModule,
    EventsModule,
    DocumentsModule,
    NotesModule,
    FinanceModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
