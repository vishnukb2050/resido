import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('resident/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Body() createEventDto: any, @Req() req: any) {
    const memberId = req.headers['x-member-id'];
    return this.eventsService.create(createEventDto, memberId);
  }

  @Get()
  findAll(@Req() req: any) {
    const memberId = req.headers['x-member-id'];
    const tenantId = req.headers['x-tenant-id'];
    return this.eventsService.findAll(memberId, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: any) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
