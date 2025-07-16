export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
}