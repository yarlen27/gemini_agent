"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class Logger {
    constructor() {
        this.logDir = '/app/logs';
        this.ensureLogDirectory();
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    async ensureLogDirectory() {
        try {
            await fs_1.promises.mkdir(this.logDir, { recursive: true });
        }
        catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }
    async writeLog(entry) {
        const logLine = JSON.stringify(entry) + '\n';
        // Write to console
        console.log(`[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.component}] ${entry.message}`);
        if (entry.data) {
            console.log('Data:', JSON.stringify(entry.data, null, 2));
        }
        // Write to file
        try {
            const logFile = (0, path_1.join)(this.logDir, `gemini-${new Date().toISOString().split('T')[0]}.log`);
            await fs_1.promises.appendFile(logFile, logLine);
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    async info(component, message, data, conversationId, issueNumber) {
        await this.writeLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            component,
            message,
            data,
            conversationId,
            issueNumber
        });
    }
    async warn(component, message, data, conversationId, issueNumber) {
        await this.writeLog({
            timestamp: new Date().toISOString(),
            level: 'warn',
            component,
            message,
            data,
            conversationId,
            issueNumber
        });
    }
    async error(component, message, data, conversationId, issueNumber) {
        await this.writeLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            component,
            message,
            data,
            conversationId,
            issueNumber
        });
    }
    async debug(component, message, data, conversationId, issueNumber) {
        await this.writeLog({
            timestamp: new Date().toISOString(),
            level: 'debug',
            component,
            message,
            data,
            conversationId,
            issueNumber
        });
    }
    // Specific method for Gemini conversations
    async logGeminiConversation(conversationId, issueNumber, step, direction, data) {
        await this.info('GeminiConversation', `${step} - ${direction}`, data, conversationId, issueNumber);
    }
    // Method to get logs for a specific conversation
    async getConversationLogs(conversationId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const logFile = (0, path_1.join)(this.logDir, `gemini-${today}.log`);
            const content = await fs_1.promises.readFile(logFile, 'utf8');
            const logs = content
                .split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line))
                .filter(entry => entry.conversationId === conversationId);
            return logs;
        }
        catch (error) {
            console.error('Failed to read conversation logs:', error);
            return [];
        }
    }
    // Method to get logs for debugging
    async getDebugLogs(limit = 100) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const logFile = (0, path_1.join)(this.logDir, `gemini-${today}.log`);
            const content = await fs_1.promises.readFile(logFile, 'utf8');
            const logs = content
                .split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line))
                .slice(-limit);
            return logs;
        }
        catch (error) {
            console.error('Failed to read debug logs:', error);
            return [];
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map