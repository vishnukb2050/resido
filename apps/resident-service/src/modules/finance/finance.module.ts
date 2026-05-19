import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { CommunityFinanceService } from './community-finance.service';
import { CommunityFinanceController } from './community-finance.controller';
import { TenantPrismaModule } from '../prisma/tenant-prisma.module';

@Module({
    imports: [TenantPrismaModule],
    controllers: [FinanceController, CommunityFinanceController],
    providers: [FinanceService, CommunityFinanceService],
})
export class FinanceModule {}
