import { Controller, Get, Post, Patch, Delete, Body, UseInterceptors, Req, Query, Param, Headers } from '@nestjs/common';
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
    votePoll(
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Body() body: { optionId: string },
    ) {
        return this.communityService.votePoll({ authUserId, authUserPhone, optionId: body.optionId });
    }

    // Complaints
    @Get('complaints')
    getComplaints(
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Headers('x-user-role') authUserRole: string,
        @Query('memberId') memberId?: string,
        @Query('staffId') staffId?: string,
    ) {
        return this.communityService.getComplaints({
            memberId,
            staffId,
            authUserId,
            authUserPhone,
            authUserRole,
        });
    }

    @Post('complaints')
    createComplaint(
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Body() data: any,
    ) {
        return this.communityService.createComplaint(data.memberId || authUserId, {
            ...data,
            authUserId,
            authUserPhone,
        });
    }

    @Post('complaints/:id/assign')
    assignComplaint(@Param('id') id: string, @Body('staffId') staffId: string) {
        return this.communityService.assignComplaint(id, staffId);
    }

    @Post('complaints/:id/status')
    updateStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.communityService.updateComplaintStatus(id, status);
    }

    @Post('complaints/:id/progress')
    addProgress(
        @Param('id') id: string,
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Body() body: { message: string; photos?: string[]; status?: string; updatedBy?: string },
    ) {
        return this.communityService.addProgressNote(id, {
            ...body,
            authUserId,
            authUserPhone,
        });
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

    @Get('visitors/:id')
    getGatepassDetails(@Param('id') id: string) {
        return this.communityService.getGatepassDetails(id);
    }

    @Patch('visitors/:id/approve')
    approveGatepassEntry(
        @Param('id') id: string,
        @Body() body: { 
            securityMemberId: string; 
            name?: string; 
            phone?: string; 
            vehicleNumber?: string; 
            purpose?: string;
            category?: string;
            description?: string;
            unitToVisit?: string;
            inTime?: string;
        }
    ) {
        return this.communityService.approveGatepassEntry(id, body.securityMemberId, body);
    }

    // Cleaning logs (daily housekeeping by cleaning staff)
    @Get('cleaning-log')
    getCleaningLogs(@Query('skip') skip?: string, @Query('take') take?: string) {
        return this.communityService.getCleaningLogs(Number(skip) || 0, Number(take) || 30);
    }

    @Post('cleaning-log')
    createCleaningLog(
        @Headers('x-user-id') authUserId: string,
        @Body() body: { date?: string; areas: string[]; notes?: string; photoUrls?: string[] },
    ) {
        return this.communityService.createCleaningLog(authUserId, body);
    }

    // Calendar / Events
    @Get('events')
    getEvents(
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Headers('x-user-role') authUserRole: string,
        @Query('memberId') memberId?: string,
    ) {
        return this.communityService.getEvents({
            memberId,
            authUserId,
            authUserPhone,
            authUserRole,
        });
    }

    @Post('events')
    createEvent(
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Headers('x-user-role') authUserRole: string,
        @Body() data: any,
    ) {
        return this.communityService.createEvent({
            memberId: data?.memberId,
            authUserId,
            authUserPhone,
            authUserRole,
            data,
        });
    }

    @Delete('events/:id')
    deleteEvent(
        @Param('id') id: string,
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Headers('x-user-role') authUserRole: string,
    ) {
        return this.communityService.deleteEvent(id, {
            authUserId,
            authUserPhone,
            authUserRole,
        });
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

    // Blocks & Units
    @Get('blocks')
    getBlocks() {
        return this.communityService.getBlocks();
    }

    @Post('blocks')
    createBlock(@Body() data: any) {
        return this.communityService.createBlock(data);
    }

    @Get('units')
    getUnits(@Query('blockId') blockId: string) {
        return this.communityService.getUnits(blockId);
    }

    @Post('units')
    createUnit(@Body() data: any) {
        return this.communityService.createUnit(data);
    }

    @Patch('blocks/:id')
    updateBlock(@Param('id') id: string, @Body() data: any) {
        return this.communityService.updateBlock(id, data);
    }

    @Delete('blocks/:id')
    deleteBlock(@Param('id') id: string) {
        return this.communityService.deleteBlock(id);
    }

    @Patch('units/:id')
    updateUnit(@Param('id') id: string, @Body() data: any) {
        return this.communityService.updateUnit(id, data);
    }

    @Delete('units/:id')
    deleteUnit(@Param('id') id: string) {
        return this.communityService.deleteUnit(id);
    }

    // Rules

    @Get('rules')
    getRules(
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Headers('x-user-role') authUserRole: string,
        @Query('memberId') memberId?: string,
    ) {
        return this.communityService.getRules({
            memberId,
            authUserId,
            authUserPhone,
            authUserRole,
        });
    }

    @Post('rules')
    createRule(
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Headers('x-user-role') authUserRole: string,
        @Body() data: any,
    ) {
        return this.communityService.createRule({
            ...data,
            authUserId,
            authUserPhone,
            authUserRole,
        });
    }

    @Patch('rules/:id')
    updateRule(
        @Param('id') id: string,
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Headers('x-user-role') authUserRole: string,
        @Body() data: any,
    ) {
        return this.communityService.updateRule(id, {
            ...data,
            authUserId,
            authUserPhone,
            authUserRole,
        });
    }

    @Delete('rules/:id')
    deleteRule(
        @Param('id') id: string,
        @Headers('x-user-id') authUserId: string,
        @Headers('x-user-phone') authUserPhone: string,
        @Headers('x-user-role') authUserRole: string,
    ) {
        return this.communityService.deleteRule(id, {
            authUserId,
            authUserPhone,
            authUserRole,
        });
    }

    @Get('stats/summary')
    getSummaryStats() {
        return this.communityService.getSummaryStats();
    }
}
