import { GoogleGenerativeAI } from '@google/generative-ai';
import { ToolRegistry } from '../tools/ToolRegistry';
import { GeminiResponse } from '../models/GeminiResponse';

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private toolRegistry: ToolRegistry;

    constructor(apiKey: string, toolRegistry: ToolRegistry) {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is required');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.toolRegistry = toolRegistry;
        
        // Configure the model
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.1,
            },
        });
    }

    public async generateResponse(history: any[]): Promise<GeminiResponse> {
        try {
            // Add system prompt with available tools
            const systemPrompt = this.buildSystemPrompt();
            const fullHistory = [
                {
                    role: 'user',
                    parts: [{ text: systemPrompt }]
                },
                ...history
            ];

            const result = await this.model.generateContent({
                contents: fullHistory,
            });

            const response = result.response;
            const text = response.text();

            // Parse JSON response
            try {
                const parsedResponse = JSON.parse(text);
                return {
                    conversation_id: '', // Will be set by controller
                    action: parsedResponse.action || 'finish',
                    message: parsedResponse.message,
                    command: parsedResponse.command,
                    file_path: parsedResponse.file_path,
                    content: parsedResponse.content
                };
            } catch (parseError) {
                return {
                    conversation_id: '',
                    action: 'finish',
                    message: `Invalid JSON response from Gemini: ${text}`
                };
            }
        } catch (error: any) {
            return {
                conversation_id: '',
                action: 'finish',
                message: `Error: ${error.message}`
            };
        }
    }

    private buildSystemPrompt(): string {
        const availableTools = this.toolRegistry.getAvailableTools();
        
        return `You are an AI software engineering agent helping with GitHub issues.

Available tools:
${availableTools.map(tool => `- ${tool}`).join('\n')}

You must respond with valid JSON in one of these formats:

For shell commands:
{"action": "run_shell_command", "command": "your_command_here"}

For reading files:
{"action": "read_file", "file_path": "path/to/file"}

For writing files:
{"action": "write_file", "file_path": "path/to/file", "content": "file_content"}

For task completion:
{"action": "finish", "message": "Summary of what was accomplished"}

Always analyze the issue carefully and use the appropriate tools to complete the task.
When you're done, use the 'finish' action with a summary of what you accomplished.`;
    }
}