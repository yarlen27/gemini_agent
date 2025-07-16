import { ToolResult } from '../../models/ToolResult';

export interface ToolContext {
    workingDirectory?: string;
}

export interface ITool {
    readonly name: string;
    execute(args: any, context?: ToolContext): Promise<ToolResult>;
}