import { Controller, Get, Post, Patch, Delete, Body, Headers, Param, UseInterceptors } from '@nestjs/common';
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

    @Get('mine')
    async getMyReminders(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
    ) {
        return this.remindersService.getMyReminders({
            tenantId,
            authUserId,
            authUserPhone,
        });
    }

    @Post(':id/trigger')
    async triggerReminder(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string
    ) {
        await this.remindersService.dispatchReminder(tenantId, id);
        return { success: true, message: 'Reminder dispatch triggered successfully.' };
    }

    @Patch(':id')
    async updateReminder(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string,
        @Body() data: any,
    ) {
        return this.remindersService.updateReminder(tenantId, id, data);
    }

    @Delete(':id')
    async deleteReminder(
        @Headers('x-tenant-id') tenantId: string,
        @Param('id') id: string
    ) {
        return this.remindersService.deleteReminder(tenantId, id);
    }
}
