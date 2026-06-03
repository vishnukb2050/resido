import { Controller, Post, Get, Body, Param, Query, Patch, Req, UseInterceptors } from '@nestjs/common';
import { GatepassService } from './gatepass.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@UseInterceptors(TenantInterceptor)
@Controller('gatepass')
export class GatepassController {
  constructor(private gatepassService: GatepassService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.gatepassService.createGatepass(req.tenantId, body);
  }

  @Get()
  findAll(@Req() req: any, @Query('residentId') residentId: string) {
    return this.gatepassService.getGatepasses(req.tenantId, residentId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.gatepassService.getGatepassById(req.tenantId, id);
  }

  @Patch(':id/approve')
  approve(
    @Req() req: any,
    @Param('id') id: string,
    @Body('securityMemberId') securityMemberId: string,
  ) {
    return this.gatepassService.approveGatepass(req.tenantId, id, securityMemberId);
  }
}
