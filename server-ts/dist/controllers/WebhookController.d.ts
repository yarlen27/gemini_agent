import { Request, Response } from 'express';
import { GeminiService } from '../services/GeminiService';
import { GitHubService } from '../services/GitHubService';
import { ToolRegistry } from '../tools/ToolRegistry';
export declare class WebhookController {
    private geminiService;
    private githubService;
    private toolRegistry;
    private logger;
    constructor(geminiService: GeminiService, githubService: GitHubService, toolRegistry: ToolRegistry);
    handleWebhook(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=WebhookController.d.ts.map