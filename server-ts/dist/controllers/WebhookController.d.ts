import { Request, Response } from 'express';
import { GeminiService } from '../services/GeminiService';
import { GitHubService } from '../services/GitHubService';
import { ToolRegistry } from '../tools/ToolRegistry';
export declare class WebhookController {
    private geminiService;
    private githubService;
    private toolRegistry;
    private logger;
    private planService;
    constructor(geminiService: GeminiService, githubService: GitHubService, toolRegistry: ToolRegistry);
    handleWebhook(req: Request, res: Response): Promise<void>;
    private isComplexTask;
    private createInitialPlan;
    private updatePlanProgress;
    private doesActionMatchTask;
}
//# sourceMappingURL=WebhookController.d.ts.map