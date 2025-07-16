"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const Logger_1 = require("../utils/Logger");
const uuid_1 = require("uuid");
class WebhookController {
    constructor(geminiService, githubService, toolRegistry) {
        this.geminiService = geminiService;
        this.githubService = githubService;
        this.toolRegistry = toolRegistry;
        this.logger = Logger_1.Logger.getInstance();
    }
    async handleWebhook(req, res) {
        try {
            const { issue_number, issue_title, issue_body, repo, github_token, comment_id } = req.body;
            // Initialize conversation
            const conversationId = (0, uuid_1.v4)();
            const branchName = `gemini-issue-${issue_number}`;
            // Log the incoming webhook request
            await this.logger.info('WebhookController', 'Received webhook request', {
                issue_number,
                issue_title,
                issue_body,
                repo,
                comment_id,
                conversationId,
                branchName
            }, conversationId, issue_number);
            // Validate required fields
            if (!issue_number || !issue_title || !issue_body || !repo || !github_token) {
                await this.logger.error('WebhookController', 'Missing required fields', { issue_number, issue_title, issue_body, repo, hasToken: !!github_token }, conversationId, issue_number);
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: issue_number, issue_title, issue_body, repo, github_token'
                });
                return;
            }
            // Clone repository
            await this.logger.info('WebhookController', 'Cloning repository', { repo }, conversationId, issue_number);
            const cloneResult = await this.githubService.cloneRepository(repo, issue_number);
            if (!cloneResult.success) {
                await this.logger.error('WebhookController', 'Failed to clone repository', { repo, error: cloneResult.error }, conversationId, issue_number);
                res.status(500).json({
                    success: false,
                    error: `Failed to clone repository: ${cloneResult.error}`
                });
                return;
            }
            // Create branch
            await this.logger.info('WebhookController', 'Creating branch', { branchName }, conversationId, issue_number);
            const branchResult = await this.githubService.createBranch(repo, issue_number, branchName);
            if (!branchResult.success) {
                await this.logger.error('WebhookController', 'Failed to create branch', { branchName, error: branchResult.error }, conversationId, issue_number);
                res.status(500).json({
                    success: false,
                    error: `Failed to create branch: ${branchResult.error}`
                });
                return;
            }
            // Prepare initial prompt
            const history = [
                {
                    role: 'user',
                    parts: [
                        {
                            text: `
You are an AI software engineering agent helping with GitHub issues.

Issue Title: ${issue_title}
Issue Body: ${issue_body}

Task from user: ${issue_body}

Analyze the issue and complete the requested task. Work autonomously and use the tools as needed.
When you're done, use the 'finish' action with a summary of what you accomplished.
                            `.trim()
                        }
                    ]
                }
            ];
            // Process with Gemini
            await this.logger.info('WebhookController', 'Starting Gemini conversation', { historyLength: history.length }, conversationId, issue_number);
            let response = await this.geminiService.generateResponse(history, conversationId, issue_number);
            response.conversation_id = conversationId;
            // Handle tool execution loop
            while (response.action !== 'finish') {
                await this.logger.info('WebhookController', `Executing tool: ${response.action}`, {
                    action: response.action,
                    command: response.command,
                    file_path: response.file_path,
                    content: response.content?.substring(0, 200) + '...'
                }, conversationId, issue_number);
                if (response.action === 'run_shell_command') {
                    const toolResult = await this.toolRegistry.execute('run_shell_command', {
                        command: response.command
                    });
                    // Log tool execution result
                    await this.logger.info('WebhookController', `Tool execution result: run_shell_command`, {
                        command: response.command,
                        success: toolResult.success,
                        stdout: toolResult.stdout,
                        stderr: toolResult.stderr,
                        error: toolResult.error,
                        exitCode: toolResult.exitCode
                    }, conversationId, issue_number);
                    history.push({
                        role: 'user',
                        parts: [
                            {
                                text: `Tool execution result for 'run_shell_command':
Command: ${response.command}
Success: ${toolResult.success}
${toolResult.stdout ? `Stdout: ${toolResult.stdout}` : ''}
${toolResult.stderr ? `Stderr: ${toolResult.stderr}` : ''}
${toolResult.error ? `Error: ${toolResult.error}` : ''}
Exit Code: ${toolResult.exitCode || 0}

Continue with your task. What is your next action?`
                            }
                        ]
                    });
                }
                else if (response.action === 'read_file') {
                    const toolResult = await this.toolRegistry.execute('read_file', {
                        file_path: response.file_path
                    });
                    // Log tool execution result
                    await this.logger.info('WebhookController', `Tool execution result: read_file`, {
                        file_path: response.file_path,
                        success: toolResult.success,
                        contentLength: toolResult.data?.length,
                        error: toolResult.error
                    }, conversationId, issue_number);
                    history.push({
                        role: 'user',
                        parts: [
                            {
                                text: `Tool execution result for 'read_file':
File Path: ${response.file_path}
Success: ${toolResult.success}
${toolResult.data ? `Content: ${toolResult.data}` : ''}
${toolResult.error ? `Error: ${toolResult.error}` : ''}

Continue with your task. What is your next action?`
                            }
                        ]
                    });
                }
                else if (response.action === 'write_file') {
                    const toolResult = await this.toolRegistry.execute('write_file', {
                        file_path: response.file_path,
                        content: response.content
                    });
                    // Log tool execution result
                    await this.logger.info('WebhookController', `Tool execution result: write_file`, {
                        file_path: response.file_path,
                        success: toolResult.success,
                        contentLength: response.content?.length,
                        result: toolResult.data,
                        error: toolResult.error
                    }, conversationId, issue_number);
                    history.push({
                        role: 'user',
                        parts: [
                            {
                                text: `Tool execution result for 'write_file':
File Path: ${response.file_path}
Success: ${toolResult.success}
${toolResult.data ? `Result: ${toolResult.data}` : ''}
${toolResult.error ? `Error: ${toolResult.error}` : ''}

Continue with your task. What is your next action?`
                            }
                        ]
                    });
                }
                else {
                    // Unknown action, finish
                    await this.logger.warn('WebhookController', `Unknown action received: ${response.action}`, { action: response.action }, conversationId, issue_number);
                    break;
                }
                // Get next response from Gemini
                await this.logger.info('WebhookController', 'Sending history back to Gemini for next action', { historyLength: history.length }, conversationId, issue_number);
                response = await this.geminiService.generateResponse(history, conversationId, issue_number);
                response.conversation_id = conversationId;
            }
            // Log completion of Gemini loop
            await this.logger.info('WebhookController', 'Gemini conversation completed', { finalAction: response.action, finalMessage: response.message }, conversationId, issue_number);
            // Commit changes
            const commitMessage = `feat: Resolves #${issue_number} - ${issue_title}`;
            await this.logger.info('WebhookController', 'Committing changes', { commitMessage }, conversationId, issue_number);
            const commitResult = await this.githubService.commitChanges(repo, issue_number, commitMessage);
            if (!commitResult.success) {
                await this.logger.error('WebhookController', 'Failed to commit changes', { commitMessage, error: commitResult.error }, conversationId, issue_number);
                res.status(500).json({
                    success: false,
                    error: `Failed to commit changes: ${commitResult.error}`
                });
                return;
            }
            // Push branch
            await this.logger.info('WebhookController', 'Pushing branch', { branchName }, conversationId, issue_number);
            const pushResult = await this.githubService.pushBranch(repo, issue_number, branchName);
            if (!pushResult.success) {
                await this.logger.error('WebhookController', 'Failed to push branch', { branchName, error: pushResult.error }, conversationId, issue_number);
                res.status(500).json({
                    success: false,
                    error: `Failed to push branch: ${pushResult.error}`
                });
                return;
            }
            // Create PR link
            const prTitle = `feat(issue-${issue_number}): ${issue_title}`;
            const prBody = `Resolves #${issue_number}\\n\\nThis PR was automatically generated by Gemini TypeScript.\\n\\nAgent's final message:\\n${response.message}`;
            await this.logger.info('WebhookController', 'Creating PR link', { prTitle, branchName }, conversationId, issue_number);
            const prResult = await this.githubService.createPullRequestLink(repo, branchName, prTitle, prBody);
            // Update comment with final result
            if (comment_id) {
                const commentBody = `Gemini TypeScript finished — [Create PR →](${prResult.data})\\n\\n✅ **Completed**: ${response.message}`;
                await this.logger.info('WebhookController', 'Updating GitHub comment', { comment_id, prLink: prResult.data }, conversationId, issue_number);
                await this.githubService.updateComment(repo, comment_id, commentBody);
            }
            await this.logger.info('WebhookController', 'Request completed successfully', {
                prLink: prResult.data,
                finalMessage: response.message
            }, conversationId, issue_number);
            res.status(200).json({
                success: true,
                message: response.message,
                pr_link: prResult.data,
                conversation_id: conversationId
            });
        }
        catch (error) {
            await this.logger.error('WebhookController', 'Request failed with error', { error: error.message, stack: error.stack }, undefined, undefined);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
exports.WebhookController = WebhookController;
//# sourceMappingURL=WebhookController.js.map