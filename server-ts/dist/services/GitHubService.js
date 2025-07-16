"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubService = void 0;
const simple_git_1 = __importDefault(require("simple-git"));
const axios_1 = __importDefault(require("axios"));
const path_1 = require("path");
const fs_1 = require("fs");
class GitHubService {
    constructor(token) {
        if (!token) {
            throw new Error('GitHub token is required');
        }
        this.token = token;
        this.workDir = '/app/tmp/gemini-repos';
    }
    async cloneRepository(repo, issueNumber) {
        try {
            const repoPath = (0, path_1.join)(this.workDir, repo.replace('/', '_'), issueNumber);
            // Ensure work directory exists
            await fs_1.promises.mkdir(repoPath, { recursive: true });
            const git = (0, simple_git_1.default)();
            const cloneUrl = `https://${this.token}@github.com/${repo}.git`;
            await git.clone(cloneUrl, repoPath);
            return {
                success: true,
                data: `Repository cloned successfully to ${repoPath}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async createBranch(repo, issueNumber, branchName) {
        try {
            const repoPath = (0, path_1.join)(this.workDir, repo.replace('/', '_'), issueNumber);
            const git = (0, simple_git_1.default)(repoPath);
            await git.checkout(['-b', branchName]);
            return {
                success: true,
                data: `Branch created successfully: ${branchName}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async commitChanges(repo, issueNumber, message) {
        try {
            const repoPath = (0, path_1.join)(this.workDir, repo.replace('/', '_'), issueNumber);
            const git = (0, simple_git_1.default)(repoPath);
            await git.add('.');
            await git.commit(message);
            return {
                success: true,
                data: 'Changes committed successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async pushBranch(repo, issueNumber, branchName) {
        try {
            const repoPath = (0, path_1.join)(this.workDir, repo.replace('/', '_'), issueNumber);
            const git = (0, simple_git_1.default)(repoPath);
            await git.push('origin', branchName);
            return {
                success: true,
                data: `Branch pushed successfully: ${branchName}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async updateComment(repo, commentId, body) {
        try {
            const url = `https://api.github.com/repos/${repo}/issues/comments/${commentId}`;
            await axios_1.default.patch(url, { body }, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            });
            return {
                success: true,
                data: 'Comment updated successfully'
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async createPullRequestLink(repo, branchName, title, body) {
        try {
            const encodedTitle = encodeURIComponent(title);
            const encodedBody = encodeURIComponent(body);
            const prLink = `https://github.com/${repo}/compare/main...${branchName}?quick_pull=1&title=${encodedTitle}&body=${encodedBody}`;
            return {
                success: true,
                data: prLink
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    getRepositoryPath(repo, issueNumber) {
        return (0, path_1.join)(this.workDir, repo.replace('/', '_'), issueNumber);
    }
}
exports.GitHubService = GitHubService;
//# sourceMappingURL=GitHubService.js.map