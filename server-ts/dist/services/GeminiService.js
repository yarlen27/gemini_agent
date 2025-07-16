"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const Logger_1 = require("../utils/Logger");
class GeminiService {
    constructor(apiKey, toolRegistry) {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is required');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.toolRegistry = toolRegistry;
        this.logger = Logger_1.Logger.getInstance();
        // Configure the model
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.1,
            },
        });
    }
    async generateResponse(history, conversationId, issueNumber) {
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
            // Log the request to Gemini
            await this.logger.logGeminiConversation(conversationId || 'unknown', issueNumber || 'unknown', 'generateResponse', 'request', {
                historyLength: history.length,
                systemPrompt: systemPrompt.substring(0, 200) + '...',
                fullHistory: fullHistory.map(h => ({
                    role: h.role,
                    partsCount: h.parts.length,
                    textPreview: h.parts[0]?.text?.substring(0, 100) + '...'
                }))
            });
            const result = await this.model.generateContent({
                contents: fullHistory,
            });
            const response = result.response;
            const text = response.text();
            // Log the raw response from Gemini
            await this.logger.logGeminiConversation(conversationId || 'unknown', issueNumber || 'unknown', 'generateResponse', 'response', {
                rawResponse: text,
                responseLength: text.length
            });
            // Parse JSON response
            try {
                const parsedResponse = JSON.parse(text);
                // Log the parsed response
                await this.logger.logGeminiConversation(conversationId || 'unknown', issueNumber || 'unknown', 'generateResponse', 'response', {
                    parsedResponse: parsedResponse,
                    action: parsedResponse.action,
                    hasMessage: !!parsedResponse.message
                });
                return {
                    conversation_id: '', // Will be set by controller
                    action: parsedResponse.action || 'finish',
                    message: parsedResponse.message,
                    command: parsedResponse.command,
                    file_path: parsedResponse.file_path,
                    content: parsedResponse.content
                };
            }
            catch (parseError) {
                return {
                    conversation_id: '',
                    action: 'finish',
                    message: `Invalid JSON response from Gemini: ${text}`
                };
            }
        }
        catch (error) {
            return {
                conversation_id: '',
                action: 'finish',
                message: `Error: ${error.message}`
            };
        }
    }
    buildSystemPrompt() {
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
exports.GeminiService = GeminiService;
//# sourceMappingURL=GeminiService.js.map