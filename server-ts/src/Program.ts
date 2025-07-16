import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { GeminiService } from './services/GeminiService';
import { GitHubService } from './services/GitHubService';
import { WebhookController } from './controllers/WebhookController';
import { LogsController } from './controllers/LogsController';
import { ToolRegistry } from './tools/ToolRegistry';
import { ShellTool } from './tools/implementations/ShellTool';
import { ReadFileTool } from './tools/implementations/ReadFileTool';
import { WriteFileTool } from './tools/implementations/WriteFileTool';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDVkgRk8wG9dU5k9h4AIfFkitAkrYTfFz8';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'dummy-token-for-startup';

// Initialize tool registry
const toolRegistry = new ToolRegistry();
toolRegistry.register(new ShellTool());
toolRegistry.register(new ReadFileTool());
toolRegistry.register(new WriteFileTool());

// Initialize services
const geminiService = new GeminiService(GEMINI_API_KEY, toolRegistry);
const githubService = new GitHubService(GITHUB_TOKEN);

// Initialize controllers
const webhookController = new WebhookController(geminiService, githubService, toolRegistry);
const logsController = new LogsController();

// Routes
app.post('/v1/github/webhook', webhookController.handleWebhook.bind(webhookController));

// Debug and logging endpoints
app.get('/logs/conversation/:conversationId', logsController.getConversationLogs.bind(logsController));
app.get('/logs/debug', logsController.getDebugLogs.bind(logsController));
app.post('/logs/simulate', logsController.simulateRequest.bind(logsController));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        tools: toolRegistry.getAvailableTools()
    });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Gemini Agent TypeScript Server running on port ${PORT}`);
    console.log(`📊 Available tools: ${toolRegistry.getAvailableTools().join(', ')}`);
    console.log(`🔧 Health check: http://localhost:${PORT}/health`);
});

export default app;