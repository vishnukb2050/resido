import { Module } from '@nestjs/common';
import { CommunityFinanceService } from './community-finance.service';
import { CommunityFinanceController } from './community-finance.controller';
import { TenantPrismaModule } from '../prisma/tenant-prisma.module';
import { CacheModule } from '../cache/cache.module';

/** Community ledger + maintenance billing (`/community/finance/*`). */
@Module({
    imports: [TenantPrismaModule, CacheModule],
    controllers: [CommunityFinanceController],
    providers: [CommunityFinanceService],
})
export class FinanceModule {}

