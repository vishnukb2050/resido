import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { TenantPrismaModule } from '../prisma/tenant-prisma.module';

@Module({
    imports: [TenantPrismaModule],
    controllers: [FinanceController],
    providers: [FinanceService],
})
export class FinanceModule {}
