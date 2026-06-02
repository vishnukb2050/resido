import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

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
        let key: string;
        if (resourceType === 'profiles') {
            const fileExtension = (fileName.split('.').pop() || 'jpg').toLowerCase();
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            key = `resido/${tenantId}/profiles/${userId}/original/${year}/${month}/${uuidv4()}.${fileExtension}`;
        } else {
            key = `resido/${tenantId}/${resourceType}/${userId}/${Date.now()}_${fileName}`;
        }
        
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
        
        const fileUrl = this.generatePublicUrl(key);

        return { uploadUrl, fileUrl, key };
    }

    async uploadFile(file: any, tenantId: string, userId: string, resourceType: string = 'uploads') {
        const fileName = file.originalname || 'upload';
        const key = `resido/${tenantId}/${resourceType}/${userId}/${Date.now()}_${fileName}`;
        
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await this.s3Client.send(command);
        
        return {
            fileUrl: this.generatePublicUrl(key),
            key: key
        };
    }

  /** Turn stored R2 key or relative path into a browser-loadable URL. */
  resolvePublicMediaUrl(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
      return trimmed;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      // Auto-heal legacy URLs that were stored when CLOUDFLARE_R2_PUBLIC_URL
      // was missing — they point at the auth-only cloudflarestorage.com
      // endpoint and render as blank. Rewrite them to the configured public
      // R2.dev domain if available.
      const publicUrlBase = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL');
      if (publicUrlBase && /\.r2\.cloudflarestorage\.com\//i.test(trimmed)) {
        const idx = trimmed.indexOf('/' + this.bucketName + '/');
        if (idx >= 0) {
          const key = trimmed.slice(idx + this.bucketName.length + 2);
          return `${publicUrlBase.replace(/\/$/, '')}/${key}`;
        }
      }
      return trimmed;
    }
    const key = trimmed.startsWith('resido/') ? trimmed : `resido/${trimmed.replace(/^\//, '')}`;
    return this.generatePublicUrl(key);
  }

  private generatePublicUrl(key: string): string {
    const publicUrlBase = this.configService.get('CLOUDFLARE_R2_PUBLIC_URL');

    if (publicUrlBase) {
      return `${publicUrlBase.replace(/\/$/, '')}/${key}`;
    }

    // CLOUDFLARE_R2_PUBLIC_URL is REQUIRED for browser/app fetches. The raw
    // <accountId>.r2.cloudflarestorage.com endpoint is auth-only and will
    // render as a blank image. Log a loud warning so the misconfig is caught.
    const endpoint = this.configService.get('AWS_S3_ENDPOINT');
    if (endpoint && endpoint.includes('cloudflarestorage.com')) {
      console.warn(
        '[StorageService] CLOUDFLARE_R2_PUBLIC_URL is not set — uploads will not be publicly viewable. ' +
        'Set CLOUDFLARE_R2_PUBLIC_URL=https://pub-<id>.r2.dev in the service env.',
      );
      return `${endpoint}/${this.bucketName}/${key}`;
    }

    const region = this.configService.get('AWS_REGION', 'ap-south-1');
    return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
  }
}
