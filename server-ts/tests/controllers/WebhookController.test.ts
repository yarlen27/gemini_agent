import request from 'supertest';
import express from 'express';
import { WebhookController } from '../../src/controllers/WebhookController';
import { GeminiService } from '../../src/services/GeminiService';
import { GitHubService } from '../../src/services/GitHubService';
import { ToolRegistry } from '../../src/tools/ToolRegistry';

// Mock services
jest.mock('../../src/services/GeminiService');
jest.mock('../../src/services/GitHubService');

describe('WebhookController', () => {
    let app: express.Application;
    let controller: WebhookController;
    let mockGeminiService: jest.Mocked<GeminiService>;
    let mockGitHubService: jest.Mocked<GitHubService>;
    let mockToolRegistry: ToolRegistry;

    beforeEach(() => {
        mockToolRegistry = new ToolRegistry();
        mockGeminiService = new GeminiService('test-key', mockToolRegistry) as jest.Mocked<GeminiService>;
        mockGitHubService = new GitHubService('test-token') as jest.Mocked<GitHubService>;
        
        controller = new WebhookController(mockGeminiService, mockGitHubService, mockToolRegistry);
        
        app = express();
        app.use(express.json());
        app.post('/webhook', controller.handleWebhook.bind(controller));
    });

    test('should handle webhook request successfully', async () => {
        const webhookPayload = {
            issue_number: '123',
            issue_title: 'Test Issue',
            issue_body: 'Test body',
            repo: 'owner/repo',
            github_token: 'test-token'
        };

        mockGeminiService.generateResponse.mockResolvedValue({
            conversation_id: 'test-id',
            action: 'finish',
            message: 'Task completed successfully'
        });

        mockGitHubService.cloneRepository.mockResolvedValue({
            success: true,
            data: 'Repository cloned'
        });

        mockGitHubService.createBranch.mockResolvedValue({
            success: true,
            data: 'Branch created'
        });

        mockGitHubService.commitChanges.mockResolvedValue({
            success: true,
            data: 'Changes committed'
        });

        mockGitHubService.pushBranch.mockResolvedValue({
            success: true,
            data: 'Branch pushed'
        });

        mockGitHubService.createPullRequestLink.mockResolvedValue({
            success: true,
            data: 'https://github.com/owner/repo/compare/main...test-branch'
        });

        const response = await request(app)
            .post('/webhook')
            .send(webhookPayload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Task completed successfully');
    });

    test('should handle missing required fields', async () => {
        const invalidPayload = {
            issue_number: '123'
            // Missing required fields
        };

        const response = await request(app)
            .post('/webhook')
            .send(invalidPayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing required fields');
    });

    test('should handle tool execution', async () => {
        const webhookPayload = {
            issue_number: '123',
            issue_title: 'Test Issue',
            issue_body: 'Test body',
            repo: 'owner/repo',
            github_token: 'test-token'
        };

        mockGeminiService.generateResponse
            .mockResolvedValueOnce({
                conversation_id: 'test-id',
                action: 'run_shell_command',
                command: 'echo "test"'
            })
            .mockResolvedValueOnce({
                conversation_id: 'test-id',
                action: 'finish',
                message: 'Task completed'
            });

        mockGitHubService.cloneRepository.mockResolvedValue({
            success: true,
            data: 'Repository cloned'
        });

        mockGitHubService.createBranch.mockResolvedValue({
            success: true,
            data: 'Branch created'
        });

        mockGitHubService.commitChanges.mockResolvedValue({
            success: true,
            data: 'Changes committed'
        });

        mockGitHubService.pushBranch.mockResolvedValue({
            success: true,
            data: 'Branch pushed'
        });

        mockGitHubService.createPullRequestLink.mockResolvedValue({
            success: true,
            data: 'https://github.com/owner/repo/compare/main...test-branch'
        });

        const response = await request(app)
            .post('/webhook')
            .send(webhookPayload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test('should handle service errors', async () => {
        const webhookPayload = {
            issue_number: '123',
            issue_title: 'Test Issue',
            issue_body: 'Test body',
            repo: 'owner/repo',
            github_token: 'test-token'
        };

        mockGitHubService.cloneRepository.mockResolvedValue({
            success: false,
            error: 'Service error'
        });

        const response = await request(app)
            .post('/webhook')
            .send(webhookPayload);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Service error');
    });
});