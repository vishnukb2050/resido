import { Controller, Get, Post, Delete, Body, UseInterceptors, Query, Param, Headers } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('community/parking')
@UseInterceptors(TenantInterceptor)
export class ParkingController {
    constructor(private parkingService: ParkingService) {}

    @Post('slots')
    createSlot(@Body() data: { name: string; type: 'RESIDENT' | 'GUEST'; assignedUnitId?: string; assignedVehicle?: string }) {
        return this.parkingService.createSlot(data);
    }

    @Get('slots')
    getSlots(@Query('limit') limit?: string, @Query('offset') offset?: string) {
        return this.parkingService.getSlots(
            limit ? parseInt(limit, 10) : 50,
            offset ? parseInt(offset, 10) : 0,
        );
    }

    @Delete('slots/:id')
    deleteSlot(@Param('id') id: string) {
        return this.parkingService.deleteSlot(id);
    }

    @Post('slots/:id/assign')
    assignSlot(@Param('id') id: string, @Body() data: { assignedUnitId: string | null; assignedVehicle: string | null }) {
        return this.parkingService.assignSlot(id, data);
    }

    @Post('slots/:id/book')
    bookSlot(
        @Param('id') id: string,
        @Headers('x-user-id') authUserId: string,
        @Body() data: { memberId: string; residentName: string; unitInfo: string; vehicleNumber: string; startTime: string; endTime: string }
    ) {
        return this.parkingService.bookSlot(id, data);
    }

    @Post('bookings/:id/free')
    freeBooking(@Param('id') id: string) {
        return this.parkingService.freeBooking(id);
    }

    @Get('bookings/active')
    getActiveBookings(@Query('limit') limit?: string, @Query('offset') offset?: string) {
        return this.parkingService.getActiveBookings(
            limit ? parseInt(limit, 10) : 50,
            offset ? parseInt(offset, 10) : 0,
        );
    }
}
