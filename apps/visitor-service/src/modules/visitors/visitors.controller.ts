import { Controller, Get, Post, Body } from '@nestjs/common';
import { VisitorsService } from './visitors.service';

@Controller('visitors')
export class VisitorsController {
  constructor(private visitorsService: VisitorsService) {}

  @Get('register')
  getRegister() {
    return this.visitorsService.getVisitorRegister();
  }

  @Post()
  create(@Body() body: any) {
    return this.visitorsService.createEntry(body);
  }
}
