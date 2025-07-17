import { HttpClient } from './HttpClient';
import { ProgressInfo } from '../types/HttpApiTypes';
export declare class FileUploader {
    private httpClient;
    constructor(httpClient: HttpClient);
    /**
     * Upload file using multipart/form-data
     */
    uploadFile(url: string, filePath: string, fieldName?: string, additionalFields?: Record<string, string>, progressCallback?: (progress: ProgressInfo) => void): Promise<any>;
    /**
     * Get MIME type based on file extension
     */
    private getMimeType;
}
//# sourceMappingURL=FileUploader.d.ts.map