# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Gemini Agent for GitHub Automation** - an AI-powered agent that automates software development tasks triggered by GitHub issues. It uses Google Gemini AI to interpret tasks from GitHub issues and automatically creates pull requests with proposed changes.

## Architecture

- **API Server**: FastAPI application (`server/app/main.py`) that orchestrates all agent operations
- **State Management**: Redis for conversation history persistence
- **AI Integration**: Google Gemini (gemini-2.5-flash) with function calling capabilities
- **GitHub Integration**: Custom client script (`/.github/scripts/client.py`) that communicates with the API

## Development Commands

```bash
# Start all services (API + Redis)
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Format Python code
black .

# Run individual service
docker-compose up api  # Just the API
docker-compose up redis # Just Redis
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
The Gemini service implements these tools:
- `write_file`: Create or update files
- `read_file`: Read file contents
- `run_shell_command`: Execute shell commands
- `finish`: Complete the task with a summary

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