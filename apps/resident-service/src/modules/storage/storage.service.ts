import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Only allow uploads of media/document types we actually serve. Prevents the
// presigned URL from being used to stage arbitrary executable/HTML content.
const ALLOWED_CONTENT_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
];

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
    async generatePresignedUrl(fileName: string, contentType: string, tenantId?: string, module: string = 'media', subfolder?: string, userId?: string) {
        try {
            if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType.toLowerCase())) {
                throw new BadRequestException(`Unsupported content type: ${contentType}`);
            }
            // Sanitize path segments so a crafted subfolder/module can't escape
            // the tenant prefix (e.g. "../other-tenant").
            const safe = (s?: string) => (s || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
            const safeModule = safe(module) || 'media';
            const safeSub = safe(subfolder);
            const safeUser = safe(userId);
            const fileExtension = (fileName.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
            const uuid = uuidv4();

            // Always include the uploader id in the key for traceability and so a
            // member can't overwrite another member's object prefix.
            const userSeg = safeUser ? `${safeUser}/` : '';

            let key = '';
            if (safeModule === 'profiles') {
                // Global profiles (User is same across multiple communities)
                key = `global/profiles/${userSeg || (safeSub ? `${safeSub}/` : 'general/')}${uuid}.${fileExtension}`;
            } else if (tenantId) {
                // Tenant specific data, scoped to the uploading member.
                const folder = safeSub ? `${safeSub}/` : '';
                key = `tenants/${safe(tenantId)}/${safeModule}/${userSeg}${folder}${uuid}.${fileExtension}`;
            } else {
                // Generic global media
                key = `global/media/${safeModule}/${userSeg}${uuid}.${fileExtension}`;
            }

            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                ContentType: contentType,
            });

            const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

            const publicUrlBase = this.config.get('CLOUDFLARE_R2_PUBLIC_URL');
            let fileUrl = '';

            if (publicUrlBase) {
                fileUrl = `${publicUrlBase.replace(/\/$/, '')}/${key}`;
            } else {
                // CLOUDFLARE_R2_PUBLIC_URL is REQUIRED for browser/app fetches.
                // The raw cloudflarestorage.com endpoint is auth-only and will
                // appear blank in <Image>. Log loudly so the misconfig is caught.
                const endpoint = this.config.get('AWS_S3_ENDPOINT');
                if (endpoint && endpoint.includes('cloudflarestorage.com')) {
                    console.warn(
                        '[StorageService] CLOUDFLARE_R2_PUBLIC_URL is not set — uploads will not be publicly viewable. ' +
                        'Set CLOUDFLARE_R2_PUBLIC_URL=https://pub-<id>.r2.dev in the service env.',
                    );
                    fileUrl = `${endpoint}/${this.bucket}/${key}`;
                } else {
                    const region = this.config.get('AWS_REGION', 'ap-south-1');
                    fileUrl = `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
                }
            }

            return { uploadUrl, fileUrl, key };
        } catch (error) {
            console.error('S3 Presigned URL error:', error);
            throw new InternalServerErrorException('Could not generate upload URL');
        }
    }
}
