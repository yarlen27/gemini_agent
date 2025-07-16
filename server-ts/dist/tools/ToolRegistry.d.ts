import { ITool, ToolContext } from './interfaces/ITool';
import { ToolResult } from '../models/ToolResult';
export declare class ToolRegistry {
    private tools;
    register(tool: ITool): void;
    execute(toolName: string, args: any, context?: ToolContext): Promise<ToolResult>;
    getAvailableTools(): string[];
    hasTool(toolName: string): boolean;
}
//# sourceMappingURL=ToolRegistry.d.ts.map