import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { VisitorsService } from './visitors.service';

@Controller('visitors')
export class VisitorsController {
  constructor(private visitorsService: VisitorsService) {}

  @Get('register')
  getRegister(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
  ) {
    return this.visitorsService.getVisitorRegister(startDate, endDate, category);
  }

  @Post()
  create(@Body() body: any) {
    return this.visitorsService.createEntry(body);
  }

  @Post(':id/checkout')
  checkout(@Param('id') id: string) {
    return this.visitorsService.checkout(id);
  }
}
