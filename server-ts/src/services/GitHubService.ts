import simpleGit from 'simple-git';
import axios from 'axios';
import { ToolResult } from '../models/ToolResult';
import { join } from 'path';
import { promises as fs } from 'fs';

export class GitHubService {
    private token: string;
    private workDir: string;

    constructor(token: string) {
        if (!token) {
            throw new Error('GitHub token is required');
        }
        this.token = token;
        this.workDir = '/app/tmp/gemini-repos';
    }

    public async cloneRepository(repo: string, issueNumber: string): Promise<ToolResult> {
        try {
            const repoPath = join(this.workDir, repo.replace('/', '_'), issueNumber);
            
            // Ensure work directory exists
            await fs.mkdir(repoPath, { recursive: true });
            
            const git = simpleGit();
            const cloneUrl = `https://${this.token}@github.com/${repo}.git`;
            
            await git.clone(cloneUrl, repoPath);
            
            return {
                success: true,
                data: `Repository cloned successfully to ${repoPath}`
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    public async createBranch(repo: string, issueNumber: string, branchName: string): Promise<ToolResult> {
        try {
            const repoPath = join(this.workDir, repo.replace('/', '_'), issueNumber);
            const git = simpleGit(repoPath);
            
            await git.checkout(['-b', branchName]);
            
            return {
                success: true,
                data: `Branch created successfully: ${branchName}`
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    public async commitChanges(repo: string, issueNumber: string, message: string): Promise<ToolResult> {
        try {
            const repoPath = join(this.workDir, repo.replace('/', '_'), issueNumber);
            const git = simpleGit(repoPath);
            
            await git.add('.');
            await git.commit(message);
            
            return {
                success: true,
                data: 'Changes committed successfully'
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    public async pushBranch(repo: string, issueNumber: string, branchName: string): Promise<ToolResult> {
        try {
            const repoPath = join(this.workDir, repo.replace('/', '_'), issueNumber);
            const git = simpleGit(repoPath);
            
            await git.push('origin', branchName);
            
            return {
                success: true,
                data: `Branch pushed successfully: ${branchName}`
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    public async updateComment(repo: string, commentId: string, body: string): Promise<ToolResult> {
        try {
            const url = `https://api.github.com/repos/${repo}/issues/comments/${commentId}`;
            
            await axios.patch(url, { body }, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            });
            
            return {
                success: true,
                data: 'Comment updated successfully'
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    public async createPullRequestLink(repo: string, branchName: string, title: string, body: string): Promise<ToolResult> {
        try {
            const encodedTitle = encodeURIComponent(title);
            const encodedBody = encodeURIComponent(body);
            
            const prLink = `https://github.com/${repo}/compare/main...${branchName}?quick_pull=1&title=${encodedTitle}&body=${encodedBody}`;
            
            return {
                success: true,
                data: prLink
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    public getRepositoryPath(repo: string, issueNumber: string): string {
        return join(this.workDir, repo.replace('/', '_'), issueNumber);
    }
}