import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, Query, UseGuards } from '@nestjs/common';
import { AmenitiesService } from './amenities.service';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

// Amenities are community infrastructure — only admins/managers may manage them.
const MANAGE_ROLES = ['APARTMENT_ADMIN', 'ADMIN_STAFF'];

@Controller('community/amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...MANAGE_ROLES)
  create(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.amenitiesService.createAmenity(tenantId, data);
  }

  @Get()
  findAll(@Headers('x-tenant-id') tenantId: string) {
    return this.amenitiesService.getAmenities(tenantId);
  }

  @Get('my-bookings')
  findMyBookings(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') memberId: string
  ) {
    return this.amenitiesService.getMyBookings(tenantId, memberId);
  }

  @Get(':id')
  findOne(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('date') date?: string
  ) {
    return this.amenitiesService.getAmenityById(id, tenantId, date);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...MANAGE_ROLES)
  update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.amenitiesService.updateAmenity(id, tenantId, data);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...MANAGE_ROLES)
  remove(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.amenitiesService.deleteAmenity(id, tenantId);
  }

  @Post(':id/book')
  bookAmenity(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') memberId: string,
    @Param('id') id: string,
    @Body() data: any
  ) {
    return this.amenitiesService.createBooking(tenantId, memberId, id, data);
  }

  @Get(':id/bookings')
  getAmenityBookings(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Query('date') date: string
  ) {
    return this.amenitiesService.getAmenityBookings(tenantId, id, date);
  }
}
