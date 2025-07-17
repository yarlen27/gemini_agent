import { HttpClient } from './HttpClient';
import { ProgressInfo } from '../types/HttpApiTypes';
export declare class FileDownloader {
    private httpClient;
    constructor(httpClient: HttpClient);
    /**
     * Download file with resume support
     */
    downloadFile(url: string, outputPath: string, options?: {
        resume?: boolean;
        verifyChecksum?: string;
        maxRetries?: number;
        progressCallback?: (progress: ProgressInfo) => void;
    }): Promise<any>;
    /**
     * Calculate file checksum
     */
    private calculateFileChecksum;
    private sleep;
}
//# sourceMappingURL=FileDownloader.d.ts.map