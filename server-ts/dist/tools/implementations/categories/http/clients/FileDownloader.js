"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDownloader = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const axios_1 = __importDefault(require("axios"));
class FileDownloader {
    constructor(httpClient) {
        this.httpClient = httpClient;
    }
    /**
     * Download file with resume support
     */
    async downloadFile(url, outputPath, options = {}) {
        const { resume = false, verifyChecksum, maxRetries = 3, progressCallback } = options;
        try {
            // Ensure output directory exists
            const outputDir = (0, path_1.dirname)(outputPath);
            await (0, promises_1.mkdir)(outputDir, { recursive: true });
            // Check if file exists and get size for resume
            let existingSize = 0;
            if (resume && (0, fs_1.existsSync)(outputPath)) {
                existingSize = (0, fs_1.statSync)(outputPath).size;
            }
            // Configure request
            const config = {
                method: 'GET',
                url,
                responseType: 'stream',
                headers: {}
            };
            // Add range header for resume
            if (existingSize > 0) {
                config.headers['Range'] = `bytes=${existingSize}-`;
            }
            // Get file info first to check total size
            const headResponse = await axios_1.default.head(url);
            const totalSize = parseInt(headResponse.headers['content-length'] || '0');
            const supportsResume = headResponse.headers['accept-ranges'] === 'bytes';
            if (resume && !supportsResume && existingSize > 0) {
                throw new Error('Server does not support resume, but partial file exists');
            }
            // Create retry policy
            const retryPolicy = {
                max_retries: maxRetries,
                backoff_factor: 2,
                max_delay: 30000
            };
            // Download with retry
            let downloadedBytes = existingSize;
            for (let attempt = 0; attempt <= retryPolicy.max_retries; attempt++) {
                try {
                    const response = await axios_1.default.request(config);
                    // Create write stream (append mode if resuming)
                    const writeStream = (0, fs_1.createWriteStream)(outputPath, {
                        flags: existingSize > 0 ? 'a' : 'w'
                    });
                    // Track progress
                    if (progressCallback) {
                        response.data.on('data', (chunk) => {
                            downloadedBytes += chunk.length;
                            const progress = {
                                loaded: downloadedBytes,
                                total: totalSize,
                                percentage: Math.round((downloadedBytes / totalSize) * 100)
                            };
                            progressCallback(progress);
                        });
                    }
                    // Pipe response to file
                    response.data.pipe(writeStream);
                    // Wait for download to complete
                    await new Promise((resolve, reject) => {
                        writeStream.on('finish', resolve);
                        writeStream.on('error', reject);
                        response.data.on('error', reject);
                    });
                    // Verify checksum if provided
                    if (verifyChecksum) {
                        const actualChecksum = await this.calculateFileChecksum(outputPath);
                        if (actualChecksum !== verifyChecksum) {
                            throw new Error(`Checksum mismatch. Expected: ${verifyChecksum}, Got: ${actualChecksum}`);
                        }
                    }
                    return {
                        success: true,
                        path: outputPath,
                        size: downloadedBytes,
                        checksum: verifyChecksum ? await this.calculateFileChecksum(outputPath) : undefined
                    };
                }
                catch (error) {
                    // If it's the last attempt, throw the error
                    if (attempt === retryPolicy.max_retries) {
                        throw error;
                    }
                    // Calculate delay for next attempt
                    const delay = Math.min(retryPolicy.backoff_factor ** attempt * 1000, retryPolicy.max_delay);
                    await this.sleep(delay);
                }
            }
        }
        catch (error) {
            throw new Error(`File download failed: ${error.message}`);
        }
    }
    /**
     * Calculate file checksum
     */
    async calculateFileChecksum(filePath, algorithm = 'sha256') {
        const { createReadStream } = require('fs');
        const { createHash } = require('crypto');
        return new Promise((resolve, reject) => {
            const hash = createHash(algorithm);
            const stream = createReadStream(filePath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.FileDownloader = FileDownloader;
//# sourceMappingURL=FileDownloader.js.map