import { Controller, Get, Post, Put, Body, Param, Headers } from '@nestjs/common';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
    constructor(private readonly notesService: NotesService) {}

    @Get('folders/my')
    async getMyFolders(@Headers('x-user-member-id') memberId: string, @Headers('x-tenant-id') tenantId: string) {
        return this.notesService.getMyFolders(memberId, tenantId);
    }

    @Get('folders/shared')
    async getSharedFolders(@Headers('x-user-member-id') memberId: string, @Headers('x-tenant-id') tenantId: string) {
        return this.notesService.getSharedFolders(memberId, tenantId);
    }

    @Post('folders')
    async createFolder(
        @Headers('x-user-member-id') memberId: string, 
        @Headers('x-tenant-id') tenantId: string,
        @Body() data: any
    ) {
        return this.notesService.createFolder(memberId, tenantId, data);
    }

    @Get('folders/:id/notes')
    async getFolderNotes(@Param('id') folderId: string, @Headers('x-tenant-id') tenantId: string) {
        return this.notesService.getFolderNotes(folderId, tenantId);
    }

    @Post()
    async createNote(
        @Headers('x-user-member-id') memberId: string, 
        @Headers('x-tenant-id') tenantId: string,
        @Body() data: any
    ) {
        return this.notesService.createNote(memberId, tenantId, data);
    }

    @Put(':id')
    async updateNote(
        @Param('id') noteId: string,
        @Headers('x-tenant-id') tenantId: string,
        @Body() data: any
    ) {
        return this.notesService.updateNote(noteId, tenantId, data);
    }

    @Post('share')
    async shareItem(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
        return this.notesService.shareItem(tenantId, data);
    }
}
