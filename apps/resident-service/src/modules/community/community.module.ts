import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { TenantPrismaModule } from '../prisma/tenant-prisma.module';
import { CacheModule } from '../cache/cache.module';

@Module({
    imports: [TenantPrismaModule, CacheModule],
    controllers: [CommunityController],
    providers: [CommunityService],
    exports: [CommunityService],
})
export class CommunityModule {}
