import { Request, Response } from 'express';
import { Logger } from '../utils/Logger';

export class LogsController {
    private logger: Logger;

    constructor() {
        this.logger = Logger.getInstance();
    }

    public async getConversationLogs(req: Request, res: Response): Promise<void> {
        try {
            const { conversationId } = req.params;
            
            if (!conversationId) {
                res.status(400).json({
                    success: false,
                    error: 'conversationId is required'
                });
                return;
            }

            const logs = await this.logger.getConversationLogs(conversationId);
            
            res.status(200).json({
                success: true,
                conversationId,
                logs
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    public async getDebugLogs(req: Request, res: Response): Promise<void> {
        try {
            const limit = parseInt(req.query.limit as string) || 100;
            const logs = await this.logger.getDebugLogs(limit);
            
            res.status(200).json({
                success: true,
                limit,
                logs
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    public async simulateRequest(req: Request, res: Response): Promise<void> {
        try {
            const { 
                issue_number = "999", 
                issue_title = "Test Issue", 
                issue_body = "This is a test issue for debugging",
                repo = "yarlen27/gemini_agent"
            } = req.body;

            await this.logger.info(
                'LogsController',
                'Simulated request received',
                { issue_number, issue_title, issue_body, repo },
                'simulated-' + Date.now(),
                issue_number
            );

            res.status(200).json({
                success: true,
                message: 'Simulated request logged successfully',
                debug_info: {
                    issue_number,
                    issue_title,
                    issue_body,
                    repo
                }
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}