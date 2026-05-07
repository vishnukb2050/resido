import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
    constructor(private readonly notesService: NotesService) {}

    // Folders
    @Get('folders')
    async listFolders(@Req() req: any) {
        return this.notesService.listFolders(req.user.userId);
    }

    @Post('folders')
    async createFolder(@Req() req: any, @Body() body: { name: string }) {
        return this.notesService.createFolder(req.user.userId, body.name);
    }

    @Delete('folders/:id')
    async deleteFolder(@Req() req: any, @Param('id') id: string) {
        return this.notesService.deleteFolder(req.user.userId, id);
    }

    // Pages
    @Get('folders/:folderId/pages')
    async listPages(@Param('folderId') folderId: string) {
        return this.notesService.listPages(folderId);
    }

    @Post('folders/:folderId/pages')
    async createPage(@Param('folderId') folderId: string, @Body() data: any) {
        return this.notesService.createPage(folderId, data);
    }

    @Put('pages/:id')
    async updatePage(@Param('id') id: string, @Body() data: any) {
        return this.notesService.updatePage(id, data);
    }

    @Delete('pages/:id')
    async deletePage(@Param('id') id: string) {
        return this.notesService.deletePage(id);
    }

    // Sharing
    @Post('share')
    async shareNote(@Req() req: any, @Body() data: any) {
        return this.notesService.shareNote(req.user.userId, data);
    }

    @Get('shares')
    async listShares(@Req() req: any) {
        return this.notesService.listShares(req.user.userId);
    }
}
