import { Worker } from 'bullmq';
import { config } from './config';
import { processMediaJob, MediaJob } from './process';
import { processProfileJob, ProfileMediaJob } from './process-profile';

type AnyMediaJob = MediaJob | ProfileMediaJob;

const worker = new Worker<AnyMediaJob>(
    'media.process',
    async (job) => {
        if ((job.data as ProfileMediaJob).jobType === 'PROFILE') {
            const d = job.data as ProfileMediaJob;
            console.log(`Processing profile job ${job.id} user=${d.userId}`);
            await processProfileJob(d);
            return;
        }
        const d = job.data as MediaJob;
        console.log(`Processing media job ${job.id} asset=${d.mediaAssetId}`);
        await processMediaJob(d);
    },
    {
        connection: config.redisConnection,
        concurrency: config.concurrency,
    },
);

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err?.message);
});

console.log(
    `media-worker listening on redis ${process.env.REDIS_HOST || process.env.REDIS_URL || 'localhost'} (concurrency=${config.concurrency})`,
);
