import { ToolRegistry } from '../tools/ToolRegistry';
import { GeminiResponse } from '../models/GeminiResponse';
export declare class GeminiService {
    private genAI;
    private model;
    private toolRegistry;
    private logger;
    constructor(apiKey: string, toolRegistry: ToolRegistry);
    generateResponse(history: any[], conversationId?: string, issueNumber?: string): Promise<GeminiResponse>;
    private buildSystemPrompt;
}
//# sourceMappingURL=GeminiService.d.ts.map