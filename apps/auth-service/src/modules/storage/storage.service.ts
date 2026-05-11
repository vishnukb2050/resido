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
        this.bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
    }

    async getPresignedUrl(fileName: string, contentType: string, tenantId: string, userId: string, resourceType: string = 'uploads') {
        // Structured Key: resido/<tenant-id>/<resource-type>/<user-id>/<timestamp>-<filename>
        const key = `resido/${tenantId}/${resourceType}/${userId}/${Date.now()}_${fileName}`;
        
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
        
        // Final public URL
        const endpoint = this.configService.get('AWS_S3_ENDPOINT', `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com`);
        const fileUrl = `${endpoint}/${this.bucketName}/${key}`;

        return { uploadUrl, fileUrl, key };
    }
}
