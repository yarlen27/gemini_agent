import { GeminiService } from '../../src/services/GeminiService';
import { ToolRegistry } from '../../src/tools/ToolRegistry';
import { ShellTool } from '../../src/tools/implementations/ShellTool';

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockResolvedValue({
                response: {
                    text: jest.fn().mockReturnValue('{"action": "finish", "message": "Task completed"}')
                }
            })
        })
    }))
}));

describe('GeminiService', () => {
    let geminiService: GeminiService;
    let toolRegistry: ToolRegistry;

    beforeEach(() => {
        toolRegistry = new ToolRegistry();
        toolRegistry.register(new ShellTool());
        geminiService = new GeminiService('test-api-key', toolRegistry);
    });

    test('should initialize with API key', () => {
        expect(geminiService).toBeDefined();
    });

    test('should throw error without API key', () => {
        expect(() => new GeminiService('', toolRegistry)).toThrow('GEMINI_API_KEY is required');
    });

    test('should generate response from history', async () => {
        const history = [
            {
                role: 'user',
                parts: [{ text: 'Hello, please help me with a task' }]
            }
        ];

        const response = await geminiService.generateResponse(history);
        
        expect(response).toBeDefined();
        expect(response.action).toBe('finish');
        expect(response.message).toBe('Task completed');
    });

    test('should handle tool execution', async () => {
        const mockGenerateContent = jest.fn().mockResolvedValue({
            response: {
                text: jest.fn().mockReturnValue('{"action": "run_shell_command", "command": "echo test"}')
            }
        });

        // Mock the model to return tool execution
        (geminiService as any).model.generateContent = mockGenerateContent;

        const history = [
            {
                role: 'user',
                parts: [{ text: 'Run echo test command' }]
            }
        ];

        const response = await geminiService.generateResponse(history);
        
        expect(response.action).toBe('run_shell_command');
        expect(response.command).toBe('echo test');
    });

    test('should handle invalid JSON response', async () => {
        const mockGenerateContent = jest.fn().mockResolvedValue({
            response: {
                text: jest.fn().mockReturnValue('invalid json response')
            }
        });

        (geminiService as any).model.generateContent = mockGenerateContent;

        const history = [
            {
                role: 'user',
                parts: [{ text: 'Test request' }]
            }
        ];

        const response = await geminiService.generateResponse(history);
        
        expect(response.action).toBe('finish');
        expect(response.message).toContain('Invalid JSON response');
    });

    test('should handle API errors', async () => {
        const mockGenerateContent = jest.fn().mockRejectedValue(new Error('API Error'));
        (geminiService as any).model.generateContent = mockGenerateContent;

        const history = [
            {
                role: 'user',
                parts: [{ text: 'Test request' }]
            }
        ];

        const response = await geminiService.generateResponse(history);
        
        expect(response.action).toBe('finish');
        expect(response.message).toContain('Error: API Error');
    });
});