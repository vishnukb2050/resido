import { Body, Controller, Get, Headers, Post, Put, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('community/attendance')
export class AttendanceController {
    constructor(private readonly service: AttendanceService) {}

    // ── Config (admin) ─────────────────────────────────────────────
    @Get('config')
    getConfig() {
        return this.service.getConfig();
    }

    @Put('config')
    upsertConfig(
        @Body() body: { latitude: number; longitude: number; radiusMeters?: number; address?: string },
    ) {
        return this.service.upsertConfig(body);
    }

    // ── Mark attendance (staff) ────────────────────────────────────
    @Post('mark')
    mark(
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Body() body: { latitude: number; longitude: number; notes?: string },
    ) {
        return this.service.markAttendance({
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
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('date') date?: string,
        @Query('memberId') memberId?: string,
    ) {
        return this.service.listAttendance({ from, to, date, memberId });
    }

    // ── Staff own reports ───────────────────────────────────────────
    @Get('me')
    listOwn(
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('date') date?: string,
    ) {
        return this.service.listOwnAttendance({
            authUserId,
            authUserPhone,
            from,
            to,
            date,
        });
    }
}
