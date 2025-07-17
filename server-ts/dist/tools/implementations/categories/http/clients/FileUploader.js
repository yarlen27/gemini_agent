"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUploader = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class FileUploader {
    constructor(httpClient) {
        this.httpClient = httpClient;
    }
    /**
     * Upload file using multipart/form-data
     */
    async uploadFile(url, filePath, fieldName = 'file', additionalFields, progressCallback) {
        try {
            // Check if file exists and get stats
            const fileStats = (0, fs_1.statSync)(filePath);
            const fileSize = fileStats.size;
            const fileName = (0, path_1.basename)(filePath);
            // Create form data
            const FormData = require('form-data');
            const form = new FormData();
            // Add file stream
            const fileStream = (0, fs_1.createReadStream)(filePath);
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
            const config = {
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
                    const progress = {
                        loaded: uploadedBytes,
                        total: fileSize,
                        percentage: Math.round((uploadedBytes / fileSize) * 100)
                    };
                    progressCallback(progress);
                };
            }
            const response = await this.httpClient.request(config);
            return response;
        }
        catch (error) {
            throw new Error(`File upload failed: ${error.message}`);
        }
    }
    /**
     * Get MIME type based on file extension
     */
    getMimeType(filePath) {
        const ext = filePath.toLowerCase().split('.').pop();
        const mimeTypes = {
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
exports.FileUploader = FileUploader;
//# sourceMappingURL=FileUploader.js.map