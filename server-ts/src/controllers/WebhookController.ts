import { Request, Response } from 'express';
import { GeminiService } from '../services/GeminiService';
import { GitHubService } from '../services/GitHubService';
import { ToolRegistry } from '../tools/ToolRegistry';
import { GeminiRequest } from '../models/GeminiRequest';
import { Logger } from '../utils/Logger';
import { v4 as uuidv4 } from 'uuid';
import { PlanService } from '../services/PlanService';
import { TaskPlan } from '../models/TaskPlan';

export class WebhookController {
    private geminiService: GeminiService;
    private githubService: GitHubService;
    private toolRegistry: ToolRegistry;
    private logger: Logger;
    private planService: PlanService;

    constructor(
        geminiService: GeminiService,
        githubService: GitHubService,
        toolRegistry: ToolRegistry
    ) {
        this.geminiService = geminiService;
        this.githubService = githubService;
        this.toolRegistry = toolRegistry;
        this.logger = Logger.getInstance();
        this.planService = PlanService.getInstance();
    }

    public async handleWebhook(req: Request, res: Response): Promise<void> {
        try {
            const { issue_number, issue_title, issue_body, repo, github_token, comment_id } = req.body;

            // Initialize conversation
            const conversationId = uuidv4();
            const branchName = `gemini-issue-${issue_number}`;

            // Log the incoming webhook request
            await this.logger.info(
                'WebhookController',
                'Received webhook request',
                {
                    issue_number,
                    issue_title,
                    issue_body,
                    repo,
                    comment_id,
                    conversationId,
                    branchName
                },
                conversationId,
                issue_number
            );

            // Validate required fields
            if (!issue_number || !issue_title || !issue_body || !repo || !github_token) {
                await this.logger.error(
                    'WebhookController',
                    'Missing required fields',
                    { issue_number, issue_title, issue_body, repo, hasToken: !!github_token },
                    conversationId,
                    issue_number
                );
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: issue_number, issue_title, issue_body, repo, github_token'
                });
                return;
            }

            // Clone repository
            await this.logger.info(
                'WebhookController',
                'Cloning repository',
                { repo },
                conversationId,
                issue_number
            );
            
            const cloneResult = await this.githubService.cloneRepository(repo, issue_number);
            if (!cloneResult.success) {
                await this.logger.error(
                    'WebhookController',
                    'Failed to clone repository',
                    { repo, error: cloneResult.error },
                    conversationId,
                    issue_number
                );
                res.status(500).json({
                    success: false,
                    error: `Failed to clone repository: ${cloneResult.error}`
                });
                return;
            }

            // Create branch
            await this.logger.info(
                'WebhookController',
                'Creating branch',
                { branchName },
                conversationId,
                issue_number
            );
            
            const branchResult = await this.githubService.createBranch(repo, issue_number, branchName);
            if (!branchResult.success) {
                await this.logger.error(
                    'WebhookController',
                    'Failed to create branch',
                    { branchName, error: branchResult.error },
                    conversationId,
                    issue_number
                );
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

            // Check if this is a complex task that would benefit from planning
            let currentPlan: TaskPlan | null = null;
            if (this.isComplexTask(issue_body)) {
                await this.logger.info(
                    'WebhookController',
                    'Complex task detected, creating initial plan',
                    { issue_title, issue_body },
                    conversationId,
                    issue_number
                );

                // Create initial plan for complex tasks
                currentPlan = await this.createInitialPlan(issue_title, issue_body, issue_number, repo);
                
                if (currentPlan) {
                    // Update comment with initial plan
                    if (comment_id) {
                        const planMarkdown = this.planService.generateMarkdown(currentPlan);
                        await this.githubService.updateComment(repo, comment_id, planMarkdown);
                    }
                }
            }

            // Process with Gemini
            await this.logger.info(
                'WebhookController',
                'Starting Gemini conversation',
                { historyLength: history.length },
                conversationId,
                issue_number
            );
            
            let response = await this.geminiService.generateResponse(history, conversationId, issue_number);
            response.conversation_id = conversationId;

            // Get working directory for tools
            const workingDirectory = this.githubService.getRepositoryPath(repo, issue_number);
            
            await this.logger.info(
                'WebhookController',
                'Tool working directory configured',
                { workingDirectory },
                conversationId,
                issue_number
            );
            
            // Handle tool execution loop
            while (response.action !== 'finish') {
                await this.logger.info(
                    'WebhookController',
                    `Executing tool: ${response.action}`,
                    { 
                        action: response.action,
                        command: response.command,
                        file_path: response.file_path,
                        content: response.content?.substring(0, 200) + '...'
                    },
                    conversationId,
                    issue_number
                );

                if (response.action === 'run_shell_command') {
                    const toolResult = await this.toolRegistry.execute('run_shell_command', {
                        command: response.command
                    }, { workingDirectory });
                    
                    // Log tool execution result
                    await this.logger.info(
                        'WebhookController',
                        `Tool execution result: run_shell_command`,
                        {
                            command: response.command,
                            success: toolResult.success,
                            stdout: toolResult.stdout,
                            stderr: toolResult.stderr,
                            error: toolResult.error,
                            exitCode: toolResult.exitCode
                        },
                        conversationId,
                        issue_number
                    );
                    
                    // Update plan progress if we have a plan
                    if (currentPlan) {
                        await this.updatePlanProgress(currentPlan, response.action, toolResult.success, 
                            `Comando: ${response.command} - ${toolResult.success ? 'Exitoso' : 'Falló'}`);
                        
                        // Update GitHub comment with plan progress
                        if (comment_id) {
                            const updatedPlan = await this.planService.getPlan(currentPlan.id);
                            if (updatedPlan) {
                                currentPlan = updatedPlan;
                                const planMarkdown = this.planService.generateMarkdown(currentPlan);
                                await this.githubService.updateComment(repo, comment_id, planMarkdown);
                            }
                        }
                    }
                    
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
                    }, { workingDirectory });
                    
                    // Log tool execution result
                    await this.logger.info(
                        'WebhookController',
                        `Tool execution result: read_file`,
                        {
                            file_path: response.file_path,
                            success: toolResult.success,
                            contentLength: toolResult.data?.length,
                            error: toolResult.error
                        },
                        conversationId,
                        issue_number
                    );
                    
                    // Update plan progress if we have a plan
                    if (currentPlan) {
                        await this.updatePlanProgress(currentPlan, response.action, toolResult.success, 
                            `Archivo leído: ${response.file_path}`);
                        
                        // Update GitHub comment with plan progress
                        if (comment_id) {
                            const updatedPlan = await this.planService.getPlan(currentPlan.id);
                            if (updatedPlan) {
                                currentPlan = updatedPlan;
                                const planMarkdown = this.planService.generateMarkdown(currentPlan);
                                await this.githubService.updateComment(repo, comment_id, planMarkdown);
                            }
                        }
                    }
                    
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
                    }, { workingDirectory });
                    
                    // Log tool execution result
                    await this.logger.info(
                        'WebhookController',
                        `Tool execution result: write_file`,
                        {
                            file_path: response.file_path,
                            success: toolResult.success,
                            contentLength: response.content?.length,
                            result: toolResult.data,
                            error: toolResult.error
                        },
                        conversationId,
                        issue_number
                    );
                    
                    // Update plan progress if we have a plan
                    if (currentPlan) {
                        await this.updatePlanProgress(currentPlan, response.action, toolResult.success, 
                            `Archivo escrito: ${response.file_path}`);
                        
                        // Update GitHub comment with plan progress
                        if (comment_id) {
                            const updatedPlan = await this.planService.getPlan(currentPlan.id);
                            if (updatedPlan) {
                                currentPlan = updatedPlan;
                                const planMarkdown = this.planService.generateMarkdown(currentPlan);
                                await this.githubService.updateComment(repo, comment_id, planMarkdown);
                            }
                        }
                    }
                    
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
                    await this.logger.warn(
                        'WebhookController',
                        `Unknown action received: ${response.action}`,
                        { action: response.action },
                        conversationId,
                        issue_number
                    );
                    break;
                }

                // Get next response from Gemini
                await this.logger.info(
                    'WebhookController',
                    'Sending history back to Gemini for next action',
                    { historyLength: history.length },
                    conversationId,
                    issue_number
                );
                
                response = await this.geminiService.generateResponse(history, conversationId, issue_number);
                response.conversation_id = conversationId;
            }

            // Log completion of Gemini loop
            await this.logger.info(
                'WebhookController',
                'Gemini conversation completed',
                { finalAction: response.action, finalMessage: response.message },
                conversationId,
                issue_number
            );

            // Commit changes
            const commitMessage = `feat: Resolves #${issue_number} - ${issue_title}`;
            await this.logger.info(
                'WebhookController',
                'Committing changes',
                { commitMessage },
                conversationId,
                issue_number
            );
            
            const commitResult = await this.githubService.commitChanges(repo, issue_number, commitMessage);
            if (!commitResult.success) {
                await this.logger.error(
                    'WebhookController',
                    'Failed to commit changes',
                    { commitMessage, error: commitResult.error },
                    conversationId,
                    issue_number
                );
                res.status(500).json({
                    success: false,
                    error: `Failed to commit changes: ${commitResult.error}`
                });
                return;
            }

            // Push branch
            await this.logger.info(
                'WebhookController',
                'Pushing branch',
                { branchName },
                conversationId,
                issue_number
            );
            
            const pushResult = await this.githubService.pushBranch(repo, issue_number, branchName);
            if (!pushResult.success) {
                await this.logger.error(
                    'WebhookController',
                    'Failed to push branch',
                    { branchName, error: pushResult.error },
                    conversationId,
                    issue_number
                );
                res.status(500).json({
                    success: false,
                    error: `Failed to push branch: ${pushResult.error}`
                });
                return;
            }

            // Create PR link
            const prTitle = `feat(issue-${issue_number}): ${issue_title}`;
            const prBody = `Resolves #${issue_number}\\n\\nThis PR was automatically generated by Gemini TypeScript.\\n\\nAgent's final message:\\n${response.message}`;
            
            await this.logger.info(
                'WebhookController',
                'Creating PR link',
                { prTitle, branchName },
                conversationId,
                issue_number
            );
            
            const prResult = await this.githubService.createPullRequestLink(repo, branchName, prTitle, prBody);

            // Update comment with final result
            if (comment_id) {
                let commentBody = `Gemini TypeScript finished — [Create PR →](${prResult.data})\\n\\n✅ **Completed**: ${response.message}`;
                
                // If we have a plan, update it to completed and include final results
                if (currentPlan) {
                    await this.planService.updatePlanStatus({
                        planId: currentPlan.id,
                        status: 'completed'
                    });
                    
                    const finalPlan = await this.planService.getPlan(currentPlan.id);
                    if (finalPlan) {
                        const finalMarkdown = this.planService.generateMarkdown(finalPlan);
                        commentBody = `${finalMarkdown}\\n\\n---\\n\\n**🚀 Implementación Completada**\\n\\n[Create PR →](${prResult.data})\\n\\n✅ **Resultado final**: ${response.message}`;
                    }
                }
                
                await this.logger.info(
                    'WebhookController',
                    'Updating GitHub comment',
                    { comment_id, prLink: prResult.data },
                    conversationId,
                    issue_number
                );
                
                await this.githubService.updateComment(repo, comment_id, commentBody);
            }

            await this.logger.info(
                'WebhookController',
                'Request completed successfully',
                { 
                    prLink: prResult.data, 
                    finalMessage: response.message 
                },
                conversationId,
                issue_number
            );

            res.status(200).json({
                success: true,
                message: response.message,
                pr_link: prResult.data,
                conversation_id: conversationId
            });

        } catch (error: any) {
            await this.logger.error(
                'WebhookController',
                'Request failed with error',
                { error: error.message, stack: error.stack },
                undefined,
                undefined
            );
            
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    private isComplexTask(issueBody: string): boolean {
        // Check for indicators of complex tasks
        const complexityIndicators = [
            'implement', 'create', 'add', 'build', 'develop', 'feature',
            'refactor', 'migration', 'integration', 'system', 'architecture',
            'multiple', 'several', 'various', 'different', 'components',
            'tests', 'testing', 'documentation', 'docs', 'api', 'endpoint',
            'database', 'model', 'service', 'controller', 'interface',
            'planning', 'plan', 'steps', 'phases', 'requirements'
        ];

        const lowerBody = issueBody.toLowerCase();
        const indicatorCount = complexityIndicators.filter(indicator => 
            lowerBody.includes(indicator)
        ).length;

        // Consider complex if multiple indicators or long description
        return indicatorCount >= 3 || issueBody.length > 500 || lowerBody.includes('feature:');
    }

    private async createInitialPlan(title: string, body: string, issueNumber: number, repo: string): Promise<TaskPlan | null> {
        try {
            // Create a basic plan structure based on common development patterns
            const sections = [
                {
                    name: 'Análisis y Preparación',
                    tasks: [
                        { description: 'Analizar requerimientos del issue', details: undefined },
                        { description: 'Revisar código existente relacionado', details: undefined },
                        { description: 'Identificar archivos a modificar', details: undefined }
                    ]
                },
                {
                    name: 'Implementación',
                    tasks: [
                        { description: 'Implementar funcionalidad principal', details: undefined },
                        { description: 'Crear/actualizar archivos necesarios', details: undefined },
                        { description: 'Integrar con sistemas existentes', details: undefined }
                    ]
                },
                {
                    name: 'Validación y Finalización',
                    tasks: [
                        { description: 'Ejecutar pruebas si existen', details: undefined },
                        { description: 'Verificar funcionamiento', details: undefined },
                        { description: 'Crear commit y push', details: undefined }
                    ]
                }
            ];

            // Customize based on issue content
            if (body.toLowerCase().includes('test')) {
                sections[1].tasks.push({
                    description: 'Crear tests unitarios',
                    details: undefined
                });
            }

            if (body.toLowerCase().includes('documentation') || body.toLowerCase().includes('docs')) {
                sections[2].tasks.push({
                    description: 'Actualizar documentación',
                    details: undefined
                });
            }

            const plan = await this.planService.createPlan({
                title: `Plan: ${title}`,
                sections,
                issueNumber,
                repository: repo
            });

            return plan;
        } catch (error) {
            await this.logger.error(
                'WebhookController',
                'Failed to create initial plan',
                { error: error instanceof Error ? error.message : String(error) },
                undefined,
                issueNumber?.toString()
            );
            return null;
        }
    }

    private async updatePlanProgress(plan: TaskPlan, action: string, success: boolean, details?: string): Promise<void> {
        if (!plan) return;

        try {
            // Find the most appropriate task to update based on the action
            let taskToUpdate: { sectionIndex: number; taskIndex: number; taskId: string } | null = null;

            for (let sectionIndex = 0; sectionIndex < plan.sections.length; sectionIndex++) {
                const section = plan.sections[sectionIndex];
                for (let taskIndex = 0; taskIndex < section.tasks.length; taskIndex++) {
                    const task = section.tasks[taskIndex];
                    if (!task.completed && this.doesActionMatchTask(action, task.description)) {
                        taskToUpdate = { sectionIndex, taskIndex, taskId: task.id };
                        break;
                    }
                }
                if (taskToUpdate) break;
            }

            if (taskToUpdate && success) {
                await this.planService.updateTaskStatus({
                    planId: plan.id,
                    taskId: taskToUpdate.taskId,
                    completed: true,
                    details: details || `Completado: ${action}`
                });

                await this.logger.info(
                    'WebhookController',
                    'Updated plan progress',
                    { planId: plan.id, taskId: taskToUpdate.taskId, action },
                    undefined,
                    plan.issueNumber?.toString()
                );
            }
        } catch (error) {
            await this.logger.error(
                'WebhookController',
                'Failed to update plan progress',
                { error: error instanceof Error ? error.message : String(error), planId: plan.id, action },
                undefined,
                plan.issueNumber?.toString()
            );
        }
    }

    private doesActionMatchTask(action: string, taskDescription: string): boolean {
        const actionMappings = {
            'read_file': ['analizar', 'revisar', 'identificar'],
            'write_file': ['implementar', 'crear', 'actualizar'],
            'run_shell_command': ['ejecutar', 'verificar', 'commit', 'push', 'pruebas']
        };

        const mappings = actionMappings[action as keyof typeof actionMappings] || [];
        const lowerTask = taskDescription.toLowerCase();
        
        return mappings.some(mapping => lowerTask.includes(mapping));
    }
}