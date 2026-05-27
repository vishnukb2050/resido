import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Headers,
    Post,
    Put,
    Query,
    UseInterceptors,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { UpsertAttendanceConfigDto } from './dto/upsert-attendance-config.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Controller('community/attendance')
@UseInterceptors(TenantInterceptor)
export class AttendanceController {
    constructor(private readonly service: AttendanceService) {}

    private requireTenantId(tenantId?: string): string {
        const id = (tenantId || '').trim();
        if (!id) {
            throw new BadRequestException(
                'Community context is required. Open your community workspace and try again.',
            );
        }
        return id;
    }

    // ── Config (admin) ─────────────────────────────────────────────
    @Get('config')
    getConfig(@Headers('x-tenant-id') tenantId: string) {
        return this.service.getConfig(this.requireTenantId(tenantId));
    }

    @Put('config')
    upsertConfig(
        @Headers('x-tenant-id') tenantId: string,
        @Body() body: UpsertAttendanceConfigDto,
    ) {
        return this.service.upsertConfig(this.requireTenantId(tenantId), body);
    }

    // ── Mark attendance (staff) ────────────────────────────────────
    @Post('mark')
    mark(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Body() body: MarkAttendanceDto,
    ) {
        return this.service.markAttendance({
            tenantId: this.requireTenantId(tenantId),
            authUserId,
            authUserPhone,
            latitude: body.latitude,
            longitude: body.longitude,
            notes: body.notes,
        });
    }

    // ── Admin reports ───────────────────────────────────────────────
    @Get('records')
    list(
        @Headers('x-tenant-id') tenantId: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('date') date?: string,
        @Query('memberId') memberId?: string,
    ) {
        return this.service.listAttendance({
            tenantId: this.requireTenantId(tenantId),
            from,
            to,
            date,
            memberId,
        });
    }

    // ── Staff own reports ───────────────────────────────────────────
    @Get('me')
    listOwn(
        @Headers('x-tenant-id') tenantId: string,
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('date') date?: string,
    ) {
        return this.service.listOwnAttendance({
            tenantId: this.requireTenantId(tenantId),
            authUserId,
            authUserPhone,
            from,
            to,
            date,
        });
    }
}
