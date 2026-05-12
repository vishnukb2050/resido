import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { FinanceService } from './finance.service';

@Controller('finance')
export class FinanceController {
    constructor(private readonly financeService: FinanceService) {}

    @Get('overview')
    async getOverview(
        @Headers('x-user-member-id') memberId: string, 
        @Headers('x-tenant-id') tenantId: string,
        @Query('month') month: number,
        @Query('year') year: number
    ) {
        return this.financeService.getOverview(memberId, tenantId, Number(month), Number(year));
    }

    @Post('transactions')
    async addTransaction(
        @Headers('x-user-member-id') memberId: string, 
        @Headers('x-tenant-id') tenantId: string,
        @Body() data: any
    ) {
        return this.financeService.addTransaction(memberId, tenantId, data);
    }

    @Get('transactions')
    async getTransactions(
        @Headers('x-user-member-id') memberId: string, 
        @Headers('x-tenant-id') tenantId: string,
        @Query() filters: any
    ) {
        return this.financeService.getTransactions(memberId, tenantId, {
            ...filters,
            month: Number(filters.month),
            year: Number(filters.year)
        });
    }

    @Get('budgets')
    async getBudgets(
        @Headers('x-user-member-id') memberId: string, 
        @Headers('x-tenant-id') tenantId: string,
        @Query('month') month: number,
        @Query('year') year: number
    ) {
        return this.financeService.getBudgets(memberId, tenantId, Number(month), Number(year));
    }

    @Post('budgets')
    async createBudget(
        @Headers('x-user-member-id') memberId: string, 
        @Headers('x-tenant-id') tenantId: string,
        @Body() data: any
    ) {
        return this.financeService.createBudget(memberId, tenantId, data);
    }

    @Get('reports/categories')
    async getCategoryBreakdown(
        @Headers('x-user-member-id') memberId: string, 
        @Headers('x-tenant-id') tenantId: string,
        @Query('month') month: number,
        @Query('year') year: number
    ) {
        return this.financeService.getCategoryBreakdown(memberId, tenantId, Number(month), Number(year));
    }
}
