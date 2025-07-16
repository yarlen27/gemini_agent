import { Request, Response } from 'express';
import { GeminiService } from '../services/GeminiService';
import { GitHubService } from '../services/GitHubService';
import { ToolRegistry } from '../tools/ToolRegistry';
import { GeminiRequest } from '../models/GeminiRequest';
import { v4 as uuidv4 } from 'uuid';

export class WebhookController {
    private geminiService: GeminiService;
    private githubService: GitHubService;
    private toolRegistry: ToolRegistry;

    constructor(
        geminiService: GeminiService,
        githubService: GitHubService,
        toolRegistry: ToolRegistry
    ) {
        this.geminiService = geminiService;
        this.githubService = githubService;
        this.toolRegistry = toolRegistry;
    }

    public async handleWebhook(req: Request, res: Response): Promise<void> {
        try {
            const { issue_number, issue_title, issue_body, repo, github_token, comment_id } = req.body;

            // Validate required fields
            if (!issue_number || !issue_title || !issue_body || !repo || !github_token) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: issue_number, issue_title, issue_body, repo, github_token'
                });
                return;
            }

            // Initialize conversation
            const conversationId = uuidv4();
            const branchName = `gemini-issue-${issue_number}`;

            // Clone repository
            const cloneResult = await this.githubService.cloneRepository(repo, issue_number);
            if (!cloneResult.success) {
                res.status(500).json({
                    success: false,
                    error: `Failed to clone repository: ${cloneResult.error}`
                });
                return;
            }

            // Create branch
            const branchResult = await this.githubService.createBranch(repo, issue_number, branchName);
            if (!branchResult.success) {
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
            let response = await this.geminiService.generateResponse(history);
            response.conversation_id = conversationId;

            // Handle tool execution loop
            while (response.action !== 'finish') {
                if (response.action === 'run_shell_command') {
                    const toolResult = await this.toolRegistry.execute('run_shell_command', {
                        command: response.command
                    });
                    
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
                } else if (response.action === 'read_file') {
                    const toolResult = await this.toolRegistry.execute('read_file', {
                        file_path: response.file_path
                    });
                    
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
                } else if (response.action === 'write_file') {
                    const toolResult = await this.toolRegistry.execute('write_file', {
                        file_path: response.file_path,
                        content: response.content
                    });
                    
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
                } else {
                    // Unknown action, finish
                    break;
                }

                // Get next response from Gemini
                response = await this.geminiService.generateResponse(history);
                response.conversation_id = conversationId;
            }

            // Commit changes
            const commitMessage = `feat: Resolves #${issue_number} - ${issue_title}`;
            const commitResult = await this.githubService.commitChanges(repo, issue_number, commitMessage);
            if (!commitResult.success) {
                res.status(500).json({
                    success: false,
                    error: `Failed to commit changes: ${commitResult.error}`
                });
                return;
            }

            // Push branch
            const pushResult = await this.githubService.pushBranch(repo, issue_number, branchName);
            if (!pushResult.success) {
                res.status(500).json({
                    success: false,
                    error: `Failed to push branch: ${pushResult.error}`
                });
                return;
            }

            // Create PR link
            const prTitle = `feat(issue-${issue_number}): ${issue_title}`;
            const prBody = `Resolves #${issue_number}\\n\\nThis PR was automatically generated by Gemini TypeScript.\\n\\nAgent's final message:\\n${response.message}`;
            const prResult = await this.githubService.createPullRequestLink(repo, branchName, prTitle, prBody);

            // Update comment with final result
            if (comment_id) {
                const commentBody = `Gemini TypeScript finished — [Create PR →](${prResult.data})\\n\\n✅ **Completed**: ${response.message}`;
                await this.githubService.updateComment(repo, comment_id, commentBody);
            }

            res.status(200).json({
                success: true,
                message: response.message,
                pr_link: prResult.data,
                conversation_id: conversationId
            });

        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}