import { createWriteStream, existsSync, statSync } from 'fs';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';
import axios, { AxiosRequestConfig } from 'axios';
import { HttpClient } from './HttpClient';
import { ProgressInfo, RetryPolicy } from '../types/HttpApiTypes';

export class FileDownloader {
    private httpClient: HttpClient;

    constructor(httpClient: HttpClient) {
        this.httpClient = httpClient;
    }

    /**
     * Download file with resume support
     */
    async downloadFile(
        url: string,
        outputPath: string,
        options: {
            resume?: boolean;
            verifyChecksum?: string;
            maxRetries?: number;
            progressCallback?: (progress: ProgressInfo) => void;
        } = {}
    ): Promise<any> {
        const { resume = false, verifyChecksum, maxRetries = 3, progressCallback } = options;
        
        try {
            // Ensure output directory exists
            const outputDir = dirname(outputPath);
            await mkdir(outputDir, { recursive: true });

            // Check if file exists and get size for resume
            let existingSize = 0;
            if (resume && existsSync(outputPath)) {
                existingSize = statSync(outputPath).size;
            }

            // Configure request
            const config: AxiosRequestConfig = {
                method: 'GET',
                url,
                responseType: 'stream',
                headers: {}
            };

            // Add range header for resume
            if (existingSize > 0) {
                config.headers!['Range'] = `bytes=${existingSize}-`;
            }

            // Get file info first to check total size
            const headResponse = await axios.head(url);
            const totalSize = parseInt(headResponse.headers['content-length'] || '0');
            const supportsResume = headResponse.headers['accept-ranges'] === 'bytes';

            if (resume && !supportsResume && existingSize > 0) {
                throw new Error('Server does not support resume, but partial file exists');
            }

            // Create retry policy
            const retryPolicy: RetryPolicy = {
                max_retries: maxRetries,
                backoff_factor: 2,
                max_delay: 30000
            };

            // Download with retry
            let downloadedBytes = existingSize;
            for (let attempt = 0; attempt <= retryPolicy.max_retries; attempt++) {
                try {
                    const response = await axios.request(config);
                    
                    // Create write stream (append mode if resuming)
                    const writeStream = createWriteStream(outputPath, { 
                        flags: existingSize > 0 ? 'a' : 'w' 
                    });

                    // Track progress
                    if (progressCallback) {
                        response.data.on('data', (chunk: Buffer) => {
                            downloadedBytes += chunk.length;
                            const progress: ProgressInfo = {
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
                    await new Promise<void>((resolve, reject) => {
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

                } catch (error: any) {
                    // If it's the last attempt, throw the error
                    if (attempt === retryPolicy.max_retries) {
                        throw error;
                    }

                    // Calculate delay for next attempt
                    const delay = Math.min(
                        retryPolicy.backoff_factor ** attempt * 1000,
                        retryPolicy.max_delay
                    );

                    await this.sleep(delay);
                }
            }

        } catch (error: any) {
            throw new Error(`File download failed: ${error.message}`);
        }
    }

    /**
     * Calculate file checksum
     */
    private async calculateFileChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
        const { createReadStream } = require('fs');
        const { createHash } = require('crypto');
        
        return new Promise((resolve, reject) => {
            const hash = createHash(algorithm);
            const stream = createReadStream(filePath);
            
            stream.on('data', (data: Buffer) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}