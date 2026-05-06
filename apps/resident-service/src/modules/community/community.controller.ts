import { Controller, Get, Post, Body, UseInterceptors, Req, Query, Param } from '@nestjs/common';
import { CommunityService } from './community.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('community')
@UseInterceptors(TenantInterceptor)
export class CommunityController {
    constructor(private communityService: CommunityService) {}

    // Notice Board
    @Get('notices')
    getNotices(@Req() req: any) {
        return this.communityService.getNotices(req.tenantDbName);
    }

    @Post('notices')
    createNotice(@Req() req: any, @Body() data: any) {
        return this.communityService.createNotice(req.tenantDbName, data);
    }

    // Polls
    @Get('polls')
    getPolls(@Req() req: any) {
        return this.communityService.getPolls(req.tenantDbName);
    }

    @Post('polls/vote')
    votePoll(@Req() req: any, @Body() body: { memberId: string; optionId: string }) {
        return this.communityService.votePoll(req.tenantDbName, body.memberId, body.optionId);
    }

    // Complaints
    @Get('complaints')
    getComplaints(@Req() req: any, @Query('memberId') memberId: string) {
        return this.communityService.getComplaints(req.tenantDbName, memberId);
    }

    @Post('complaints')
    createComplaint(@Req() req: any, @Body() data: any) {
        return this.communityService.createComplaint(req.tenantDbName, data.memberId, data);
    }

    // Gatepass / Visitors
    @Get('visitors')
    getVisitors(@Req() req: any, @Query('memberId') memberId: string) {
        return this.communityService.getVisitors(req.tenantDbName, memberId);
    }

    @Post('visitors/gatepass')
    createGatepass(@Req() req: any, @Body() data: any) {
        return this.communityService.createGatepass(req.tenantDbName, data.memberId, data);
    }

    // Calendar / Events
    @Get('events')
    getEvents(@Req() req: any, @Query('memberId') memberId: string) {
        return this.communityService.getEvents(req.tenantDbName, memberId);
    }

    @Post('events')
    createEvent(@Req() req: any, @Body() data: any) {
        return this.communityService.createEvent(req.tenantDbName, data.memberId, data);
    }

    @Get('members')
    getMembers(@Req() req: any) {
        return this.communityService.getMembers(req.tenantDbName);
    }

    @Get('gallery')
    getGallery(@Req() req: any) {
        return this.communityService.getGallery(req.tenantDbName);
    }
}
