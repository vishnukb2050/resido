import { Module } from '@nestjs/common';
import { ProfileMediaQueueService } from './profile-media-queue.service';
import { ProfileMediaService } from './profile-media.service';
import { InternalProfileMediaController } from './internal-profile-media.controller';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule, StorageModule],
    controllers: [InternalProfileMediaController],
    providers: [ProfileMediaQueueService, ProfileMediaService],
    exports: [ProfileMediaService, ProfileMediaQueueService],
})
export class ProfileMediaModule {}
