import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
    private s3Client: S3Client;
    private bucket: string;

    constructor(private config: ConfigService) {
        this.s3Client = new S3Client({
            region: this.config.get('AWS_REGION', 'ap-south-1'),
            credentials: {
                accessKeyId: this.config.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY'),
            },
            endpoint: this.config.get('AWS_S3_ENDPOINT'),
            forcePathStyle: true,
        });
        this.bucket = this.config.get('AWS_S3_BUCKET', 'resido');
    }

    async generatePresignedUrl(
        fileName: string, 
        contentType: string, 
        tenantId: string, 
        blogType: 'THREAD' | 'FLARE', 
        mediaType: 'IMAGE' | 'VIDEO'
    ) {
        try {
            const fileExtension = fileName.split('.').pop();
            const uuid = uuidv4();
            
            let key = `tenants/${tenantId}/blog`;
            
            if (blogType === 'THREAD') {
                const folder = mediaType === 'IMAGE' ? 'images' : 'videos';
                key += `/threads/${folder}/${uuid}.${fileExtension}`;
            } else {
                // Flares are always short videos
                key += `/flares/videos/${uuid}.${fileExtension}`;
            }

            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                ContentType: contentType,
            });

            const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
            
            // Generate public URL
            const endpoint = this.config.get('AWS_S3_ENDPOINT', `https://${this.bucket}.s3.${this.config.get('AWS_REGION')}.amazonaws.com`);
            const fileUrl = `${endpoint}/${this.bucket}/${key}`;

            return { uploadUrl, fileUrl, key };
        } catch (error) {
            console.error('S3 Presigned URL error:', error);
            throw new InternalServerErrorException('Could not generate upload URL');
        }
    }
}
