import { ITool, ToolContext } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
import { PlanService } from '../../services/PlanService';
import { TaskPlan, PlanCreateRequest, PlanUpdateRequest, PlanStatusRequest } from '../../models/TaskPlan';
import { Logger } from '../../utils/Logger';

export interface PlanningToolParameters {
    action: 'create' | 'update_task' | 'update_status' | 'get' | 'get_by_issue' | 'generate_markdown' | 'delete';
    planId?: string;
    taskId?: string;
    title?: string;
    sections?: Array<{
        name: string;
        tasks: Array<{
            description: string;
            details?: string;
        }>;
    }>;
    completed?: boolean;
    details?: string;
    status?: 'planning' | 'executing' | 'completed';
    issueNumber?: number;
    repository?: string;
}

export class PlanningTool implements ITool {
    public readonly name = 'planning';
    private planService: PlanService;
    private logger: Logger;

    constructor() {
        this.planService = PlanService.getInstance();
        this.logger = Logger.getInstance();
    }

    public async execute(args: PlanningToolParameters, context?: ToolContext): Promise<ToolResult> {
        try {
            this.logger.info('PlanningTool', `Executing action: ${args.action}`);
            
            // Validate required parameters based on action
            const validationResult = this.validateParameters(args);
            if (!validationResult.success) {
                return validationResult;
            }

            switch (args.action) {
                case 'create':
                    return await this.createPlan(args);
                
                case 'update_task':
                    return await this.updateTask(args);
                
                case 'update_status':
                    return await this.updateStatus(args);
                
                case 'get':
                    return await this.getPlan(args);
                
                case 'get_by_issue':
                    return await this.getPlansByIssue(args);
                
                case 'generate_markdown':
                    return await this.generateMarkdown(args);
                
                case 'delete':
                    return await this.deletePlan(args);
                
                default:
                    return {
                        success: false,
                        error: `Unknown action: ${args.action}. Supported actions: create, update_task, update_status, get, get_by_issue, generate_markdown, delete`
                    };
            }
        } catch (error) {
            this.logger.error('PlanningTool', `Tool error: ${error}`);
            return {
                success: false,
                error: `Planning tool error: ${error}`
            };
        }
    }

    private validateParameters(args: PlanningToolParameters): ToolResult {
        if (!args.action) {
            return {
                success: false,
                error: 'Action parameter is required'
            };
        }

        switch (args.action) {
            case 'create':
                if (!args.title) {
                    return {
                        success: false,
                        error: 'Title is required for create action'
                    };
                }
                if (!args.sections || args.sections.length === 0) {
                    return {
                        success: false,
                        error: 'At least one section is required for create action'
                    };
                }
                break;

            case 'update_task':
                if (!args.planId || !args.taskId) {
                    return {
                        success: false,
                        error: 'planId and taskId are required for update_task action'
                    };
                }
                if (args.completed === undefined) {
                    return {
                        success: false,
                        error: 'completed status is required for update_task action'
                    };
                }
                break;

            case 'update_status':
                if (!args.planId || !args.status) {
                    return {
                        success: false,
                        error: 'planId and status are required for update_status action'
                    };
                }
                break;

            case 'get':
            case 'generate_markdown':
            case 'delete':
                if (!args.planId) {
                    return {
                        success: false,
                        error: `planId is required for ${args.action} action`
                    };
                }
                break;

            case 'get_by_issue':
                if (!args.issueNumber) {
                    return {
                        success: false,
                        error: 'issueNumber is required for get_by_issue action'
                    };
                }
                break;
        }

        return { success: true };
    }

    private async createPlan(args: PlanningToolParameters): Promise<ToolResult> {
        const request: PlanCreateRequest = {
            title: args.title!,
            sections: args.sections!,
            issueNumber: args.issueNumber,
            repository: args.repository
        };

        const plan = await this.planService.createPlan(request);
        
        this.logger.info('PlanningTool', `Created plan ${plan.id} with ${plan.sections.length} sections`);
        
        return {
            success: true,
            data: {
                plan,
                markdown: this.planService.generateMarkdown(plan),
                stats: this.planService.getCompletionStats(plan)
            }
        };
    }

    private async updateTask(args: PlanningToolParameters): Promise<ToolResult> {
        const request: PlanUpdateRequest = {
            planId: args.planId!,
            taskId: args.taskId!,
            completed: args.completed!,
            details: args.details
        };

        const plan = await this.planService.updateTaskStatus(request);
        
        if (!plan) {
            return {
                success: false,
                error: `Plan ${args.planId} or task ${args.taskId} not found`
            };
        }

        this.logger.info('PlanningTool', `Updated task ${args.taskId} in plan ${args.planId}`);
        
        return {
            success: true,
            data: {
                plan,
                markdown: this.planService.generateMarkdown(plan),
                stats: this.planService.getCompletionStats(plan)
            }
        };
    }

    private async updateStatus(args: PlanningToolParameters): Promise<ToolResult> {
        const request: PlanStatusRequest = {
            planId: args.planId!,
            status: args.status!
        };

        const plan = await this.planService.updatePlanStatus(request);
        
        if (!plan) {
            return {
                success: false,
                error: `Plan ${args.planId} not found`
            };
        }

        this.logger.info('PlanningTool', `Updated plan ${args.planId} status to ${args.status}`);
        
        return {
            success: true,
            data: {
                plan,
                markdown: this.planService.generateMarkdown(plan),
                stats: this.planService.getCompletionStats(plan)
            }
        };
    }

    private async getPlan(args: PlanningToolParameters): Promise<ToolResult> {
        const plan = await this.planService.getPlan(args.planId!);
        
        if (!plan) {
            return {
                success: false,
                error: `Plan ${args.planId} not found`
            };
        }

        return {
            success: true,
            data: {
                plan,
                markdown: this.planService.generateMarkdown(plan),
                stats: this.planService.getCompletionStats(plan)
            }
        };
    }

    private async getPlansByIssue(args: PlanningToolParameters): Promise<ToolResult> {
        const plans = await this.planService.getPlansByIssue(args.issueNumber!, args.repository);
        
        return {
            success: true,
            data: {
                plans,
                count: plans.length,
                markdowns: plans.map(plan => this.planService.generateMarkdown(plan))
            }
        };
    }

    private async generateMarkdown(args: PlanningToolParameters): Promise<ToolResult> {
        const plan = await this.planService.getPlan(args.planId!);
        
        if (!plan) {
            return {
                success: false,
                error: `Plan ${args.planId} not found`
            };
        }

        const markdown = this.planService.generateMarkdown(plan);
        
        return {
            success: true,
            data: {
                markdown,
                stats: this.planService.getCompletionStats(plan)
            }
        };
    }

    private async deletePlan(args: PlanningToolParameters): Promise<ToolResult> {
        const deleted = await this.planService.deletePlan(args.planId!);
        
        if (!deleted) {
            return {
                success: false,
                error: `Plan ${args.planId} not found or could not be deleted`
            };
        }

        this.logger.info('PlanningTool', `Deleted plan ${args.planId}`);
        
        return {
            success: true,
            data: {
                message: `Plan ${args.planId} deleted successfully`
            }
        };
    }
}