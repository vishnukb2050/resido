import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantPrismaModule } from './modules/prisma/tenant-prisma.module';
import { MembersModule } from './modules/members/members.module';
import { StorageModule } from './modules/storage/storage.module';
import { CommunityModule } from './modules/community/community.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TenantPrismaModule,
    MembersModule,
    StorageModule,
    CommunityModule,
  ],
})
export class AppModule { }
