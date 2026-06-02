import { Module } from '@nestjs/common';
import { MediaQueueService } from './media-queue.service';
import { MediaService } from './media.service';
import { InternalMediaController } from './internal-media.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
    imports: [StorageModule],
    controllers: [InternalMediaController],
    providers: [MediaQueueService, MediaService],
    exports: [MediaQueueService, MediaService],
})
export class MediaModule {}
