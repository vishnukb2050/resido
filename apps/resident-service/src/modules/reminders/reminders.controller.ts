import { Controller, Get, Post, Delete, Body, Headers, Param, UseInterceptors } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('community/reminders')
@UseInterceptors(TenantInterceptor)
export class RemindersController {
    constructor(private readonly remindersService: RemindersService) {}

    @Post()
    async createReminder(
        @Headers('x-tenant-id') tenantId: string,
        @Body() data: any
    ) {
        return this.remindersService.createReminder(tenantId, data);
    }

    @Get()
    async getReminders(
        @Headers('x-tenant-id') tenantId: string
    ) {
        return this.remindersService.getReminders(tenantId);
    }

    @Post(':id/trigger')
    async triggerReminder(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string
    ) {
        await this.remindersService.dispatchReminder(tenantId, id);
        return { success: true, message: 'Reminder dispatch triggered successfully.' };
    }

    @Delete(':id')
    async deleteReminder(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string
    ) {
        return this.remindersService.deleteReminder(tenantId, id);
    }
}
