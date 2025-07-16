"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRegistry = void 0;
class ToolRegistry {
    constructor() {
        this.tools = new Map();
    }
    register(tool) {
        this.tools.set(tool.name, tool);
    }
    async execute(toolName, args, context) {
        const tool = this.tools.get(toolName);
        if (!tool) {
            return {
                success: false,
                error: `Tool '${toolName}' not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`
            };
        }
        return await tool.execute(args, context);
    }
    getAvailableTools() {
        return Array.from(this.tools.keys());
    }
    hasTool(toolName) {
        return this.tools.has(toolName);
    }
}
exports.ToolRegistry = ToolRegistry;
//# sourceMappingURL=ToolRegistry.js.map