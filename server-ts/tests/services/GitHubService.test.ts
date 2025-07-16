import { GitHubService } from '../../src/services/GitHubService';
import { promises as fs } from 'fs';
import { join } from 'path';

// Mock simple-git
jest.mock('simple-git', () => {
    const mockGit = {
        clone: jest.fn().mockResolvedValue(undefined),
        checkout: jest.fn().mockResolvedValue(undefined),
        add: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined),
        push: jest.fn().mockResolvedValue(undefined),
        cwd: jest.fn().mockReturnThis(),
    };
    return jest.fn(() => mockGit);
});

// Mock axios
jest.mock('axios', () => ({
    post: jest.fn(),
    patch: jest.fn(),
    get: jest.fn(),
}));

describe('GitHubService', () => {
    let githubService: GitHubService;
    const testToken = 'test-token';
    const testRepo = 'owner/repo';
    const testIssueNumber = '123';

    beforeEach(() => {
        githubService = new GitHubService(testToken);
        jest.clearAllMocks();
    });

    test('should initialize with token', () => {
        expect(githubService).toBeDefined();
    });

    test('should throw error without token', () => {
        expect(() => new GitHubService('')).toThrow('GitHub token is required');
    });

    test('should clone repository', async () => {
        const result = await githubService.cloneRepository(testRepo, testIssueNumber);
        
        expect(result.success).toBe(true);
        expect(result.data).toContain('Repository cloned successfully');
    });

    test('should create branch', async () => {
        const branchName = 'feature/test-branch';
        const result = await githubService.createBranch(testRepo, testIssueNumber, branchName);
        
        expect(result.success).toBe(true);
        expect(result.data).toContain('Branch created successfully');
    });

    test('should commit changes', async () => {
        const commitMessage = 'Test commit';
        const result = await githubService.commitChanges(testRepo, testIssueNumber, commitMessage);
        
        expect(result.success).toBe(true);
        expect(result.data).toContain('Changes committed successfully');
    });

    test('should push branch', async () => {
        const branchName = 'feature/test-branch';
        const result = await githubService.pushBranch(testRepo, testIssueNumber, branchName);
        
        expect(result.success).toBe(true);
        expect(result.data).toContain('Branch pushed successfully');
    });

    test('should update comment', async () => {
        const axios = require('axios');
        axios.patch.mockResolvedValue({ data: { id: 1 } });

        const commentId = '456';
        const body = 'Updated comment';
        const result = await githubService.updateComment(testRepo, commentId, body);
        
        expect(result.success).toBe(true);
        expect(result.data).toContain('Comment updated successfully');
        expect(axios.patch).toHaveBeenCalledWith(
            `https://api.github.com/repos/${testRepo}/issues/comments/${commentId}`,
            { body },
            {
                headers: {
                    'Authorization': `token ${testToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            }
        );
    });

    test('should create pull request link', async () => {
        const branchName = 'feature/test-branch';
        const title = 'Test PR';
        const body = 'Test PR body';
        
        const result = await githubService.createPullRequestLink(testRepo, branchName, title, body);
        
        expect(result.success).toBe(true);
        expect(result.data).toContain('quick_pull=1');
        expect(result.data).toContain(encodeURIComponent(title));
    });

    test('should handle git errors', async () => {
        const simpleGit = require('simple-git');
        const mockGit = simpleGit();
        mockGit.clone.mockRejectedValue(new Error('Git error'));

        const result = await githubService.cloneRepository(testRepo, testIssueNumber);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Git error');
    });

    test('should handle API errors', async () => {
        const axios = require('axios');
        axios.patch.mockRejectedValue(new Error('API error'));

        const result = await githubService.updateComment(testRepo, '456', 'test');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('API error');
    });
});