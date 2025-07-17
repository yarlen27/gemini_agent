import {
    SendPostRequestTool,
    TestGetEndpointTool,
    UploadFileTool,
    DownloadFileTool,
    SendWebhookTool
} from '../../../../src/tools/implementations/categories/http/HttpApiTool';
import { ToolResult } from '../../../../src/models/ToolResult';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('HTTP API Tools - Basic Functionality', () => {
    const testDir = join(__dirname, 'test-files');
    const testFile = join(testDir, 'test.txt');

    beforeEach(() => {
        // Clean up before each test
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('SendPostRequestTool', () => {
        let tool: SendPostRequestTool;

        beforeEach(() => {
            tool = new SendPostRequestTool();
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('send_post_request_with_json_body');
        });

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

        test('should handle missing body parameter', async () => {
            const params = { url: 'https://api.example.com/endpoint' };
            const result: ToolResult = await tool.execute(params as any);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required parameters');
        });

        test('should validate URL format properly', async () => {
            const params = {
                url: 'http://valid-url.com',
                body: { test: 'data' }
            };

            // This will fail on actual request but should pass URL validation
            const result: ToolResult = await tool.execute(params);
            
            // Should not be invalid URL error
            expect(result.error).not.toContain('Invalid URL format');
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

        test('should handle working directory context', async () => {
            const params = {
                url: 'https://api.example.com/upload',
                file_path: 'test.txt'
            };

            const context = { workingDirectory: testDir };
            const result: ToolResult = await tool.execute(params, context);

            // Should fail on actual upload but not on file path resolution
            expect(result.success).toBe(false);
            expect(result.error).toContain('File upload failed');
        });
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
                output_path: join(testDir, 'download.txt')
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid URL format');
        });

        test('should handle working directory context', async () => {
            const params = {
                url: 'https://api.example.com/file.txt',
                output_path: 'download.txt'
            };

            const context = { workingDirectory: testDir };
            const result: ToolResult = await tool.execute(params, context);

            // Should fail on actual download but not on path resolution
            expect(result.success).toBe(false);
            expect(result.error).toContain('File download failed');
        });
    });

    describe('SendWebhookTool', () => {
        let tool: SendWebhookTool;

        beforeEach(() => {
            tool = new SendWebhookTool();
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('send_webhook_payload_to_url');
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

        test('should handle missing payload parameter', async () => {
            const params = { webhook_url: 'https://webhook.example.com/webhook' };
            const result: ToolResult = await tool.execute(params as any);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required parameters');
        });
    });
});