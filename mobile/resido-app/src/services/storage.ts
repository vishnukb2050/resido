import axios from 'axios';
import { api } from './api';
import { Video } from 'react-native-compressor';

export const storageApi = {
    /**
     * Complete upload flow:
     * 1. If video, compress to 720p
     * 2. Get pre-signed URL from backend
     * 3. Upload binary to S3
     * 4. Return the final public file URL
     */
    uploadFile: async (fileUri: string, fileName: string, contentType: string, resourceType: string = 'uploads') => {
        try {
            let finalUri = fileUri;

            // 1. Compress video if applicable
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

            // 2. Get pre-signed URL
            const { data } = await api.post('/storage/presigned-url', {
                fileName,
                contentType,
                resourceType
            });

            const { uploadUrl, fileUrl } = data;

            // 3. Upload to S3 directly using XHR for better RN support
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl);
                xhr.setRequestHeader('Content-Type', contentType);
                
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200 || xhr.status === 201) {
                            resolve(fileUrl);
                        } else {
                            console.error('S3 Upload Error:', xhr.responseText);
                            reject(new Error(`S3 upload failed with status ${xhr.status}`));
                        }
                    }
                };

                xhr.onerror = (e) => {
                    console.error('XHR error:', e);
                    reject(new Error('XHR network error'));
                };
                
                // In React Native, fetch(uri).blob() is the standard way to get a blob for XHR/fetch
                fetch(finalUri)
                    .then(response => response.blob())
                    .then(blob => {
                        xhr.send(blob);
                    })
                    .catch(err => {
                        console.error('Blob conversion error:', err);
                        reject(err);
                    });
            });
        } catch (error) {
            console.error('File upload process failed:', error);
            throw new Error('Could not upload file to storage');
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
        
        let finalUri = fileUri;

        // 1. Optional Compression for speed
        if (mediaType === 'VIDEO') {
            console.log('Checking video for compression...');
            try {
                // In a real app, we might check file size here. For now, let's use a faster compression setting.
                finalUri = await Video.compress(
                    fileUri,
                    {
                        compressionMethod: 'manual',
                        bitrate: 2000000, // 2Mbps for 720p is good speed/quality balance
                        maxSize: 1280,
                        minimumFileSizeForCompress: 5 * 1024 * 1024, // Skip if < 5MB
                    },
                    (progress) => {
                        if (onProgress) onProgress(progress * 0.2); // Compression is first 20%
                    }
                );
                console.log('Video ready for upload:', finalUri);
            } catch (compressError) {
                console.warn('Video compression failed, using original file:', compressError);
                finalUri = fileUri;
            }
        }

        // 2. Get pre-signed URL
        // Standardize on /blogs prefix for consistency across gateway and service
        const { data } = await api.post('/blogs/upload-url', {
            fileName,
            contentType,
            tenantId,
            blogType,
            mediaType
        });

        const { uploadUrl, fileUrl } = data;

        // 3. Upload to S3 using XHR (Safest for binary PUT in React Native)
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', contentType);
            
            if (onProgress) {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const uploadProgress = event.loaded / event.total;
                        onProgress(0.2 + (uploadProgress * 0.8));
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

        return { fileUrl };
    } catch (error) {
        console.error('R2 upload failed:', error);
        throw error;
    }
};
