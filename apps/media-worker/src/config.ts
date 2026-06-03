import 'dotenv/config';

function bullmqConnection() {
    if (process.env.REDIS_URL) {
        return { url: process.env.REDIS_URL };
    }
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD;
    const tls = process.env.REDIS_TLS === 'true';
    return {
        host,
        port,
        password: password || undefined,
        ...(tls ? { tls: {} } : {}),
        maxRetriesPerRequest: null as null,
    };
}

export const config = {
    redisConnection: bullmqConnection(),
    flaredthreadUrl:
        process.env.FLAREDTHREAD_URL ||
        process.env.FLAREDTHREAD_SERVICE_URL ||
        'http://flaredthread-service:3008',
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    mediaWorkerSecret: process.env.MEDIA_WORKER_SECRET || 'resido-media-dev-secret',
    awsRegion: process.env.AWS_REGION || 'auto',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Endpoint: process.env.AWS_S3_ENDPOINT || '',
    s3Bucket: process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'resido',
    publicUrlBase: (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, ''),
    concurrency: Number(process.env.MEDIA_WORKER_CONCURRENCY || 1),
};
