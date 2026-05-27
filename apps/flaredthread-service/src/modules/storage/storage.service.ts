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
            const publicUrlBase = this.config.get('CLOUDFLARE_R2_PUBLIC_URL');
            let fileUrl = '';
            
            if (publicUrlBase) {
                // Best way: Use a dedicated public URL (e.g. custom domain or r2.dev)
                fileUrl = `${publicUrlBase.replace(/\/$/, '')}/${key}`;
            } else if (endpoint && endpoint.includes('cloudflarestorage.com')) {
                // Fallback for R2 if no public URL is provided - attempt to construct it
                // Note: Direct R2 endpoints are usually private, so this might still need a custom domain
                fileUrl = `${endpoint}/${this.bucket}/${key}`;
            } else {
                // AWS S3 Standard
                const region = this.config.get('AWS_REGION', 'ap-south-1');
                fileUrl = `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
            }

            return { uploadUrl, fileUrl, key };
        } catch (error) {
            console.error('S3 Presigned URL error:', error);
            throw new InternalServerErrorException('Could not generate upload URL');
        }
    }

    /**
     * Build a public URL for a stored R2/S3 key. Falls back to the bucket-relative
     * AWS URL if no public R2 base is configured. Strips any accidental leading slash.
     */
    buildPublicUrl(key: string): string {
        const trimmed = key.replace(/^\/+/, '');
        const publicUrlBase = this.config.get<string>('CLOUDFLARE_R2_PUBLIC_URL');

        if (publicUrlBase) {
            return `${publicUrlBase.replace(/\/$/, '')}/${trimmed}`;
        }

        const endpoint = this.config.get<string>('AWS_S3_ENDPOINT');
        if (endpoint && endpoint.includes('cloudflarestorage.com')) {
            console.warn(
                '[StorageService] CLOUDFLARE_R2_PUBLIC_URL is not set — uploads will not be publicly viewable.',
            );
            return `${endpoint.replace(/\/$/, '')}/${this.bucket}/${trimmed}`;
        }
        const region = this.config.get<string>('AWS_REGION') || 'ap-south-1';
        return `https://${this.bucket}.s3.${region}.amazonaws.com/${trimmed}`;
    }

    /**
     * Rewrite a fully-qualified URL that points at the auth-only
     * `<acct>.r2.cloudflarestorage.com` endpoint to the configured public
     * R2.dev domain. Legacy rows from before CLOUDFLARE_R2_PUBLIC_URL was
     * configured contain those URLs and would otherwise render as blank.
     */
    healPublicUrl(url: string): string {
        if (!url) return url;
        const publicUrlBase = this.config.get<string>('CLOUDFLARE_R2_PUBLIC_URL');
        if (!publicUrlBase) return url;
        if (!/\.r2\.cloudflarestorage\.com\//i.test(url)) return url;
        const match = url.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/i);
        if (!match || !match[1]) return url;
        return `${publicUrlBase.replace(/\/$/, '')}/${match[1]}`;
    }
}
