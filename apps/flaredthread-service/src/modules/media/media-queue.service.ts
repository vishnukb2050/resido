import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { bullmqRedisConnection } from './redis-connection';

export type MediaProcessJob = {
    mediaAssetId: string;
    tenantId: string;
    ownerUserId: string;
    sourceKey: string;
    kind: 'VIDEO' | 'IMAGE';
    blogId?: string;
    blogType?: 'THREAD' | 'FLARE';
};

@Injectable()
export class MediaQueueService implements OnModuleDestroy {
    private readonly logger = new Logger(MediaQueueService.name);
    private queue: Queue | null = null;

    constructor(private readonly config: ConfigService) {
        try {
            this.queue = new Queue('media.process', {
                connection: bullmqRedisConnection(this.config),
            });
        } catch (err: any) {
            this.logger.warn(`Media queue disabled: ${err?.message}`);
        }
    }

    async enqueueMediaProcess(job: MediaProcessJob) {
        if (!this.queue) {
            this.logger.warn('Skipping media job — Redis queue not available');
            return;
        }
        await this.queue.add('process', job, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
        });
    }

    async onModuleDestroy() {
        await this.queue?.close();
    }
}
