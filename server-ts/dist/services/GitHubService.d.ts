import { ToolResult } from '../models/ToolResult';
export declare class GitHubService {
    private token;
    private workDir;
    constructor(token: string);
    cloneRepository(repo: string, issueNumber: string): Promise<ToolResult>;
    createBranch(repo: string, issueNumber: string, branchName: string): Promise<ToolResult>;
    commitChanges(repo: string, issueNumber: string, message: string): Promise<ToolResult>;
    pushBranch(repo: string, issueNumber: string, branchName: string): Promise<ToolResult>;
    updateComment(repo: string, commentId: string, body: string): Promise<ToolResult>;
    createPullRequestLink(repo: string, branchName: string, title: string, body: string): Promise<ToolResult>;
    getRepositoryPath(repo: string, issueNumber: string): string;
}
//# sourceMappingURL=GitHubService.d.ts.map