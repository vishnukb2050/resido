import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { api } from './api';
import { Video } from 'react-native-compressor';

/**
 * PUT a local file (file:// URI) to an S3/R2 presigned URL.
 *
 * We previously did `fetch(uri).then(r => r.blob()).then(blob => xhr.send(blob))`,
 * which on Android (and to a lesser degree on Hermes/iOS) often produces a
 * zero-byte blob — the upload "succeeds" with HTTP 200 but the stored object
 * is empty. Worse, on freshly generated PDFs (`Print.printToFileAsync`) the
 * blob conversion frequently throws "Network request failed" before we even
 * reach the XHR.
 *
 * `FileSystem.uploadAsync` is the official Expo recipe for streaming a
 * `file://` URI as the raw HTTP body — no blob round-trip, no size limits
 * beyond what the OS streams. It works reliably on iOS and Android, and the
 * native upload preserves Content-Type / Content-Length headers correctly.
 */
async function putLocalFileToPresignedUrl(
    uploadUrl: string,
    fileUri: string,
    contentType: string,
): Promise<void> {
    const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': contentType },
    });
    if (result.status < 200 || result.status >= 300) {
        const snippet = (result.body || '').slice(0, 400);
        throw new Error(
            `S3 upload failed (HTTP ${result.status})${snippet ? ': ' + snippet : ''}`,
        );
    }
}

/**
 * Fallback for remote (`http(s)://`) source URIs — we cannot stream a remote
 * URL with FileSystem.uploadAsync, so fall back to blob-based XHR.
 */
async function putRemoteUrlToPresignedUrl(
    uploadUrl: string,
    remoteUri: string,
    contentType: string,
): Promise<void> {
    const response = await fetch(remoteUri);
    if (!response.ok) {
        throw new Error(`Failed to fetch source asset (HTTP ${response.status})`);
    }
    const blob = await response.blob();
    const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
    });
    if (!put.ok) {
        const text = await put.text().catch(() => '');
        throw new Error(
            `S3 upload failed (HTTP ${put.status})${text ? ': ' + text.slice(0, 400) : ''}`,
        );
    }
}

export const storageApi = {
    /**
     * Complete upload flow:
     * 1. If video, compress to 720p
     * 2. Get pre-signed URL from backend
     * 3. Upload binary to S3/R2 (native streaming for local files, blob PUT for remote)
     * 4. Return the final public file URL
     */
    uploadFile: async (
        fileUri: string,
        fileName: string,
        contentType: string,
        resourceType: string = 'uploads',
        tenantId?: string,
    ): Promise<string> => {
        try {
            let finalUri = fileUri;

            // 1. Compress video if applicable.
            if (contentType.startsWith('video/')) {
                console.log('Compressing video to 720p...');
                try {
                    finalUri = await Video.compress(
                        fileUri,
                        {
                            compressionMethod: 'auto',
                            minimumFileSizeForCompress: 0,
                        },
                        (progress) => {
                            console.log('Compression Progress: ', progress);
                        }
                    );
                    console.log('Compression complete:', finalUri);
                } catch (compressError) {
                    console.warn('Video compression failed, using original file:', compressError);
                    finalUri = fileUri;
                }
            }

            // 2. Get pre-signed URL.
            const { data } = await api.post('/storage/presigned-url', {
                fileName,
                contentType,
                resourceType,
                ...(tenantId ? { tenantId } : {}),
            });

            const { uploadUrl, fileUrl } = data;
            if (!uploadUrl || !fileUrl) {
                throw new Error('Backend returned an invalid presigned URL response');
            }

            // 3. Upload the bytes. Use native streaming for local files so we
            //    don't round-trip through a JS Blob (broken on Android for
            //    large/binary files like PDFs).
            const isLocal =
                finalUri.startsWith('file://') ||
                finalUri.startsWith('content://') ||
                finalUri.startsWith('/');
            if (isLocal) {
                await putLocalFileToPresignedUrl(uploadUrl, finalUri, contentType);
            } else {
                await putRemoteUrlToPresignedUrl(uploadUrl, finalUri, contentType);
            }

            return fileUrl as string;
        } catch (error: any) {
            const msg = error?.message || 'Unknown upload error';
            console.error('File upload process failed:', msg, error);
            // Re-throw with the real message so callers can surface it to the
            // user instead of swallowing it as "Could not upload file".
            throw new Error(msg);
        }
    }
};
export const uploadToR2 = async (
    fileUri: string, 
    tenantId: string, 
    blogType: 'THREAD' | 'FLARE', 
    mediaType: 'IMAGE' | 'VIDEO',
    onProgress?: (progress: number) => void
) => {
    try {
        const cleanUri = fileUri.split('?')[0].split('#')[0];
        const originalName = cleanUri.split('/').pop() || `upload_${Date.now()}`;
        const ext = mediaType === 'VIDEO' ? 'mp4' : 'jpg';
        const fileExt = originalName.split('.').pop()?.toLowerCase();
        const hasValidExt = fileExt && ['mp4', 'mov', 'm4v', '3gp', 'avi', 'jpg', 'jpeg', 'png', 'gif'].includes(fileExt);
        const fileName = hasValidExt ? originalName : `${originalName}.${ext}`;
        const contentType = mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg';
        
        // Upload original — server-side worker transcodes to 480p/720p/1080p + HLS/DASH.
        const finalUri = fileUri;

        // Get pre-signed URL
        // Standardize on /blogs prefix for consistency across gateway and service
        const { data } = await api.post('/blogs/upload-url', {
            fileName,
            contentType,
            tenantId,
            blogType,
            mediaType
        });

        const { uploadUrl, fileUrl, key } = data;

        // Upload to S3 using XHR (Safest for binary PUT in React Native)
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', contentType);
            
            if (onProgress) {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const uploadProgress = event.loaded / event.total;
                        onProgress(uploadProgress);
                    }
                };
            }

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 201) {
                        resolve(fileUrl);
                    } else {
                        reject(new Error(`S3 upload failed with status ${xhr.status}`));
                    }
                }
            };

            xhr.onerror = () => reject(new Error('XHR network error'));
            
            fetch(finalUri)
                .then(response => response.blob())
                .then(blob => xhr.send(blob))
                .catch(reject);
        });

        return { fileUrl, sourceKey: key };
    } catch (error) {
        console.error('R2 upload failed:', error);
        throw error;
    }
};
