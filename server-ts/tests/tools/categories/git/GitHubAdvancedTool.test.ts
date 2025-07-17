import {
    CreateBranchFromMainTool,
    CreatePullRequestWithTemplateTool,
    AddCommentToIssueTool,
    GetDiffBetweenBranchesTool,
    CherryPickCommitTool
} from '../../../../src/tools/implementations/categories/git/GitHubAdvancedTool';
import { ToolResult } from '../../../../src/models/ToolResult';
import { ToolContext } from '../../../../src/tools/interfaces/ITool';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

jest.mock('child_process');
jest.mock('axios');
jest.mock('util');

const mockedExec = jest.fn();
const mockedPromisify = promisify as jest.MockedFunction<typeof promisify>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Set up mocks
mockedPromisify.mockReturnValue(mockedExec);

describe('CreateBranchFromMainTool', () => {
    let tool: CreateBranchFromMainTool;
    let context: ToolContext;

    beforeEach(() => {
        tool = new CreateBranchFromMainTool();
        context = { workingDirectory: '/test/repo' };
        jest.clearAllMocks();
    });

    test('should have correct name', () => {
        expect(tool.name).toBe('create_branch_from_main');
    });

    test('should create branch successfully with minimal parameters', async () => {
        mockedExec
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git fetch origin
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git checkout main
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git pull origin main
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git checkout -b new-branch
            .mockResolvedValueOnce({ stdout: '', stderr: '' }); // git checkout new-branch

        const params = { branch_name: 'feature/new-feature' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(true);
        expect(result.data.branch_name).toBe('feature/new-feature');
        expect(result.data.pushed_to_remote).toBe(false);
        expect(result.data.checked_out).toBe(true);
    });

    test('should create branch and push to remote when requested', async () => {
        mockedExec
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git fetch origin
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git checkout main
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git pull origin main
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git checkout -b new-branch
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git push -u origin new-branch
            .mockResolvedValueOnce({ stdout: '', stderr: '' }); // git checkout new-branch

        const params = { branch_name: 'feature/new-feature', push_to_remote: true };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(true);
        expect(result.data.pushed_to_remote).toBe(true);
        expect(mockedExec).toHaveBeenCalledWith('git push -u origin feature/new-feature', { cwd: '/test/repo' });
    });

    test('should handle missing branch name', async () => {
        const params = { branch_name: '' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required parameter: branch_name is required');
    });

    test('should handle invalid branch name format', async () => {
        const params = { branch_name: 'invalid branch name!' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid branch name format');
    });

    test('should handle git command errors', async () => {
        mockedExec.mockRejectedValueOnce(new Error('Git command failed'));

        const params = { branch_name: 'feature/new-feature' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('create_branch_from_main failed: Git command failed');
    });
});

describe('CreatePullRequestWithTemplateTool', () => {
    let tool: CreatePullRequestWithTemplateTool;
    let context: ToolContext;

    beforeEach(() => {
        tool = new CreatePullRequestWithTemplateTool();
        context = { workingDirectory: '/test/repo' };
        process.env.GITHUB_TOKEN = 'test-token';
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.GITHUB_TOKEN;
    });

    test('should have correct name', () => {
        expect(tool.name).toBe('create_pull_request_with_template');
    });

    test('should create pull request successfully', async () => {
        mockedExec
            .mockResolvedValueOnce({ stdout: 'https://github.com/test/repo.git', stderr: '' }) // git remote get-url origin
            .mockResolvedValueOnce({ stdout: 'feature/test-branch', stderr: '' }); // git rev-parse --abbrev-ref HEAD

        const mockPrResponse = {
            data: {
                number: 123,
                html_url: 'https://github.com/test/repo/pull/123',
                title: 'Test PR',
                head: { ref: 'feature/test-branch' },
                base: { ref: 'main' },
                draft: false,
                created_at: '2023-01-01T00:00:00Z'
            }
        };

        mockedAxios.post.mockResolvedValueOnce(mockPrResponse);

        const params = { title: 'Test PR', body: 'Test description' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(true);
        expect(result.data.pull_request_number).toBe(123);
        expect(result.data.pull_request_url).toBe('https://github.com/test/repo/pull/123');
        expect(result.data.title).toBe('Test PR');
    });

    test('should handle missing title', async () => {
        const params = { title: '' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required parameter: title is required');
    });

    test('should handle missing GitHub token', async () => {
        delete process.env.GITHUB_TOKEN;

        const params = { title: 'Test PR' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('GitHub token not found in environment variables');
    });

    test('should handle invalid remote URL', async () => {
        mockedExec.mockResolvedValueOnce({ stdout: 'invalid-url', stderr: '' });

        const params = { title: 'Test PR' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Could not determine GitHub repository from remote URL');
    });

    test('should handle API errors', async () => {
        mockedExec
            .mockResolvedValueOnce({ stdout: 'https://github.com/test/repo.git', stderr: '' })
            .mockResolvedValueOnce({ stdout: 'feature/test-branch', stderr: '' });

        mockedAxios.post.mockRejectedValueOnce({
            response: { data: { message: 'API error' } }
        });

        const params = { title: 'Test PR' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('API error');
    });
});

describe('AddCommentToIssueTool', () => {
    let tool: AddCommentToIssueTool;
    let context: ToolContext;

    beforeEach(() => {
        tool = new AddCommentToIssueTool();
        context = { workingDirectory: '/test/repo' };
        process.env.GITHUB_TOKEN = 'test-token';
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.GITHUB_TOKEN;
    });

    test('should have correct name', () => {
        expect(tool.name).toBe('add_comment_to_issue');
    });

    test('should add comment successfully', async () => {
        mockedExec.mockResolvedValueOnce({ stdout: 'https://github.com/test/repo.git', stderr: '' });

        const mockCommentResponse = {
            data: {
                id: 456,
                html_url: 'https://github.com/test/repo/issues/123#issuecomment-456',
                created_at: '2023-01-01T00:00:00Z'
            }
        };

        mockedAxios.post.mockResolvedValueOnce(mockCommentResponse);

        const params = { issue_number: 123, comment_body: 'Test comment' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(true);
        expect(result.data.comment_id).toBe(456);
        expect(result.data.issue_number).toBe(123);
        expect(result.data.closed_issue).toBe(false);
    });

    test('should add comment and close issue when requested', async () => {
        mockedExec.mockResolvedValueOnce({ stdout: 'https://github.com/test/repo.git', stderr: '' });

        const mockCommentResponse = {
            data: {
                id: 456,
                html_url: 'https://github.com/test/repo/issues/123#issuecomment-456',
                created_at: '2023-01-01T00:00:00Z'
            }
        };

        mockedAxios.post.mockResolvedValueOnce(mockCommentResponse);
        mockedAxios.patch.mockResolvedValueOnce({ data: {} });

        const params = { issue_number: 123, comment_body: 'Test comment', close_issue: true };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(true);
        expect(result.data.closed_issue).toBe(true);
        expect(mockedAxios.patch).toHaveBeenCalledWith(
            'https://api.github.com/repos/test/repo/issues/123',
            { state: 'closed' },
            expect.any(Object)
        );
    });

    test('should handle invalid issue number', async () => {
        const params = { issue_number: 0, comment_body: 'Test comment' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('issue_number must be a positive integer');
    });

    test('should handle missing comment body', async () => {
        const params = { issue_number: 123, comment_body: '' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('comment_body is required');
    });
});

describe('GetDiffBetweenBranchesTool', () => {
    let tool: GetDiffBetweenBranchesTool;
    let context: ToolContext;

    beforeEach(() => {
        tool = new GetDiffBetweenBranchesTool();
        context = { workingDirectory: '/test/repo' };
        jest.clearAllMocks();
    });

    test('should have correct name', () => {
        expect(tool.name).toBe('get_diff_between_branches');
    });

    test('should get diff successfully', async () => {
        mockedExec
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git fetch origin
            .mockResolvedValueOnce({ stdout: 'diff output', stderr: '' }) // git diff
            .mockResolvedValueOnce({ stdout: 'stats output', stderr: '' }); // git diff --stat

        const params = { base_branch: 'main', compare_branch: 'feature/test' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(true);
        expect(result.data.base_branch).toBe('main');
        expect(result.data.compare_branch).toBe('feature/test');
        expect(result.data.diff_output).toBe('diff output');
        expect(result.data.diff_stats).toBe('stats output');
        expect(result.data.summary_only).toBe(false);
    });

    test('should get summary only when requested', async () => {
        mockedExec
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git fetch origin
            .mockResolvedValueOnce({ stdout: 'M\tfile1.txt\nA\tfile2.txt', stderr: '' }); // git diff --name-status

        const params = { base_branch: 'main', compare_branch: 'feature/test', summary_only: true };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(true);
        expect(result.data.summary_only).toBe(true);
        expect(result.data.files_changed).toBe(2);
        expect(result.data.files).toEqual([
            { status: 'M', filename: 'file1.txt', old_filename: null },
            { status: 'A', filename: 'file2.txt', old_filename: null }
        ]);
    });

    test('should handle missing base branch', async () => {
        const params = { base_branch: '', compare_branch: 'feature/test' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required parameter: base_branch is required');
    });

    test('should handle missing compare branch', async () => {
        const params = { base_branch: 'main', compare_branch: '' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required parameter: compare_branch is required');
    });

    test('should handle git command errors', async () => {
        mockedExec.mockRejectedValueOnce(new Error('Git command failed'));

        const params = { base_branch: 'main', compare_branch: 'feature/test' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('get_diff_between_branches failed: Git command failed');
    });
});

describe('CherryPickCommitTool', () => {
    let tool: CherryPickCommitTool;
    let context: ToolContext;

    beforeEach(() => {
        tool = new CherryPickCommitTool();
        context = { workingDirectory: '/test/repo' };
        jest.clearAllMocks();
    });

    test('should have correct name', () => {
        expect(tool.name).toBe('cherry_pick_commit');
    });

    test('should cherry pick commit successfully', async () => {
        mockedExec
            .mockResolvedValueOnce({ stdout: 'main', stderr: '' }) // git rev-parse --abbrev-ref HEAD
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git fetch origin
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git cat-file -e commit_hash
            .mockResolvedValueOnce({ stdout: 'abc123|Test commit|John Doe|2023-01-01', stderr: '' }) // git log --format
            .mockResolvedValueOnce({ stdout: 'Cherry-pick successful', stderr: '' }) // git cherry-pick
            .mockResolvedValueOnce({ stdout: 'def456', stderr: '' }); // git rev-parse HEAD

        const params = { commit_hash: 'abc123' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(true);
        expect(result.data.original_commit.hash).toBe('abc123');
        expect(result.data.original_commit.subject).toBe('Test commit');
        expect(result.data.new_commit_hash).toBe('def456');
        expect(result.data.no_commit).toBe(false);
    });

    test('should handle no-commit cherry-pick', async () => {
        mockedExec
            .mockResolvedValueOnce({ stdout: 'main', stderr: '' }) // git rev-parse --abbrev-ref HEAD
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git fetch origin
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git cat-file -e commit_hash
            .mockResolvedValueOnce({ stdout: 'abc123|Test commit|John Doe|2023-01-01', stderr: '' }) // git log --format
            .mockResolvedValueOnce({ stdout: 'Cherry-pick successful', stderr: '' }); // git cherry-pick --no-commit

        const params = { commit_hash: 'abc123', no_commit: true };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(true);
        expect(result.data.no_commit).toBe(true);
        expect(result.data.new_commit_hash).toBe(null);
    });

    test('should handle cherry-pick conflicts', async () => {
        mockedExec
            .mockResolvedValueOnce({ stdout: 'main', stderr: '' }) // git rev-parse --abbrev-ref HEAD
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git fetch origin
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git cat-file -e commit_hash
            .mockResolvedValueOnce({ stdout: 'abc123|Test commit|John Doe|2023-01-01', stderr: '' }) // git log --format
            .mockRejectedValueOnce(new Error('CONFLICT (content): Merge conflict in file.txt')) // git cherry-pick
            .mockResolvedValueOnce({ stdout: 'file.txt\nfile2.txt', stderr: '' }); // git diff --name-only --diff-filter=U

        const params = { commit_hash: 'abc123' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Cherry-pick failed due to conflicts');
        expect(result.data.conflict).toBe(true);
        expect(result.data.conflicted_files).toEqual(['file.txt', 'file2.txt']);
    });

    test('should handle missing commit hash', async () => {
        const params = { commit_hash: '' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Missing required parameter: commit_hash is required');
    });

    test('should handle invalid commit hash format', async () => {
        const params = { commit_hash: 'invalid-hash!' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid commit hash format');
    });

    test('should handle non-existent commit', async () => {
        mockedExec
            .mockResolvedValueOnce({ stdout: 'main', stderr: '' }) // git rev-parse --abbrev-ref HEAD
            .mockResolvedValueOnce({ stdout: '', stderr: '' }) // git fetch origin
            .mockRejectedValueOnce(new Error('Not found')); // git cat-file -e commit_hash

        const params = { commit_hash: 'abc123' };
        const result: ToolResult = await tool.execute(params, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Commit abc123 not found in repository');
    });
});