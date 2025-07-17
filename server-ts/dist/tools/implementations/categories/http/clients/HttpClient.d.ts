import { AxiosRequestConfig } from 'axios';
import { HttpResponse, AuthConfig, RetryPolicy } from '../types/HttpApiTypes';
export declare class HttpClient {
    private axiosInstance;
    private defaultRetryPolicy;
    constructor(config?: AxiosRequestConfig);
    /**
     * Make HTTP request with retry logic
     */
    request(config: AxiosRequestConfig, retryPolicy?: RetryPolicy): Promise<HttpResponse>;
    /**
     * Add authentication to request config
     */
    addAuthentication(config: AxiosRequestConfig, auth: AuthConfig): AxiosRequestConfig;
    /**
     * Generate webhook signature
     */
    generateWebhookSignature(payload: string, secret: string, algorithm?: string): string;
    /**
     * Validate response against JSON schema
     */
    validateResponse(response: any, schema: object): boolean;
    /**
     * Calculate file checksum
     */
    calculateChecksum(data: Buffer, algorithm?: string): string;
    private sleep;
}
//# sourceMappingURL=HttpClient.d.ts.map