import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('storage')
export class StorageController {
    constructor(private readonly storageService: StorageService) {}

    @UseGuards(JwtAuthGuard)
    @Post('presigned-url')
    async getPresignedUrl(
        @Req() req: any,
        @Body('fileName') fileName: string,
        @Body('contentType') contentType: string,
        @Body('resourceType') resourceType: string,
        @Body('tenantId') tenantId?: string,
    ) {
        const userId = req.user.userId;
        const resolvedTenantId = tenantId || req.user.clientId || 'global';
        return this.storageService.getPresignedUrl(fileName, contentType, resolvedTenantId, userId, resourceType);
    }
}
