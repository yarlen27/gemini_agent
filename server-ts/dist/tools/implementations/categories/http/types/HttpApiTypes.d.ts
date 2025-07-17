export interface SendPostRequestParams {
    url: string;
    body: object;
    headers?: Record<string, string>;
    timeout?: number;
    validate_ssl?: boolean;
}
export interface TestGetEndpointParams {
    url: string;
    expected_status?: number;
    headers?: Record<string, string>;
    response_schema?: object;
    response_time_limit?: number;
}
export interface UploadFileParams {
    url: string;
    file_path: string;
    field_name?: string;
    additional_fields?: Record<string, string>;
    progress_callback?: boolean;
}
export interface DownloadFileParams {
    url: string;
    output_path: string;
    resume?: boolean;
    verify_checksum?: string;
    max_retries?: number;
}
export interface SendWebhookParams {
    webhook_url: string;
    payload: object;
    event_type?: string;
    secret?: string;
    retry_policy?: RetryPolicy;
}
export interface RetryPolicy {
    max_retries: number;
    backoff_factor: number;
    max_delay: number;
}
export interface HttpResponse {
    status: number;
    statusText: string;
    headers: any;
    data: any;
    responseTime: number;
}
export interface AuthConfig {
    type: 'bearer' | 'basic' | 'apikey';
    token?: string;
    username?: string;
    password?: string;
    apikey?: string;
    apikey_location?: 'header' | 'query';
    apikey_name?: string;
}
export interface ProgressInfo {
    loaded: number;
    total: number;
    percentage: number;
}
//# sourceMappingURL=HttpApiTypes.d.ts.map