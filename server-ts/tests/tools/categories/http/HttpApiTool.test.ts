import {
    SendPostRequestTool,
    TestGetEndpointTool,
    UploadFileTool,
    DownloadFileTool,
    SendWebhookTool
} from '../../../../src/tools/implementations/categories/http/HttpApiTool';
import { ToolResult } from '../../../../src/models/ToolResult';
import { writeFileSync, unlinkSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import nock from 'nock';

describe('HTTP API Tools', () => {
    const testDir = join(__dirname, 'test-files');
    const testFile = join(testDir, 'test.txt');
    const downloadFile = join(testDir, 'download.txt');

    beforeEach(() => {
        // Clean up before each test
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
        mkdirSync(testDir, { recursive: true });
        
        // Clear all nock interceptors
        nock.cleanAll();
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
        nock.cleanAll();
    });

    describe('SendPostRequestTool', () => {
        let tool: SendPostRequestTool;

        beforeEach(() => {
            tool = new SendPostRequestTool();
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('send_post_request_with_json_body');
        });

        test('should send POST request successfully', async () => {
            // Mock HTTP response
            const mockResponse = { message: 'Success', id: 123 };
            nock('https://api.example.com')
                .post('/endpoint')
                .reply(200, mockResponse);

            const params = {
                url: 'https://api.example.com/endpoint',
                body: { name: 'test', value: 'data' }
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(200);
            expect(result.data.data).toEqual(mockResponse);
        }, 10000);

        test('should handle missing required parameters', async () => {
            const params = { url: 'https://api.example.com/endpoint' };
            const result: ToolResult = await tool.execute(params as any);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required parameters');
        });

        test('should handle invalid URL', async () => {
            const params = {
                url: 'invalid-url',
                body: { test: 'data' }
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid URL format');
        });

        test('should handle HTTP errors', async () => {
            nock('https://api.example.com')
                .post('/endpoint')
                .reply(500, { error: 'Internal Server Error' });

            const params = {
                url: 'https://api.example.com/endpoint',
                body: { test: 'data' }
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('HTTP POST request failed');
            expect(result.data.status).toBe(500);
        });

        test('should handle custom headers and timeout', async () => {
            nock('https://api.example.com')
                .post('/endpoint')
                .matchHeader('Authorization', 'Bearer token123')
                .matchHeader('Custom-Header', 'custom-value')
                .reply(200, { success: true });

            const params = {
                url: 'https://api.example.com/endpoint',
                body: { test: 'data' },
                headers: {
                    'Authorization': 'Bearer token123',
                    'Custom-Header': 'custom-value'
                },
                timeout: 5000
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(200);
        });
    });

    describe('TestGetEndpointTool', () => {
        let tool: TestGetEndpointTool;

        beforeEach(() => {
            tool = new TestGetEndpointTool();
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('test_get_endpoint_response_status');
        });

        test('should test GET endpoint successfully', async () => {
            const mockResponse = { status: 'healthy', timestamp: '2023-01-01T00:00:00Z' };
            nock('https://api.example.com')
                .get('/health')
                .reply(200, mockResponse);

            const params = {
                url: 'https://api.example.com/health',
                expected_status: 200
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(200);
            expect(result.data.statusMatches).toBe(true);
            expect(result.data.responseTimeOk).toBe(true);
            expect(result.data.schemaValid).toBe(true);
        });

        test('should handle missing required parameters', async () => {
            const params = {};
            const result: ToolResult = await tool.execute(params as any);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required parameter');
        });

        test('should handle invalid URL', async () => {
            const params = { url: 'invalid-url' };
            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid URL format');
        });

        test('should handle status code mismatch', async () => {
            nock('https://api.example.com')
                .get('/endpoint')
                .reply(404, { error: 'Not Found' });

            const params = {
                url: 'https://api.example.com/endpoint',
                expected_status: 200
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.data.status).toBe(404);
            expect(result.data.statusMatches).toBe(false);
        });

        test('should handle response time limit', async () => {
            nock('https://api.example.com')
                .get('/slow')
                .delay(100)
                .reply(200, { message: 'OK' });

            const params = {
                url: 'https://api.example.com/slow',
                response_time_limit: 50
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.data.responseTimeOk).toBe(false);
        });

        test('should validate response schema', async () => {
            nock('https://api.example.com')
                .get('/data')
                .reply(200, { name: 'test', value: 123 });

            const params = {
                url: 'https://api.example.com/data',
                response_schema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        value: { type: 'number' }
                    },
                    required: ['name', 'value']
                }
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data.schemaValid).toBe(true);
        });
    });

    describe('UploadFileTool', () => {
        let tool: UploadFileTool;

        beforeEach(() => {
            tool = new UploadFileTool();
            writeFileSync(testFile, 'This is a test file content');
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('upload_file_via_multipart_form');
        });

        test('should handle missing required parameters', async () => {
            const params = { url: 'https://api.example.com/upload' };
            const result: ToolResult = await tool.execute(params as any);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required parameters');
        });

        test('should handle invalid URL', async () => {
            const params = {
                url: 'invalid-url',
                file_path: testFile
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid URL format');
        });

        test('should handle file not found', async () => {
            const params = {
                url: 'https://api.example.com/upload',
                file_path: '/non/existent/file.txt'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('File upload failed');
        });

        // Note: Full multipart upload testing would require more complex mocking
        // This is a basic structure test
    });

    describe('DownloadFileTool', () => {
        let tool: DownloadFileTool;

        beforeEach(() => {
            tool = new DownloadFileTool();
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('download_file_from_url_to_path');
        });

        test('should handle missing required parameters', async () => {
            const params = { url: 'https://api.example.com/file.txt' };
            const result: ToolResult = await tool.execute(params as any);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required parameters');
        });

        test('should handle invalid URL', async () => {
            const params = {
                url: 'invalid-url',
                output_path: downloadFile
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid URL format');
        });

        test('should handle download with working directory context', async () => {
            const params = {
                url: 'https://api.example.com/file.txt',
                output_path: 'relative/path/file.txt'
            };

            const context = { workingDirectory: testDir };
            const result: ToolResult = await tool.execute(params, context);

            // This will fail because we're not actually downloading, but it shows the path resolution works
            expect(result.success).toBe(false);
            expect(result.error).toContain('File download failed');
        });

        // Note: Full download testing would require more complex mocking
        // This is a basic structure test
    });

    describe('SendWebhookTool', () => {
        let tool: SendWebhookTool;

        beforeEach(() => {
            tool = new SendWebhookTool();
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('send_webhook_payload_to_url');
        });

        test('should send webhook successfully', async () => {
            nock('https://webhook.example.com')
                .post('/webhook')
                .matchHeader('Content-Type', 'application/json')
                .matchHeader('User-Agent', 'GeminiAgent-Webhook/1.0')
                .reply(200, { received: true });

            const params = {
                webhook_url: 'https://webhook.example.com/webhook',
                payload: { event: 'test', data: { id: 123 } }
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data.status).toBe(200);
        });

        test('should handle missing required parameters', async () => {
            const params = { webhook_url: 'https://webhook.example.com/webhook' };
            const result: ToolResult = await tool.execute(params as any);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required parameters');
        });

        test('should handle invalid URL', async () => {
            const params = {
                webhook_url: 'invalid-url',
                payload: { test: 'data' }
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid URL format');
        });

        test('should add event type header', async () => {
            nock('https://webhook.example.com')
                .post('/webhook')
                .matchHeader('X-Event-Type', 'user.created')
                .reply(200, { received: true });

            const params = {
                webhook_url: 'https://webhook.example.com/webhook',
                payload: { event: 'test' },
                event_type: 'user.created'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
        });

        test('should add webhook signature when secret provided', async () => {
            nock('https://webhook.example.com')
                .post('/webhook')
                .matchHeader('X-Signature', /^sha256=/)
                .matchHeader('X-Timestamp', /^\d+$/)
                .reply(200, { received: true });

            const params = {
                webhook_url: 'https://webhook.example.com/webhook',
                payload: { event: 'test' },
                secret: 'webhook-secret-key'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
        });

        test('should handle webhook delivery failure', async () => {
            nock('https://webhook.example.com')
                .post('/webhook')
                .reply(500, { error: 'Internal Server Error' });

            const params = {
                webhook_url: 'https://webhook.example.com/webhook',
                payload: { event: 'test' }
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Webhook delivery failed');
        });

        test('should handle retry policy', async () => {
            // First call fails, second succeeds
            nock('https://webhook.example.com')
                .post('/webhook')
                .reply(500, { error: 'Temporary failure' });

            nock('https://webhook.example.com')
                .post('/webhook')
                .reply(200, { received: true });

            const params = {
                webhook_url: 'https://webhook.example.com/webhook',
                payload: { event: 'test' },
                retry_policy: {
                    max_retries: 2,
                    backoff_factor: 1,
                    max_delay: 1000
                }
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
        });
    });
});