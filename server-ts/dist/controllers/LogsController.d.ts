import { Request, Response } from 'express';
export declare class LogsController {
    private logger;
    constructor();
    getConversationLogs(req: Request, res: Response): Promise<void>;
    getDebugLogs(req: Request, res: Response): Promise<void>;
    simulateRequest(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=LogsController.d.ts.map