import { Controller, Post, Get, Body, Param, Query, Patch } from '@nestjs/common';
import { GatepassService } from './gatepass.service';

@Controller('gatepass')
export class GatepassController {
  constructor(private gatepassService: GatepassService) {}

  @Post()
  create(@Body() body: any) {
    return this.gatepassService.createGatepass(body);
  }

  @Get()
  findAll(@Query('residentId') residentId: string) {
    return this.gatepassService.getGatepasses(residentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gatepassService.getGatepassById(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body('securityMemberId') securityMemberId: string) {
    return this.gatepassService.approveGatepass(id, securityMemberId);
  }
}
