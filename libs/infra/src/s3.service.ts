import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
    private s3: S3Client;
    private bucket: string;

    constructor(private config: ConfigService) {
        this.s3 = new S3Client({
            region: config.get('AWS_REGION'),
            credentials: {
                accessKeyId: config.get('AWS_ACCESS_KEY_ID')!,
                secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY')!,
            },
        });
        this.bucket = config.get('AWS_S3_BUCKET')!;
    }

    /**
     * Upload a file buffer to S3 under /<clientId>/<folder>/<filename>
     */
    async upload(
        clientId: string,
        folder: string,
        originalName: string,
        buffer: Buffer,
        mimeType: string,
    ): Promise<string> {
        const ext = originalName.split('.').pop();
        const key = `${clientId}/${folder}/${uuidv4()}.${ext}`;

        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: mimeType,
            }),
        );

        return key; // Return S3 key (not public URL)
    }

    /**
     * Generate a pre-signed URL for private download
     */
    async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
        const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
        return getSignedUrl(this.s3, command, { expiresIn });
    }

    /**
     * Generate a pre-signed URL for direct upload from mobile/web
     */
    async getUploadPresignedUrl(
        clientId: string,
        folder: string,
        filename: string,
        mimeType: string,
        expiresIn = 300,
    ): Promise<{ uploadUrl: string; key: string }> {
        const ext = filename.split('.').pop();
        const key = `${clientId}/${folder}/${uuidv4()}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: mimeType,
        });
        const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

        return { uploadUrl, key };
    }
}
