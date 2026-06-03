import { Controller, Get, Query, UseInterceptors, Req, Headers } from '@nestjs/common';
import { StorageService } from './storage.service';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';

@Controller('storage')
@UseInterceptors(TenantInterceptor)
export class StorageController {
    constructor(private storageService: StorageService) {}

    /**
     * Request a pre-signed URL for S3 upload
     */
    @Get('upload-url')
    getUploadUrl(
        @Query('fileName') fileName: string,
        @Query('contentType') contentType: string,
        @Query('module') module: string,
        @Query('subfolder') subfolder: string,
        @Headers('x-user-id') userId: string,
        @Req() req: any
    ) {
        // tenantDbName is usually the slug or ID used for path scoping
        const tenantId = req.tenantDbName || 'global';
        return this.storageService.generatePresignedUrl(fileName, contentType, tenantId, module, subfolder, userId);
    }
}
