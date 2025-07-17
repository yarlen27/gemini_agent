import { ITool, ToolContext } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
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
export declare class PlanningTool implements ITool {
    readonly name = "planning";
    private planService;
    private logger;
    constructor();
    execute(args: PlanningToolParameters, context?: ToolContext): Promise<ToolResult>;
    private validateParameters;
    private createPlan;
    private updateTask;
    private updateStatus;
    private getPlan;
    private getPlansByIssue;
    private generateMarkdown;
    private deletePlan;
}
//# sourceMappingURL=PlanningTool.d.ts.map