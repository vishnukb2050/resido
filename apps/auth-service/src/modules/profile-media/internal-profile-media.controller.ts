import { Body, Controller, Headers, Param, Patch } from '@nestjs/common';
import { ProfileMediaService } from './profile-media.service';

@Controller('internal/profile-media')
export class InternalProfileMediaController {
    constructor(private readonly profileMedia: ProfileMediaService) {}

    @Patch(':userId/complete')
    complete(
        @Headers('x-media-worker-secret') secret: string,
        @Param('userId') userId: string,
        @Body()
        body: {
            status?: 'READY' | 'FAILED';
            thumbnailKey?: string;
            posterKey?: string;
            errorMessage?: string;
        },
    ) {
        this.profileMedia.assertWorkerSecret(secret);
        return this.profileMedia.completeProfilePhoto(userId, body);
    }
}
