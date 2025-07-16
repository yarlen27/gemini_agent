export interface GeminiRequest {
    conversation_id?: string;
    prompt?: {
        issue_title: string;
        issue_body: string;
        github_context: {
            issue_number: string;
            prompt_body: string;
            repo: string;
            github_token: string;
        };
    };
    tool_response?: {
        tool_name: string;
        success: boolean;
        data?: any;
        error?: string;
        stdout?: string;
        stderr?: string;
        exitCode?: number;
    };
}