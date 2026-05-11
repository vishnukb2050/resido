import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
    private s3Client: S3Client;
    private bucketName: string;

    constructor(private configService: ConfigService) {
        this.s3Client = new S3Client({
            region: this.configService.get('AWS_REGION', 'auto'),
            credentials: {
                accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
            },
            endpoint: this.configService.get('AWS_S3_ENDPOINT'),
            forcePathStyle: true,
        });
        this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || this.configService.get<string>('AWS_S3_BUCKET') || 'resido';
    }

    async getPresignedUrl(fileName: string, contentType: string, tenantId: string, userId: string, resourceType: string = 'uploads') {
        // Structured Key: resido/<tenant-id>/<resource-type>/<user-id>/<timestamp>-<filename>
        const key = `resido/${tenantId}/${resourceType}/${userId}/${Date.now()}_${fileName}`;
        
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: contentType,
            ACL: 'public-read' as any,
        });

        const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
        
        // Generate public URL
        const endpoint = this.configService.get('AWS_S3_ENDPOINT');
        const publicUrlBase = this.configService.get('CLOUDFLARE_R2_PUBLIC_URL');
        let fileUrl = '';
        
        if (publicUrlBase) {
            fileUrl = `${publicUrlBase.replace(/\/$/, '')}/${key}`;
        } else if (endpoint && endpoint.includes('cloudflarestorage.com')) {
            fileUrl = `${endpoint}/${this.bucketName}/${key}`;
        } else {
            const region = this.configService.get('AWS_REGION', 'ap-south-1');
            fileUrl = `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
        }

        return { uploadUrl, fileUrl, key };
    }
}
