import { createReadStream, statSync } from 'fs';
import { basename } from 'path';
import axios, { AxiosRequestConfig } from 'axios';
import { HttpClient } from './HttpClient';
import { ProgressInfo } from '../types/HttpApiTypes';

export class FileUploader {
    private httpClient: HttpClient;

    constructor(httpClient: HttpClient) {
        this.httpClient = httpClient;
    }

    /**
     * Upload file using multipart/form-data
     */
    async uploadFile(
        url: string,
        filePath: string,
        fieldName: string = 'file',
        additionalFields?: Record<string, string>,
        progressCallback?: (progress: ProgressInfo) => void
    ): Promise<any> {
        try {
            // Check if file exists and get stats
            const fileStats = statSync(filePath);
            const fileSize = fileStats.size;
            const fileName = basename(filePath);

            // Create form data
            const FormData = require('form-data');
            const form = new FormData();

            // Add file stream
            const fileStream = createReadStream(filePath);
            form.append(fieldName, fileStream, {
                filename: fileName,
                contentType: this.getMimeType(filePath),
                knownLength: fileSize
            });

            // Add additional fields
            if (additionalFields) {
                Object.entries(additionalFields).forEach(([key, value]) => {
                    form.append(key, value);
                });
            }

            // Configure request
            const config: AxiosRequestConfig = {
                method: 'POST',
                url,
                data: form,
                headers: {
                    ...form.getHeaders(),
                    'Content-Length': form.getLengthSync()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            };

            // Add progress tracking if requested
            if (progressCallback) {
                let uploadedBytes = 0;
                config.onUploadProgress = (progressEvent) => {
                    uploadedBytes = progressEvent.loaded || 0;
                    const progress: ProgressInfo = {
                        loaded: uploadedBytes,
                        total: fileSize,
                        percentage: Math.round((uploadedBytes / fileSize) * 100)
                    };
                    progressCallback(progress);
                };
            }

            const response = await this.httpClient.request(config);
            return response;

        } catch (error: any) {
            throw new Error(`File upload failed: ${error.message}`);
        }
    }

    /**
     * Get MIME type based on file extension
     */
    private getMimeType(filePath: string): string {
        const ext = filePath.toLowerCase().split('.').pop();
        const mimeTypes: Record<string, string> = {
            'txt': 'text/plain',
            'json': 'application/json',
            'xml': 'application/xml',
            'csv': 'text/csv',
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'pdf': 'application/pdf',
            'zip': 'application/zip',
            'tar': 'application/x-tar',
            'gz': 'application/gzip'
        };

        return mimeTypes[ext || ''] || 'application/octet-stream';
    }
}