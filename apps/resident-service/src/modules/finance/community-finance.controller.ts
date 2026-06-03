import { Controller, Get, Post, Delete, Body, Query, Headers, Param, UseInterceptors } from '@nestjs/common';
import { CommunityFinanceService } from './community-finance.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { AddCommunityTransactionDto, UpdateMaintenanceConfigDto, GenerateBillsDto } from './community-finance.dto';

@Controller('community/finance')
@UseInterceptors(TenantInterceptor)
export class CommunityFinanceController {
    constructor(private readonly financeService: CommunityFinanceService) {}

    // ─── Maintenance Config ──────────────────────────────
    @Get('maintenance/config')
    async getMaintenanceConfig(@Headers('x-tenant-id') tenantId: string) {
        return this.financeService.getMaintenanceConfig(tenantId);
    }

    @Post('maintenance/config')
    async updateMaintenanceConfig(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-phone') phone: string,
        @Headers('x-user-role') role: string,
        @Body() data: UpdateMaintenanceConfigDto,
    ) {
        return this.financeService.updateMaintenanceConfig(tenantId, { authUserId: userId, authUserPhone: phone, role }, data);
    }

    // ─── Ledger Transactions ─────────────────────────────
    @Post('transactions')
    async addTransaction(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-phone') phone: string,
        @Headers('x-user-role') role: string,
        @Body() data: AddCommunityTransactionDto,
    ) {
        return this.financeService.addTransaction(tenantId, { authUserId: userId, authUserPhone: phone, role }, data);
    }

    @Get('transactions')
    async getTransactions(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-phone') phone: string,
        @Headers('x-user-role') role: string,
        @Query() query: any,
    ) {
        return this.financeService.getTransactions(tenantId, { authUserId: userId, authUserPhone: phone, role }, query);
    }

    // ─── Maintenance Bills ───────────────────────────────
    @Post('maintenance/generate')
    async generateBills(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-phone') phone: string,
        @Headers('x-user-role') role: string,
        @Body() body: GenerateBillsDto,
    ) {
        return this.financeService.generateBills(tenantId, { authUserId: userId, authUserPhone: phone, role }, body);
    }

    @Get('maintenance/status')
    async getMaintenanceStatus(
        @Headers('x-tenant-id') tenantId: string,
        @Query('month') month: number,
        @Query('year') year: number,
    ) {
        return this.financeService.getMaintenanceStatus(tenantId, Number(month), Number(year));
    }

    @Get('maintenance/my-bills')
    async getResidentBills(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-phone') phone: string,
    ) {
        return this.financeService.getResidentBills({ tenantId, authUserId: userId, authUserPhone: phone });
    }

    @Post('maintenance/submit-proof/:billId')
    async submitPaymentProof(@Param('billId') billId: string, @Body() body: any) {
        return this.financeService.submitPaymentProof(billId, body);
    }

    @Post('maintenance/verify/:billId')
    async verifyPayment(
        @Param('billId') billId: string,
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-phone') phone: string,
        @Headers('x-user-role') role: string,
        @Body() body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string; adminNote?: string },
    ) {
        return this.financeService.verifyPayment(
            billId,
            tenantId,
            { authUserId: userId, authUserPhone: phone, role },
            body,
        );
    }

    // ─── Reports ─────────────────────────────────────────
    @Get('reports')
    async getReports(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-phone') phone: string,
        @Headers('x-user-role') role: string,
        @Query() query: { period: 'day' | 'week' | 'month'; year: number },
    ) {
        return this.financeService.getReports(tenantId, { authUserId: userId, authUserPhone: phone, role }, query);
    }

    // ─── Payment Splits ──────────────────────────────────
    @Post('splits')
    async createSplit(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-phone') phone: string,
        @Headers('x-user-role') role: string,
        @Body() body: any,
    ) {
        return this.financeService.createSplit(
            tenantId,
            { authUserId: userId, authUserPhone: phone, role },
            body,
        );
    }

    @Get('splits')
    async listSplits(@Headers('x-tenant-id') tenantId: string) {
        return this.financeService.listSplits(tenantId);
    }

    @Delete('splits/:id')
    async deleteSplit(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-phone') phone: string,
        @Headers('x-user-role') role: string,
        @Param('id') id: string,
    ) {
        return this.financeService.deleteSplit(tenantId, id, {
            authUserId: userId,
            authUserPhone: phone,
            role,
        });
    }

    @Get('splits/mine')
    async getMySplitShares(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-phone') phone: string,
    ) {
        return this.financeService.getMySplitShares({ tenantId, authUserId: userId, authUserPhone: phone });
    }

    @Post('splits/submit-proof/:shareId')
    async submitSplitProof(@Param('shareId') shareId: string, @Body() body: any) {
        return this.financeService.submitSplitProof(shareId, body);
    }

    @Post('splits/verify/:shareId')
    async verifySplitShare(
        @Param('shareId') shareId: string,
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') userId: string,
        @Headers('x-user-phone') phone: string,
        @Headers('x-user-role') role: string,
        @Body() body: any,
    ) {
        return this.financeService.verifySplitShare(
            shareId,
            tenantId,
            { authUserId: userId, authUserPhone: phone, role },
            body,
        );
    }
}
