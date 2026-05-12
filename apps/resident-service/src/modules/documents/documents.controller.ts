import { Controller, Get, Post, Body, Param, Headers, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) {}

    @Get('folders/my')
    async getMyFolders(@Headers('x-user-member-id') memberId: string, @Headers('x-tenant-id') tenantId: string) {
        return this.documentsService.getMyFolders(memberId, tenantId);
    }

    @Get('folders/shared')
    async getSharedFolders(@Headers('x-user-member-id') memberId: string, @Headers('x-tenant-id') tenantId: string) {
        return this.documentsService.getSharedFolders(memberId, tenantId);
    }

    @Post('folders')
    async createFolder(
        @Headers('x-user-member-id') memberId: string, 
        @Headers('x-tenant-id') tenantId: string,
        @Body() data: any
    ) {
        return this.documentsService.createFolder(memberId, tenantId, data);
    }

    @Get('folders/:id/files')
    async getFolderFiles(@Param('id') folderId: string, @Headers('x-tenant-id') tenantId: string) {
        return this.documentsService.getFolderFiles(folderId, tenantId);
    }

    @Post('share')
    async shareItem(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
        return this.documentsService.shareItem(tenantId, data);
    }

    @Get('files/:id/permissions')
    async getFilePermissions(@Param('id') fileId: string, @Headers('x-tenant-id') tenantId: string) {
        return this.documentsService.getFilePermissions(fileId, tenantId);
    }
}
