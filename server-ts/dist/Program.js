"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
const GeminiService_1 = require("./services/GeminiService");
const GitHubService_1 = require("./services/GitHubService");
const WebhookController_1 = require("./controllers/WebhookController");
const ToolRegistry_1 = require("./tools/ToolRegistry");
const ShellTool_1 = require("./tools/implementations/ShellTool");
const ReadFileTool_1 = require("./tools/implementations/ReadFileTool");
const WriteFileTool_1 = require("./tools/implementations/WriteFileTool");
// Load environment variables
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize services
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDVkgRk8wG9dU5k9h4AIfFkitAkrYTfFz8';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'dummy-token-for-startup';
// Initialize tool registry
const toolRegistry = new ToolRegistry_1.ToolRegistry();
toolRegistry.register(new ShellTool_1.ShellTool());
toolRegistry.register(new ReadFileTool_1.ReadFileTool());
toolRegistry.register(new WriteFileTool_1.WriteFileTool());
// Initialize services
const geminiService = new GeminiService_1.GeminiService(GEMINI_API_KEY, toolRegistry);
const githubService = new GitHubService_1.GitHubService(GITHUB_TOKEN);
// Initialize controllers
const webhookController = new WebhookController_1.WebhookController(geminiService, githubService, toolRegistry);
// Routes
app.post('/v1/github/webhook', webhookController.handleWebhook.bind(webhookController));
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        tools: toolRegistry.getAvailableTools()
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
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
exports.default = app;
//# sourceMappingURL=Program.js.map