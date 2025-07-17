"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendWebhookTool = exports.DownloadFileTool = exports.UploadFileTool = exports.TestGetEndpointTool = exports.SendPostRequestTool = void 0;
const HttpClient_1 = require("./clients/HttpClient");
const FileUploader_1 = require("./clients/FileUploader");
const FileDownloader_1 = require("./clients/FileDownloader");
const path_1 = require("path");
class SendPostRequestTool {
    constructor() {
        this.name = 'send_post_request_with_json_body';
        this.httpClient = new HttpClient_1.HttpClient();
    }
    async execute(params, context) {
        try {
            // Validate required parameters
            if (!params.url || !params.body) {
                return {
                    success: false,
                    error: 'Missing required parameters: url and body are required'
                };
            }
            // Validate URL format
            try {
                new URL(params.url);
            }
            catch {
                return {
                    success: false,
                    error: 'Invalid URL format'
                };
            }
            // Configure request
            const config = {
                method: 'POST',
                url: params.url,
                data: params.body,
                headers: {
                    'Content-Type': 'application/json',
                    ...params.headers
                },
                timeout: params.timeout || 30000
            };
            // SSL validation
            if (params.validate_ssl === false) {
                config.httpsAgent = new (require('https').Agent)({
                    rejectUnauthorized: false
                });
            }
            const response = await this.httpClient.request(config);
            return {
                success: true,
                data: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    data: response.data,
                    responseTime: response.responseTime
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `HTTP POST request failed: ${error.message}`,
                data: {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    responseTime: error.responseTime
                }
            };
        }
    }
}
exports.SendPostRequestTool = SendPostRequestTool;
class TestGetEndpointTool {
    constructor() {
        this.name = 'test_get_endpoint_response_status';
        this.httpClient = new HttpClient_1.HttpClient();
    }
    async execute(params, context) {
        try {
            // Validate required parameters
            if (!params.url) {
                return {
                    success: false,
                    error: 'Missing required parameter: url is required'
                };
            }
            // Validate URL format
            try {
                new URL(params.url);
            }
            catch {
                return {
                    success: false,
                    error: 'Invalid URL format'
                };
            }
            const startTime = Date.now();
            const config = {
                method: 'GET',
                url: params.url,
                headers: params.headers || {}
            };
            const response = await this.httpClient.request(config);
            const responseTime = Date.now() - startTime;
            // Check expected status
            const expectedStatus = params.expected_status || 200;
            const statusMatches = response.status === expectedStatus;
            // Check response time limit
            const responseTimeLimit = params.response_time_limit || 5000;
            const responseTimeOk = responseTime <= responseTimeLimit;
            // Validate response schema if provided
            let schemaValid = true;
            if (params.response_schema) {
                schemaValid = this.httpClient.validateResponse(response.data, params.response_schema);
            }
            const success = statusMatches && responseTimeOk && schemaValid;
            return {
                success,
                data: {
                    status: response.status,
                    statusText: response.statusText,
                    responseTime,
                    expectedStatus,
                    statusMatches,
                    responseTimeOk,
                    responseTimeLimit,
                    schemaValid,
                    headers: response.headers,
                    data: response.data
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `GET endpoint test failed: ${error.message}`,
                data: {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    responseTime: error.responseTime
                }
            };
        }
    }
}
exports.TestGetEndpointTool = TestGetEndpointTool;
class UploadFileTool {
    constructor() {
        this.name = 'upload_file_via_multipart_form';
        this.httpClient = new HttpClient_1.HttpClient();
        this.fileUploader = new FileUploader_1.FileUploader(this.httpClient);
    }
    async execute(params, context) {
        try {
            // Validate required parameters
            if (!params.url || !params.file_path) {
                return {
                    success: false,
                    error: 'Missing required parameters: url and file_path are required'
                };
            }
            // Validate URL format
            try {
                new URL(params.url);
            }
            catch {
                return {
                    success: false,
                    error: 'Invalid URL format'
                };
            }
            // Resolve file path
            let filePath = params.file_path;
            if (context?.workingDirectory && !params.file_path.startsWith('/')) {
                filePath = (0, path_1.join)(context.workingDirectory, params.file_path);
            }
            // Progress callback
            let progressInfo = null;
            const progressCallback = params.progress_callback
                ? (progress) => { progressInfo = progress; }
                : undefined;
            const response = await this.fileUploader.uploadFile(params.url, filePath, params.field_name || 'file', params.additional_fields, progressCallback);
            return {
                success: true,
                data: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    data: response.data,
                    responseTime: response.responseTime,
                    progress: progressInfo
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `File upload failed: ${error.message}`
            };
        }
    }
}
exports.UploadFileTool = UploadFileTool;
class DownloadFileTool {
    constructor() {
        this.name = 'download_file_from_url_to_path';
        this.httpClient = new HttpClient_1.HttpClient();
        this.fileDownloader = new FileDownloader_1.FileDownloader(this.httpClient);
    }
    async execute(params, context) {
        try {
            // Validate required parameters
            if (!params.url || !params.output_path) {
                return {
                    success: false,
                    error: 'Missing required parameters: url and output_path are required'
                };
            }
            // Validate URL format
            try {
                new URL(params.url);
            }
            catch {
                return {
                    success: false,
                    error: 'Invalid URL format'
                };
            }
            // Resolve output path
            let outputPath = params.output_path;
            if (context?.workingDirectory && !params.output_path.startsWith('/')) {
                outputPath = (0, path_1.join)(context.workingDirectory, params.output_path);
            }
            // Progress callback
            let progressInfo = null;
            const progressCallback = (progress) => { progressInfo = progress; };
            const result = await this.fileDownloader.downloadFile(params.url, outputPath, {
                resume: params.resume || false,
                verifyChecksum: params.verify_checksum,
                maxRetries: params.max_retries || 3,
                progressCallback
            });
            return {
                success: true,
                data: {
                    ...result,
                    progress: progressInfo
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `File download failed: ${error.message}`
            };
        }
    }
}
exports.DownloadFileTool = DownloadFileTool;
class SendWebhookTool {
    constructor() {
        this.name = 'send_webhook_payload_to_url';
        this.httpClient = new HttpClient_1.HttpClient();
    }
    async execute(params, context) {
        try {
            // Validate required parameters
            if (!params.webhook_url || !params.payload) {
                return {
                    success: false,
                    error: 'Missing required parameters: webhook_url and payload are required'
                };
            }
            // Validate URL format
            try {
                new URL(params.webhook_url);
            }
            catch {
                return {
                    success: false,
                    error: 'Invalid URL format'
                };
            }
            // Configure request
            const payloadString = JSON.stringify(params.payload);
            const config = {
                method: 'POST',
                url: params.webhook_url,
                data: params.payload,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'GeminiAgent-Webhook/1.0'
                }
            };
            // Add event type header if provided
            if (params.event_type) {
                config.headers['X-Event-Type'] = params.event_type;
            }
            // Add webhook signature if secret is provided
            if (params.secret) {
                const timestamp = Math.floor(Date.now() / 1000);
                const signaturePayload = `${timestamp}.${payloadString}`;
                const signature = this.httpClient.generateWebhookSignature(signaturePayload, params.secret);
                config.headers['X-Timestamp'] = timestamp.toString();
                config.headers['X-Signature'] = signature;
            }
            // Use retry policy
            const retryPolicy = params.retry_policy || {
                max_retries: 3,
                backoff_factor: 2,
                max_delay: 30000
            };
            const response = await this.httpClient.request(config, retryPolicy);
            return {
                success: true,
                data: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    data: response.data,
                    responseTime: response.responseTime
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Webhook delivery failed: ${error.message}`,
                data: {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    responseTime: error.responseTime
                }
            };
        }
    }
}
exports.SendWebhookTool = SendWebhookTool;
//# sourceMappingURL=HttpApiTool.js.map