import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { bullmqRedisConnection } from './redis-connection';

export type ProfileMediaJob = {
    jobType: 'PROFILE';
    userId: string;
    tenantId: string;
    sourceKey: string;
};

@Injectable()
export class ProfileMediaQueueService implements OnModuleDestroy {
    private readonly logger = new Logger(ProfileMediaQueueService.name);
    private queue: Queue | null = null;

    constructor(private readonly config: ConfigService) {
        try {
            this.queue = new Queue('media.process', {
                connection: bullmqRedisConnection(this.config),
            });
        } catch (err: any) {
            this.logger.warn(`Profile media queue disabled: ${err?.message}`);
        }
    }

    async enqueueProfilePhoto(userId: string, tenantId: string, sourceKey: string) {
        if (!this.queue) {
            this.logger.warn('Skipping profile media job — Redis not available');
            return;
        }
        const job: ProfileMediaJob = { jobType: 'PROFILE', userId, tenantId, sourceKey };
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
