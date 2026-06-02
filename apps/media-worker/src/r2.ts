import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { config } from './config';

const client = new S3Client({
    region: config.awsRegion,
    credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
    },
    endpoint: config.s3Endpoint || undefined,
    forcePathStyle: true,
});

export function publicUrl(key: string): string {
    const k = key.replace(/^\/+/, '');
    if (config.publicUrlBase) return `${config.publicUrlBase}/${k}`;
    if (config.s3Endpoint?.includes('cloudflarestorage.com')) {
        return `${config.s3Endpoint.replace(/\/$/, '')}/${config.s3Bucket}/${k}`;
    }
    return `https://${config.s3Bucket}.s3.amazonaws.com/${k}`;
}

export async function downloadToFile(key: string, destPath: string): Promise<void> {
    const res = await client.send(
        new GetObjectCommand({ Bucket: config.s3Bucket, Key: key }),
    );
    const body = res.Body as Readable;
    await pipeline(body, createWriteStream(destPath));
}

export async function uploadFile(
    key: string,
    filePath: string,
    contentType: string,
): Promise<string> {
    await client.send(
        new PutObjectCommand({
            Bucket: config.s3Bucket,
            Key: key,
            Body: createReadStream(filePath),
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
        }),
    );
    return publicUrl(key);
}

export async function uploadBuffer(
    key: string,
    body: Buffer,
    contentType: string,
): Promise<string> {
    await client.send(
        new PutObjectCommand({
            Bucket: config.s3Bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
        }),
    );
    return publicUrl(key);
}

export function processedPrefix(sourceKey: string, assetId: string): string {
    const base = sourceKey.replace(/\/original\//, '/processed/').replace(/\/[^/]+$/, '');
    return `${base}/${assetId}`;
}
