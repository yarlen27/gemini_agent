import { ITool, ToolContext } from './interfaces/ITool';
import { ToolResult } from '../models/ToolResult';

export class ToolRegistry {
    private tools = new Map<string, ITool>();

    public register(tool: ITool): void {
        this.tools.set(tool.name, tool);
    }

    public async execute(toolName: string, args: any, context?: ToolContext): Promise<ToolResult> {
        const tool = this.tools.get(toolName);
        
        if (!tool) {
            return {
                success: false,
                error: `Tool '${toolName}' not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`
            };
        }

        return await tool.execute(args, context);
    }

    public getAvailableTools(): string[] {
        return Array.from(this.tools.keys());
    }

    public hasTool(toolName: string): boolean {
        return this.tools.has(toolName);
    }
}