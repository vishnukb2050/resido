import { Controller, Get, Post, Body, Query, Headers, Param, UseInterceptors } from '@nestjs/common';
import { CommunityFinanceService } from './community-finance.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('community/finance')
@UseInterceptors(TenantInterceptor)
export class CommunityFinanceController {
    constructor(private readonly financeService: CommunityFinanceService) {}

    @Get('maintenance/config')
    async getMaintenanceConfig(@Headers('x-tenant-id') tenantId: string) {
        return this.financeService.getMaintenanceConfig(tenantId);
    }

    @Post('maintenance/config')
    async updateMaintenanceConfig(
        @Headers('x-tenant-id') tenantId: string,
        @Body() data: any
    ) {
        return this.financeService.updateMaintenanceConfig(tenantId, data);
    }

    @Post('transactions')
    async addTransaction(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-member-id') memberId: string,
        @Body() data: any
    ) {
        return this.financeService.addTransaction(tenantId, memberId, data);
    }

    @Get('transactions')
    async getTransactions(
        @Headers('x-tenant-id') tenantId: string,
        @Query() query: any
    ) {
        return this.financeService.getTransactions(tenantId, query);
    }

    @Post('maintenance/generate')
    async generateBills(
        @Headers('x-tenant-id') tenantId: string,
        @Body() body: { month: number; year: number }
    ) {
        return this.financeService.generateBills(tenantId, body);
    }

    @Get('maintenance/status')
    async getMaintenanceStatus(
        @Headers('x-tenant-id') tenantId: string,
        @Query('month') month: number,
        @Query('year') year: number
    ) {
        return this.financeService.getMaintenanceStatus(tenantId, Number(month), Number(year));
    }

    @Get('maintenance/my-bills')
    async getResidentBills(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-member-id') memberId: string
    ) {
        return this.financeService.getResidentBills(tenantId, memberId);
    }

    @Post('maintenance/submit-proof/:billId')
    async submitPaymentProof(
        @Param('billId') billId: string,
        @Body() body: any
    ) {
        return this.financeService.submitPaymentProof(billId, body);
    }

    @Post('maintenance/verify/:billId')
    async verifyPayment(
        @Param('billId') billId: string,
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-member-id') addedById: string,
        @Body() body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }
    ) {
        return this.financeService.verifyPayment(billId, tenantId, addedById, body);
    }

    @Get('reports')
    async getReports(
        @Headers('x-tenant-id') tenantId: string,
        @Query() query: { period: 'day' | 'week' | 'month'; year: number }
    ) {
        return this.financeService.getReports(tenantId, query);
    }
}
