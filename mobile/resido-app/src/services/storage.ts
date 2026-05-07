import axios from 'axios';
import { api } from './api';

export const storageApi = {
    /**
     * Complete upload flow:
     * 1. Get pre-signed URL from backend
     * 2. Upload binary to S3
     * 3. Return the final public file URL
     */
    uploadFile: async (fileUri: string, fileName: string, contentType: string, resourceType: string = 'uploads') => {
        try {
            // 1. Get pre-signed URL
            const { data } = await api.post('/storage/presigned-url', {
                fileName,
                contentType,
                resourceType
            });

            const { uploadUrl, fileUrl } = data;

            // 2. Upload to S3 directly using XHR for better RN support
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
                fetch(fileUri)
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
