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
            region: this.config.get('AWS_REGION', 'auto'),
            credentials: {
                accessKeyId: this.config.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY'),
            },
            endpoint: this.config.get('AWS_S3_ENDPOINT'),
            forcePathStyle: true,
        });
        this.bucket = this.config.get<string>('AWS_S3_BUCKET_NAME') || this.config.get<string>('AWS_S3_BUCKET') || 'resido';
    }

    /**
     * Generates a pre-signed URL for direct upload to S3 with structured folder organization
     * @param fileName Original file name
     * @param contentType MIME type
     * @param tenantId For path scoping (isolation) - null for global data
     * @param module e.g. 'profiles', 'gallery', 'chats', 'complaints'
     * @param subfolder Optional extra nesting (e.g. conversationId)
     */
    async generatePresignedUrl(fileName: string, contentType: string, tenantId?: string, module: string = 'media', subfolder?: string) {
        try {
            const fileExtension = fileName.split('.').pop();
            const uuid = uuidv4();
            
            let key = '';
            if (module === 'profiles') {
                // Global profiles (User is same across multiple communities)
                key = `global/profiles/${subfolder || 'general'}/${uuid}.${fileExtension}`;
            } else if (tenantId) {
                // Tenant specific data
                const folder = subfolder ? `/${subfolder}` : '';
                key = `tenants/${tenantId}/${module}${folder}/${uuid}.${fileExtension}`;
            } else {
                // Generic global media
                key = `global/media/${module}/${uuid}.${fileExtension}`;
            }

            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                ContentType: contentType,
            });

            const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
            
            // Generate public URL
            const endpoint = this.config.get('AWS_S3_ENDPOINT');
            const publicUrlBase = this.config.get('CLOUDFLARE_R2_PUBLIC_URL');
            let fileUrl = '';
            
            if (publicUrlBase) {
                fileUrl = `${publicUrlBase.replace(/\/$/, '')}/${key}`;
            } else if (endpoint && endpoint.includes('cloudflarestorage.com')) {
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
