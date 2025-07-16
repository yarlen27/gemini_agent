export interface GeminiResponse {
    conversation_id: string;
    action: string;
    message?: string;
    command?: string;
    file_path?: string;
    content?: string;
}