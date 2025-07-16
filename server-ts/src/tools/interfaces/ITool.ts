import { ToolResult } from '../../models/ToolResult';

export interface ITool {
    readonly name: string;
    execute(args: any): Promise<ToolResult>;
}