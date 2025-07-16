import { ToolRegistry } from '../tools/ToolRegistry';
import { GeminiResponse } from '../models/GeminiResponse';
export declare class GeminiService {
    private genAI;
    private model;
    private toolRegistry;
    constructor(apiKey: string, toolRegistry: ToolRegistry);
    generateResponse(history: any[]): Promise<GeminiResponse>;
    private buildSystemPrompt;
}
//# sourceMappingURL=GeminiService.d.ts.map