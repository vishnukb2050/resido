import { Controller, Get, Post, Body, UseInterceptors, Req, Query, Param } from '@nestjs/common';
import { CommunityService } from './community.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('community')
@UseInterceptors(TenantInterceptor)
export class CommunityController {
    constructor(private communityService: CommunityService) {}

    // Notice Board
    @Get('notices')
    getNotices() {
        return this.communityService.getNotices();
    }

    @Post('notices')
    createNotice(@Body() data: any) {
        return this.communityService.createNotice(data);
    }

    // Polls
    @Get('polls')
    getPolls() {
        return this.communityService.getPolls();
    }

    @Post('polls/vote')
    votePoll(@Body() body: { memberId: string; optionId: string }) {
        return this.communityService.votePoll(body.memberId, body.optionId);
    }

    // Complaints
    @Get('complaints')
    getComplaints(@Query('memberId') memberId?: string, @Query('staffId') staffId?: string) {
        return this.communityService.getComplaints(memberId, staffId);
    }

    @Post('complaints')
    createComplaint(@Body() data: any) {
        return this.communityService.createComplaint(data.memberId, data);
    }

    @Post('complaints/:id/assign')
    assignComplaint(@Param('id') id: string, @Body('staffId') staffId: string) {
        return this.communityService.assignComplaint(id, staffId);
    }

    @Post('complaints/:id/status')
    updateStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.communityService.updateComplaintStatus(id, status);
    }

    // Gatepass / Visitors
    @Get('visitors')
    getVisitors(@Query('memberId') memberId: string) {
        return this.communityService.getVisitors(memberId);
    }

    @Post('visitors/gatepass')
    createGatepass(@Body() data: any) {
        return this.communityService.createGatepass(data.memberId, data);
    }

    // Calendar / Events
    @Get('events')
    getEvents(@Query('memberId') memberId: string) {
        return this.communityService.getEvents(memberId);
    }

    @Post('events')
    createEvent(@Body() data: any) {
        return this.communityService.createEvent(data.memberId, data);
    }

    @Get('members')
    getMembers() {
        return this.communityService.getMembers();
    }

    @Get('gallery')
    getGallery(@Query('folderId') folderId?: string) {
        return this.communityService.getGallery(folderId);
    }

    @Post('gallery')
    createGallery(@Body() data: any) {
        return this.communityService.createGallery(data);
    }

    @Get('gallery/folders')
    getGalleryFolders() {
        return this.communityService.getGalleryFolders();
    }

    @Post('gallery/folders')
    createGalleryFolder(@Body() data: any) {
        return this.communityService.createGalleryFolder(data);
    }

    // Rules
    @Get('rules')
    getRules() {
        return this.communityService.getRules();
    }

    @Post('rules')
    createRule(@Body() data: any) {
        return this.communityService.createRule(data);
    }
}
