import { promises as fs } from 'fs';
import { join } from 'path';

export interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    component: string;
    message: string;
    data?: any;
    conversationId?: string;
    issueNumber?: string;
}

export class Logger {
    private static instance: Logger;
    private logDir: string;

    private constructor() {
        this.logDir = '/app/logs';
        this.ensureLogDirectory();
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private async ensureLogDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    private async writeLog(entry: LogEntry): Promise<void> {
        const logLine = JSON.stringify(entry) + '\n';
        
        // Write to console
        console.log(`[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.component}] ${entry.message}`);
        if (entry.data) {
            console.log('Data:', JSON.stringify(entry.data, null, 2));
        }

        // Write to file
        try {
            const logFile = join(this.logDir, `gemini-${new Date().toISOString().split('T')[0]}.log`);
            await fs.appendFile(logFile, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    public async info(component: string, message: string, data?: any, conversationId?: string, issueNumber?: string): Promise<void> {
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

    public async warn(component: string, message: string, data?: any, conversationId?: string, issueNumber?: string): Promise<void> {
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

    public async error(component: string, message: string, data?: any, conversationId?: string, issueNumber?: string): Promise<void> {
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

    public async debug(component: string, message: string, data?: any, conversationId?: string, issueNumber?: string): Promise<void> {
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
    public async logGeminiConversation(
        conversationId: string,
        issueNumber: string,
        step: string,
        direction: 'request' | 'response',
        data: any
    ): Promise<void> {
        await this.info(
            'GeminiConversation',
            `${step} - ${direction}`,
            data,
            conversationId,
            issueNumber
        );
    }

    // Method to get logs for a specific conversation
    public async getConversationLogs(conversationId: string): Promise<LogEntry[]> {
        try {
            const today = new Date().toISOString().split('T')[0];
            const logFile = join(this.logDir, `gemini-${today}.log`);
            const content = await fs.readFile(logFile, 'utf8');
            
            const logs: LogEntry[] = content
                .split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line))
                .filter(entry => entry.conversationId === conversationId);

            return logs;
        } catch (error) {
            console.error('Failed to read conversation logs:', error);
            return [];
        }
    }

    // Method to get logs for debugging
    public async getDebugLogs(limit: number = 100): Promise<LogEntry[]> {
        try {
            const today = new Date().toISOString().split('T')[0];
            const logFile = join(this.logDir, `gemini-${today}.log`);
            const content = await fs.readFile(logFile, 'utf8');
            
            const logs: LogEntry[] = content
                .split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line))
                .slice(-limit);

            return logs;
        } catch (error) {
            console.error('Failed to read debug logs:', error);
            return [];
        }
    }
}