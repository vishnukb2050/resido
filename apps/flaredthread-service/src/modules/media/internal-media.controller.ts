import { Body, Controller, Headers, Param, Patch, Post } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('internal/media')
export class InternalMediaController {
    constructor(private readonly mediaService: MediaService) {}

    @Patch(':id/complete')
    complete(
        @Headers('x-media-worker-secret') secret: string,
        @Param('id') id: string,
        @Body()
        body: {
            tenantId: string;
            status?: 'READY' | 'FAILED';
            errorMessage?: string;
            durationSec?: number;
            width?: number;
            height?: number;
            thumbnailKey?: string;
            posterKey?: string;
            hlsManifestKey?: string;
            dashManifestKey?: string;
            renditions?: any;
        },
    ) {
        this.mediaService.assertWorkerSecret(secret);
        return this.mediaService.completeProcessing(id, body.tenantId, body);
    }

    @Post(':id/retry')
    retry(
        @Headers('x-media-worker-secret') secret: string,
        @Param('id') id: string,
        @Body() body: { tenantId: string },
    ) {
        this.mediaService.assertWorkerSecret(secret);
        return this.mediaService.retryProcessing(id, body.tenantId);
    }
}
