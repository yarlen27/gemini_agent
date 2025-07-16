"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsController = void 0;
const Logger_1 = require("../utils/Logger");
class LogsController {
    constructor() {
        this.logger = Logger_1.Logger.getInstance();
    }
    async getConversationLogs(req, res) {
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async getDebugLogs(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const logs = await this.logger.getDebugLogs(limit);
            res.status(200).json({
                success: true,
                limit,
                logs
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    async simulateRequest(req, res) {
        try {
            const { issue_number = "999", issue_title = "Test Issue", issue_body = "This is a test issue for debugging", repo = "yarlen27/gemini_agent" } = req.body;
            await this.logger.info('LogsController', 'Simulated request received', { issue_number, issue_title, issue_body, repo }, 'simulated-' + Date.now(), issue_number);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
exports.LogsController = LogsController;
//# sourceMappingURL=LogsController.js.map