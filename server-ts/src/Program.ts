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
import { CopyFileToDirectoryTool } from './tools/implementations/categories/files/CopyFileToDirectoryTool';
import { RenameFileWithPatternTool } from './tools/implementations/categories/files/RenameFileWithPatternTool';
import { DeleteFilesByExtensionTool } from './tools/implementations/categories/files/DeleteFilesByExtensionTool';
import { CreateDirectoryStructureTool } from './tools/implementations/categories/files/CreateDirectoryStructureTool';
import { SearchTextInFilesTool } from './tools/implementations/categories/files/SearchTextInFilesTool';
import { 
    SendPostRequestTool, 
    TestGetEndpointTool, 
    UploadFileTool, 
    DownloadFileTool, 
    SendWebhookTool 
} from './tools/implementations/categories/http/HttpApiTool';

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
toolRegistry.register(new CopyFileToDirectoryTool());
toolRegistry.register(new RenameFileWithPatternTool());
toolRegistry.register(new DeleteFilesByExtensionTool());
toolRegistry.register(new CreateDirectoryStructureTool());
toolRegistry.register(new SearchTextInFilesTool());
toolRegistry.register(new SendPostRequestTool());
toolRegistry.register(new TestGetEndpointTool());
toolRegistry.register(new UploadFileTool());
toolRegistry.register(new DownloadFileTool());
toolRegistry.register(new SendWebhookTool());

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