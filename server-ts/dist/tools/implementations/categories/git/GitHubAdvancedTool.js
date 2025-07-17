"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CherryPickCommitTool = exports.GetDiffBetweenBranchesTool = exports.AddCommentToIssueTool = exports.CreatePullRequestWithTemplateTool = exports.CreateBranchFromMainTool = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const axios_1 = __importDefault(require("axios"));
const path_1 = require("path");
const fs_1 = require("fs");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class CreateBranchFromMainTool {
    constructor() {
        this.name = 'create_branch_from_main';
    }
    async execute(params, context) {
        try {
            // Validate required parameters
            if (!params.branch_name || params.branch_name.trim() === '') {
                return {
                    success: false,
                    error: 'Missing required parameter: branch_name is required'
                };
            }
            // Validate branch name conventions
            const branchNameRegex = /^[a-zA-Z0-9_\-\/]+$/;
            if (!branchNameRegex.test(params.branch_name)) {
                return {
                    success: false,
                    error: 'Invalid branch name format. Use alphanumeric characters, hyphens, underscores, and slashes only.'
                };
            }
            const workingDir = context?.workingDirectory || process.cwd();
            const execOptions = { cwd: workingDir };
            // Ensure we're starting from main branch
            await execAsync('git fetch origin', execOptions);
            await execAsync('git checkout main', execOptions);
            await execAsync('git pull origin main', execOptions);
            // Create new branch from main
            await execAsync(`git checkout -b ${params.branch_name}`, execOptions);
            let result = `Branch '${params.branch_name}' created successfully from main`;
            // Push to remote if requested
            if (params.push_to_remote) {
                await execAsync(`git push -u origin ${params.branch_name}`, execOptions);
                result += ' and pushed to remote';
            }
            // Switch to new branch if requested (default behavior)
            if (params.checkout_after_create !== false) {
                await execAsync(`git checkout ${params.branch_name}`, execOptions);
                result += ` and checked out`;
            }
            return {
                success: true,
                data: {
                    branch_name: params.branch_name,
                    message: result,
                    pushed_to_remote: params.push_to_remote || false,
                    checked_out: params.checkout_after_create !== false
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `create_branch_from_main failed: ${error.message}`
            };
        }
    }
}
exports.CreateBranchFromMainTool = CreateBranchFromMainTool;
class CreatePullRequestWithTemplateTool {
    constructor() {
        this.name = 'create_pull_request_with_template';
    }
    async execute(params, context) {
        try {
            // Validate required parameters
            if (!params.title || params.title.trim() === '') {
                return {
                    success: false,
                    error: 'Missing required parameter: title is required'
                };
            }
            const workingDir = context?.workingDirectory || process.cwd();
            const execOptions = { cwd: workingDir };
            // Get GitHub token from environment
            const githubToken = process.env.GITHUB_TOKEN;
            if (!githubToken) {
                return {
                    success: false,
                    error: 'GitHub token not found in environment variables'
                };
            }
            // Get repository info
            const { stdout: remoteUrl } = await execAsync('git remote get-url origin', execOptions);
            const repoMatch = remoteUrl.match(/github\.com[/:](.*?)(\.git)?$/);
            if (!repoMatch) {
                return {
                    success: false,
                    error: 'Could not determine GitHub repository from remote URL'
                };
            }
            const repoFullName = repoMatch[1].trim();
            // Get current branch
            const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', execOptions);
            const headBranch = params.head_branch || currentBranch.trim();
            const baseBranch = params.base_branch || 'main';
            // Load PR template if specified
            let prBody = params.body || '';
            if (params.template) {
                try {
                    const templatePath = (0, path_1.join)(workingDir, '.github', 'pull_request_template.md');
                    const templateContent = await fs_1.promises.readFile(templatePath, 'utf-8');
                    prBody = templateContent + '\n\n' + prBody;
                }
                catch (error) {
                    // Template not found, continue without it
                }
            }
            // Create pull request via GitHub API
            const prData = {
                title: params.title,
                body: prBody,
                head: headBranch,
                base: baseBranch,
                draft: params.draft || false
            };
            const response = await axios_1.default.post(`https://api.github.com/repos/${repoFullName}/pulls`, prData, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                }
            });
            return {
                success: true,
                data: {
                    pull_request_number: response.data.number,
                    pull_request_url: response.data.html_url,
                    title: response.data.title,
                    head_branch: response.data.head.ref,
                    base_branch: response.data.base.ref,
                    draft: response.data.draft,
                    created_at: response.data.created_at
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `create_pull_request_with_template failed: ${error.response?.data?.message || error.message}`
            };
        }
    }
}
exports.CreatePullRequestWithTemplateTool = CreatePullRequestWithTemplateTool;
class AddCommentToIssueTool {
    constructor() {
        this.name = 'add_comment_to_issue';
    }
    async execute(params, context) {
        try {
            // Validate required parameters
            if (!params.issue_number || params.issue_number <= 0) {
                return {
                    success: false,
                    error: 'Missing or invalid required parameter: issue_number must be a positive integer'
                };
            }
            if (!params.comment_body || params.comment_body.trim() === '') {
                return {
                    success: false,
                    error: 'Missing required parameter: comment_body is required'
                };
            }
            const workingDir = context?.workingDirectory || process.cwd();
            const execOptions = { cwd: workingDir };
            // Get GitHub token from environment
            const githubToken = process.env.GITHUB_TOKEN;
            if (!githubToken) {
                return {
                    success: false,
                    error: 'GitHub token not found in environment variables'
                };
            }
            // Get repository info
            const { stdout: remoteUrl } = await execAsync('git remote get-url origin', execOptions);
            const repoMatch = remoteUrl.match(/github\.com[/:](.*?)(\.git)?$/);
            if (!repoMatch) {
                return {
                    success: false,
                    error: 'Could not determine GitHub repository from remote URL'
                };
            }
            const repoFullName = repoMatch[1].trim();
            // Add comment to issue
            const commentData = {
                body: params.comment_body
            };
            const response = await axios_1.default.post(`https://api.github.com/repos/${repoFullName}/issues/${params.issue_number}/comments`, commentData, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                }
            });
            let result = {
                comment_id: response.data.id,
                comment_url: response.data.html_url,
                issue_number: params.issue_number,
                created_at: response.data.created_at,
                closed_issue: false
            };
            // Close issue if requested
            if (params.close_issue) {
                await axios_1.default.patch(`https://api.github.com/repos/${repoFullName}/issues/${params.issue_number}`, { state: 'closed' }, {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    }
                });
                result.closed_issue = true;
            }
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            return {
                success: false,
                error: `add_comment_to_issue failed: ${error.response?.data?.message || error.message}`
            };
        }
    }
}
exports.AddCommentToIssueTool = AddCommentToIssueTool;
class GetDiffBetweenBranchesTool {
    constructor() {
        this.name = 'get_diff_between_branches';
    }
    async execute(params, context) {
        try {
            // Validate required parameters
            if (!params.base_branch || params.base_branch.trim() === '') {
                return {
                    success: false,
                    error: 'Missing required parameter: base_branch is required'
                };
            }
            if (!params.compare_branch || params.compare_branch.trim() === '') {
                return {
                    success: false,
                    error: 'Missing required parameter: compare_branch is required'
                };
            }
            const workingDir = context?.workingDirectory || process.cwd();
            const execOptions = { cwd: workingDir };
            // Fetch latest changes
            await execAsync('git fetch origin', execOptions);
            // Build diff command
            let diffCommand = `git diff ${params.base_branch}...${params.compare_branch}`;
            // Add file filter if specified
            if (params.file_filter) {
                diffCommand += ` -- ${params.file_filter}`;
            }
            // Get diff output
            const { stdout: diffOutput } = await execAsync(diffCommand, execOptions);
            // If summary_only is requested, get just the file names
            if (params.summary_only) {
                const { stdout: summaryOutput } = await execAsync(`git diff --name-status ${params.base_branch}...${params.compare_branch}${params.file_filter ? ' -- ' + params.file_filter : ''}`, execOptions);
                const files = summaryOutput.trim().split('\n').filter(line => line.trim()).map(line => {
                    const parts = line.split('\t');
                    return {
                        status: parts[0],
                        filename: parts[1],
                        old_filename: parts[2] || null // For renamed files
                    };
                });
                return {
                    success: true,
                    data: {
                        base_branch: params.base_branch,
                        compare_branch: params.compare_branch,
                        summary_only: true,
                        files_changed: files.length,
                        files: files
                    }
                };
            }
            // Parse diff stats
            const { stdout: statsOutput } = await execAsync(`git diff --stat ${params.base_branch}...${params.compare_branch}${params.file_filter ? ' -- ' + params.file_filter : ''}`, execOptions);
            return {
                success: true,
                data: {
                    base_branch: params.base_branch,
                    compare_branch: params.compare_branch,
                    summary_only: false,
                    diff_output: diffOutput,
                    diff_stats: statsOutput,
                    file_filter: params.file_filter || null
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `get_diff_between_branches failed: ${error.message}`
            };
        }
    }
}
exports.GetDiffBetweenBranchesTool = GetDiffBetweenBranchesTool;
class CherryPickCommitTool {
    constructor() {
        this.name = 'cherry_pick_commit';
    }
    async execute(params, context) {
        try {
            // Validate required parameters
            if (!params.commit_hash || params.commit_hash.trim() === '') {
                return {
                    success: false,
                    error: 'Missing required parameter: commit_hash is required'
                };
            }
            // Validate commit hash format (basic check)
            const commitHashRegex = /^[a-f0-9]{6,40}$/i;
            if (!commitHashRegex.test(params.commit_hash)) {
                return {
                    success: false,
                    error: 'Invalid commit hash format. Must be a valid Git commit hash.'
                };
            }
            const workingDir = context?.workingDirectory || process.cwd();
            const execOptions = { cwd: workingDir };
            // Get current branch
            const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', execOptions);
            const targetBranch = params.target_branch || currentBranch.trim();
            // Switch to target branch if different from current
            if (params.target_branch && params.target_branch !== currentBranch.trim()) {
                await execAsync(`git checkout ${params.target_branch}`, execOptions);
            }
            // Fetch to ensure we have the latest commits
            await execAsync('git fetch origin', execOptions);
            // Check if commit exists
            try {
                await execAsync(`git cat-file -e ${params.commit_hash}`, execOptions);
            }
            catch (error) {
                return {
                    success: false,
                    error: `Commit ${params.commit_hash} not found in repository`
                };
            }
            // Get commit information
            const { stdout: commitInfo } = await execAsync(`git log --format="%H|%s|%an|%ad" -1 ${params.commit_hash}`, execOptions);
            const [fullHash, subject, author, date] = commitInfo.trim().split('|');
            // Perform cherry-pick
            let cherryPickCommand = `git cherry-pick ${params.commit_hash}`;
            if (params.no_commit) {
                cherryPickCommand += ' --no-commit';
            }
            try {
                const { stdout: cherryPickOutput } = await execAsync(cherryPickCommand, execOptions);
                // Get the new commit hash if committed
                let newCommitHash = null;
                if (!params.no_commit) {
                    const { stdout: newHash } = await execAsync('git rev-parse HEAD', execOptions);
                    newCommitHash = newHash.trim();
                }
                return {
                    success: true,
                    data: {
                        original_commit: {
                            hash: fullHash,
                            subject: subject,
                            author: author,
                            date: date
                        },
                        target_branch: targetBranch,
                        new_commit_hash: newCommitHash,
                        no_commit: params.no_commit || false,
                        cherry_pick_output: cherryPickOutput
                    }
                };
            }
            catch (cherryPickError) {
                // Handle cherry-pick conflicts
                if (cherryPickError.message.includes('CONFLICT')) {
                    // Get conflicted files
                    const { stdout: conflictFiles } = await execAsync('git diff --name-only --diff-filter=U', execOptions);
                    return {
                        success: false,
                        error: `Cherry-pick failed due to conflicts. Manual resolution required.`,
                        data: {
                            conflict: true,
                            conflicted_files: conflictFiles.trim().split('\n').filter(f => f.trim()),
                            resolution_steps: [
                                'Resolve conflicts in the listed files',
                                'Add resolved files with: git add <file>',
                                'Continue cherry-pick with: git cherry-pick --continue',
                                'Or abort with: git cherry-pick --abort'
                            ]
                        }
                    };
                }
                throw cherryPickError;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `cherry_pick_commit failed: ${error.message}`
            };
        }
    }
}
exports.CherryPickCommitTool = CherryPickCommitTool;
//# sourceMappingURL=GitHubAdvancedTool.js.map