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
            region: this.config.get<string>('AWS_REGION') || 'auto',
            credentials: {
                accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY'),
            },
            endpoint: this.config.get<string>('AWS_S3_ENDPOINT'),
            forcePathStyle: true,
        });
        this.bucket = this.config.get<string>('AWS_S3_BUCKET_NAME') || this.config.get<string>('AWS_S3_BUCKET') || 'resido';
    }

    async generatePresignedUrl(
        fileName: string, 
        contentType: string, 
        tenantId: string, 
        userId: string,
        blogType: 'THREAD' | 'FLARE', 
        mediaType: 'IMAGE' | 'VIDEO'
    ) {
        try {
            const fileExtension = fileName.split('.').pop();
            const uuid = uuidv4();
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            
            // Scalable Structure: tenants/tenant-id/users/user-id/blog-type/year/month/uuid.ext
            const baseFolder = blogType === 'THREAD' ? 'threads' : 'flares';
            const mediaFolder = mediaType === 'IMAGE' ? 'images' : 'videos';
            
            const key = `tenants/${tenantId}/users/${userId}/${baseFolder}/${mediaFolder}/${year}/${month}/${uuid}.${fileExtension}`;

            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                ContentType: contentType,
            });

            const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
            
            // Generate public URL
            const endpoint = this.config.get('AWS_S3_ENDPOINT');
            let fileUrl = '';
            
            if (endpoint && endpoint.includes('cloudflarestorage.com')) {
                // For R2, the public URL is often the bucket name as a subdomain or just the endpoint/bucket/key
                fileUrl = `${endpoint}/${this.bucket}/${key}`;
            } else {
                const region = this.config.get('AWS_REGION', 'ap-south-1');
                fileUrl = `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
            }

            return { uploadUrl, fileUrl, key };
        } catch (error) {
            console.error('S3 Presigned URL error:', error);
            throw new InternalServerErrorException('Could not generate upload URL');
        }
    }
}
