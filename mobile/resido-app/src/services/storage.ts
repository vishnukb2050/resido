import axios from 'axios';
import { api } from './api';

export const storageApi = {
    /**
     * Complete upload flow:
     * 1. Get pre-signed URL from backend
     * 2. Upload binary to S3
     * 3. Return the final public file URL
     */
    uploadFile: async (fileUri: string, fileName: string, contentType: string) => {
        try {
            // 1. Get pre-signed URL
            const { data } = await api.post('/storage/presigned-url', {
                fileName,
                contentType
            });

            const { uploadUrl, fileUrl } = data;

            // 2. Upload to S3 directly
            // We use standard axios (not our intercepted 'api' instance) 
            // because we don't want to send our auth headers to S3
            const response = await fetch(fileUri);
            const blob = await response.blob();

            await axios.put(uploadUrl, blob, {
                headers: {
                    'Content-Type': contentType,
                },
            });

            // 3. Return the final public URL
            return fileUrl;
        } catch (error) {
            console.error('File upload failed:', error);
            throw new Error('Could not upload file to storage');
        }
    }
};
