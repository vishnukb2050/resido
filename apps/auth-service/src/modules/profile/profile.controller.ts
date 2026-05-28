import { Controller, Get, Post, Put, Patch, Body, Query, UseGuards, Req, Param, Delete, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @UseGuards(JwtAuthGuard)
    @Get('user')
    async getProfile(@Req() req: any) {
        return this.profileService.getProfile(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Put('user')
    @UseInterceptors(FileInterceptor('file'))
    async updateProfile(
        @Req() req: any, 
        @Body() data: any,
        @UploadedFile() file?: any
    ) {
        return this.profileService.updateProfile(req.user.userId, data, file);
    }

    @UseGuards(JwtAuthGuard)
    @Get('job')
    async getJobProfile(@Req() req: any) {
        return this.profileService.getJobProfile(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('job')
    async upsertJobProfile(@Req() req: any, @Body() data: any) {
        return this.profileService.upsertJobProfile(req.user.userId, data);
    }

    @Get('search')
    async searchServices(
        @Query('category') category: string,
        @Query('pincode') pincode?: string,
        @Query('district') district?: string,
        @Query('state') state?: string,
        @Query('lat') lat?: string,
        @Query('lng') lng?: string,
        @Query('radius') radius?: string,
    ) {
        return this.profileService.searchServices(category, { 
            pincode, 
            district, 
            state,
            lat: lat ? parseFloat(lat) : undefined,
            lng: lng ? parseFloat(lng) : undefined,
            radius: radius ? parseFloat(radius) : undefined
        });
    }

    @Get('locations/search')
    async searchLocations(@Query('query') query: string, @Res() res: any) {
        const results = await this.profileService.searchLocations(query);
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');
        return res.json(results);
    }

    @Get('locations/reverse-geocode')
    async reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
        return this.profileService.reverseGeocode(parseFloat(lat), parseFloat(lng));
    }

    @UseGuards(JwtAuthGuard)
    @Post('scans')
    async saveScan(@Req() req: any, @Body() body: { data: string, type?: string }) {
        return this.profileService.saveScan(req.user.userId, body.data, body.type);
    }

    @UseGuards(JwtAuthGuard)
    @Get('scans')
    async getSavedScans(@Req() req: any) {
        return this.profileService.getSavedScans(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('users/search')
    async searchUsers(@Req() req: any, @Query('query') query: string) {
        return this.profileService.searchUsers(req.user.userId, query);
    }


    @UseGuards(JwtAuthGuard)
    @Post('follow/:id')
    async follow(@Req() req: any, @Param('id') id: string) {
        return this.profileService.followUser(req.user.userId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('follow/:id')
    async unfollow(@Req() req: any, @Param('id') id: string) {
        return this.profileService.unfollowUser(req.user.userId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('following')
    async getFollowing(@Req() req: any) {
        return this.profileService.getFollowing(req.user.userId);
    }

    // ─── New follow surfaces ────────────────────────────────────────────────

    @UseGuards(JwtAuthGuard)
    @Get('followers')
    async getMyFollowers(@Req() req: any) {
        return this.profileService.getFollowers(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('follow/counts/:id')
    async getFollowCounts(@Param('id') id: string) {
        return this.profileService.getFollowCounts(id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('follow/followers/:id')
    async getUserFollowers(@Param('id') id: string) {
        return this.profileService.getFollowers(id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('follow/following/:id')
    async getUserFollowing(@Param('id') id: string) {
        return this.profileService.getFollowing(id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('follow/status/:id')
    async getFollowStatus(@Req() req: any, @Param('id') id: string) {
        return this.profileService.getFollowStatus(req.user.userId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('follow-requests')
    async listFollowRequests(@Req() req: any) {
        return this.profileService.listIncomingFollowRequests(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('follow-requests/:requestId/accept')
    async acceptFollowRequest(@Req() req: any, @Param('requestId') requestId: string) {
        return this.profileService.acceptFollowRequest(req.user.userId, requestId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('follow-requests/:requestId/reject')
    async rejectFollowRequest(@Req() req: any, @Param('requestId') requestId: string) {
        return this.profileService.rejectFollowRequest(req.user.userId, requestId);
    }

    // Public profile view for any user (with visibility gating).
    @UseGuards(JwtAuthGuard)
    @Get('users/:id')
    async getPublicProfile(@Req() req: any, @Param('id') id: string) {
        return this.profileService.getPublicProfile(id, req.user.userId);
    }

    // Internal/batch endpoint used by other services (flaredthread-service)
    // to gate feeds by each author's profileVisibility. Returns a
    // `{ userId: 'GLOBAL' | 'CONTACTS' | 'COMMUNITY' | 'FOLLOWERS' }` map.
    @Get('users/visibilities/batch')
    async getProfileVisibilities(@Query('ids') ids: string) {
        const list = (ids || '').split(',').map(s => s.trim()).filter(Boolean);
        return this.profileService.getProfileVisibilities(list);
    }

    @UseGuards(JwtAuthGuard)
    @Get('storage/presigned-url')
    async getPresignedUrl(
        @Req() req: any,
        @Query('fileName') fileName: string,
        @Query('contentType') contentType: string,
        @Query('resourceType') resourceType?: string
    ) {
        // Find tenantId for the user
        const userWithMembership = await this.profileService.getUserWithMembership(req.user.userId);
        const tenantId = userWithMembership?.workspaceMemberships?.[0]?.tenantId || 'global';
        
        return this.profileService.getPresignedUrl(
            fileName,
            contentType,
            tenantId,
            req.user.userId,
            resourceType
        );
    }

    // --- Notes & Documents (My Space) ---

    @UseGuards(JwtAuthGuard)
    @Get('notes/folders')
    async getNoteFolders(@Req() req: any) {
        return this.profileService.getNoteFolders(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('notes/folders')
    async createNoteFolder(@Req() req: any, @Body() body: { name: string }) {
        return this.profileService.createNoteFolder(req.user.userId, body.name);
    }

    @UseGuards(JwtAuthGuard)
    @Get('notes/folders/:id')
    async getNoteFolder(@Param('id') id: string) {
        return this.profileService.getNoteFolder(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('notes/pages')
    async createNotePage(@Req() req: any, @Body() body: { folderId?: string, title: string, content: string, color?: string }) {
        return this.profileService.createNotePage(req.user.userId, body.folderId, body.title, body.content, body.color);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('notes/pages/:id')
    async updateNotePage(@Param('id') id: string, @Body() body: { title?: string, content?: string, color?: string }) {
        return this.profileService.updateNotePage(id, body);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('notes/pages/:id')
    async deleteNotePage(@Req() req: any, @Param('id') id: string) {
        return this.profileService.deleteNotePage(req.user.userId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('notes/folders/:id')
    async deleteNoteFolder(@Req() req: any, @Param('id') id: string) {
        return this.profileService.deleteNoteFolder(req.user.userId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('documents/folders')
    async getDocumentFolders(@Req() req: any) {
        return this.profileService.getDocumentFolders(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('documents/folders')
    async createDocumentFolder(@Req() req: any, @Body() body: { name: string, color?: string, icon?: string }) {
        return this.profileService.createDocumentFolder(req.user.userId, body.name, body.color, body.icon);
    }

    @UseGuards(JwtAuthGuard)
    @Get('documents/folders/:id')
    async getDocumentFolder(@Param('id') id: string) {
        return this.profileService.getDocumentFolder(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('documents/files')
    async addDocumentFile(
        @Req() req: any,
        @Body() body: {
            folderId?: string,
            name: string,
            url: string,
            type: string,
            size?: number,
            title?: string,
            description?: string,
        },
    ) {
        return this.profileService.addDocumentFile(
            req.user.userId,
            body.folderId,
            body.name,
            body.url,
            body.type,
            body.size,
            body.title,
            body.description,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Delete('documents/files/:id')
    async deleteDocumentFile(@Req() req: any, @Param('id') id: string) {
        return this.profileService.deleteDocumentFile(req.user.userId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('documents/folders/:id')
    async deleteDocumentFolder(@Req() req: any, @Param('id') id: string) {
        return this.profileService.deleteDocumentFolder(req.user.userId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('share')
    async shareItem(
        @Req() req: any, 
        @Body() body: { type: 'NOTE' | 'DOC', itemId: string, targetType: 'COMMUNITY' | 'GROUP' | 'CONTACT', targetId: string, isFolder: boolean }
    ) {
        return this.profileService.shareItem(req.user.userId, body.type, body.itemId, body.targetType, body.targetId, body.isFolder);
    }

    @UseGuards(JwtAuthGuard)
    @Get('notes/shared')
    async getSharedNotes(@Req() req: any) {
        return this.profileService.getSharedNotes(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('documents/shared')
    async getSharedDocuments(@Req() req: any) {
        return this.profileService.getSharedDocuments(req.user.userId);
    }

    // --- Finance (Personal) ---

    @UseGuards(JwtAuthGuard)
    @Post('finance/income')
    async addIncome(@Req() req: any, @Body() data: any) {
        return this.profileService.addIncome(req.user.userId, data);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('finance/income/:id')
    async updateIncome(@Req() req: any, @Param('id') id: string, @Body() data: any) {
        return this.profileService.updateIncome(req.user.userId, id, data);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('finance/income/:id')
    async deleteIncome(@Req() req: any, @Param('id') id: string) {
        return this.profileService.deleteIncome(req.user.userId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('finance/expense')
    async addExpense(@Req() req: any, @Body() data: any) {
        return this.profileService.addExpense(req.user.userId, data);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('finance/expense/:id')
    async updateExpense(@Req() req: any, @Param('id') id: string, @Body() data: any) {
        return this.profileService.updateExpense(req.user.userId, id, data);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('finance/expense/:id')
    async deleteExpense(@Req() req: any, @Param('id') id: string) {
        return this.profileService.deleteExpense(req.user.userId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('finance/report')
    async getFinanceReport(
        @Req() req: any, 
        @Query('period') period: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.profileService.getFinanceReport(req.user.userId, period, startDate, endDate);
    }
}
