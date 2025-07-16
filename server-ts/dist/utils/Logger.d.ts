export interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    component: string;
    message: string;
    data?: any;
    conversationId?: string;
    issueNumber?: string;
}
export declare class Logger {
    private static instance;
    private logDir;
    private constructor();
    static getInstance(): Logger;
    private ensureLogDirectory;
    private writeLog;
    info(component: string, message: string, data?: any, conversationId?: string, issueNumber?: string): Promise<void>;
    warn(component: string, message: string, data?: any, conversationId?: string, issueNumber?: string): Promise<void>;
    error(component: string, message: string, data?: any, conversationId?: string, issueNumber?: string): Promise<void>;
    debug(component: string, message: string, data?: any, conversationId?: string, issueNumber?: string): Promise<void>;
    logGeminiConversation(conversationId: string, issueNumber: string, step: string, direction: 'request' | 'response', data: any): Promise<void>;
    getConversationLogs(conversationId: string): Promise<LogEntry[]>;
    getDebugLogs(limit?: number): Promise<LogEntry[]>;
}
//# sourceMappingURL=Logger.d.ts.map