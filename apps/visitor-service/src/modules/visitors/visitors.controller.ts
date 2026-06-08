import { Controller, Get, Post, Body, Query, Param, Req, UseInterceptors } from '@nestjs/common';
import { VisitorsService } from './visitors.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@UseInterceptors(TenantInterceptor)
@Controller('visitors')
export class VisitorsController {
  constructor(private visitorsService: VisitorsService) {}

  @Get('register')
  getRegister(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.visitorsService.getVisitorRegister(
      req.tenantId,
      startDate,
      endDate,
      category,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 0,
    );
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.visitorsService.createEntry(req.tenantId, body);
  }

  @Post(':id/checkout')
  checkout(@Req() req: any, @Param('id') id: string) {
    return this.visitorsService.checkout(req.tenantId, id);
  }
}
