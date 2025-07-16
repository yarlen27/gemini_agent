# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Gemini Agent for GitHub Automation** - an AI-powered agent that automates software development tasks triggered by GitHub issues. It uses Google Gemini AI to interpret tasks from GitHub issues and automatically creates pull requests with proposed changes.

## Architecture

### Current (Python - Being Migrated)
- **API Server**: FastAPI application (`server/app/main.py`) that orchestrates all agent operations
- **State Management**: Redis for conversation history persistence
- **AI Integration**: Google Gemini (gemini-2.5-flash) with function calling capabilities
- **GitHub Integration**: Custom client script (`/.github/scripts/client.py`) that communicates with the API

### New (TypeScript - In Development)
- **API Server**: Express.js application (`server-ts/src/`) with clean .NET-style architecture
- **Tools System**: Plugin-based architecture with ITool interface, zero if-else statements
- **State Management**: Redis for conversation history persistence
- **AI Integration**: Google Gemini with function calling capabilities
- **GitHub Integration**: Webhook-based system (eliminates GitHub Actions overhead)

## Development Commands

### Local Development
```bash
# Start all services (API + Redis)
cd server && docker compose up --build -d

# View logs
cd server && docker compose logs -f

# Stop services
cd server && docker compose down

# Run tests
cd server && npm test

# Build TypeScript
cd server && npm run build
```

### Manual Production Deployment Steps
1. **Push changes**
   ```bash
   git add .
   git commit -m "Deploy: update for production"
   git push origin main
   ```

2. **Connect to production server**
   ```bash
   ssh root@178.128.133.94
   ```

3. **Navigate to project directory** (create if first time)
   ```bash
   cd /opt/gemini_agent_new
   # First time only: git clone https://github.com/yarlen27/gemini_agent.git .
   ```

4. **Edit docker-compose.production.yml** (replace environment variables)
   ```bash
   cd server
   # Change ${GEMINI_API_KEY} to: GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
   # Change ${GITHUB_TOKEN} to: GITHUB_TOKEN=<YOUR_GITHUB_TOKEN>
   ```

5. **Stop existing containers**
   ```bash
   docker compose -f docker-compose.production.yml down
   ```

6. **Pull latest changes**
   ```bash
   git pull origin main
   ```

7. **Build and deploy**
   ```bash
   docker compose -f docker-compose.production.yml up --build -d
   ```

8. **Verify deployment**
   ```bash
   docker compose -f docker-compose.production.yml ps
   curl -s https://gemini.27cobalto.com/health
   ```

## Key Components

### API Endpoints
- `POST /v1/github/execute` - Main endpoint for executing agent tasks (see `server/app/api/openapi.yml` for schema)

### Services
- **GeminiService** (`server/app/services/gemini_service.py`): Handles AI interactions with function calling for file operations
- **RedisService** (`server/app/services/redis_service.py`): Manages conversation state persistence

### GitHub Workflows
- `.github/workflows/gemini.yml` - Triggers on issues containing "@gemini"
- `.github/scripts/client.py` - Client that sends requests to the API server

## Development Guidelines

### Git Workflow
1. Create feature branches: `feat/issue-XX-description`
2. Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
3. Create PRs to main branch

### Code Standards
- All Python functions must have type hints
- Use Pydantic models for data validation (`server/app/core/models.py`)
- Environment variables loaded via pydantic-settings (`server/app/core/config.py`)

### Function Calling Tools

#### Current Python Implementation
The Gemini service implements these tools:
- `write_file`: Create or update files
- `read_file`: Read file contents
- `run_shell_command`: Execute shell commands
- `finish`: Complete the task with a summary

#### New TypeScript Implementation (TDD Approach)
**Status: 23/23 tests passing** ✅
- **ShellTool**: Execute shell commands with proper error handling
- **ReadFileTool**: Read file contents with validation and error handling
- **WriteFileTool**: Create/update files with directory auto-creation
- **ToolRegistry**: Plugin system eliminates if-else statements

### Environment Variables
Required in `docker-compose.yml`:
- `GEMINI_API_KEY`: Google AI API key
- `GITHUB_TOKEN`: For GitHub API operations
- `REDIS_HOST`, `REDIS_PORT`: Redis connection settings

## Testing Locally

1. Set up environment variables in `docker-compose.yml`
2. Start services: `docker-compose up --build`
3. Test the API: `curl -X POST http://localhost:8001/v1/github/execute -H "Content-Type: application/json" -d '{"prompt": "test", "repo": "owner/repo", "ref": "main"}'`

## Important Notes

- The API server runs on port 8001 (not 8000)
- Redis runs on port 6380 (not default 6379)
- Conversation history is stored with key pattern: `conversation:{repo}:{issue_number}`
- The agent can resume failed jobs from the last successful step
- All file paths in function calls should be relative to the repository root

## Production Server Info

### 🚀 Ready for Deployment
- **Target domain**: gemini.27cobalto.com
- **Production server**: `root@178.128.133.94`
- **SSL**: Automatic via Let's Encrypt
- **Deployment**: Follow Manual Production Deployment Steps above
- **Services**: API + Redis + Nginx proxy + SSL companion

### 🔧 Production Server Access
- **SSH Connection**: `ssh root@178.128.133.94`
- **Claude Code SSH Support**: ✅ YES - SSH connections are supported
- **Deployment directory**: `/opt/gemini_agent_new`
- **Server IP**: `178.128.133.94`
- **Other services running**: Vault (port 8200), OCR services (8000, 8081), PostgreSQL (5432)