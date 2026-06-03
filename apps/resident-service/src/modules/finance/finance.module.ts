import { Module } from '@nestjs/common';
import { CommunityFinanceService } from './community-finance.service';
import { CommunityFinanceController } from './community-finance.controller';
import { TenantPrismaModule } from '../prisma/tenant-prisma.module';

/** Community ledger + maintenance billing (`/community/finance/*`). */
@Module({
    imports: [TenantPrismaModule],
    controllers: [CommunityFinanceController],
    providers: [CommunityFinanceService],
})
export class FinanceModule {}
