# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Gemini Agent for GitHub Automation** - an AI-powered agent that automates software development tasks triggered by GitHub issues. It uses Google Gemini AI to interpret tasks from GitHub issues and automatically creates pull requests with proposed changes.

## Architecture

### Current (TypeScript - PRODUCTION)
- **API Server**: Express.js application (`server-ts/src/`) with clean .NET-style architecture
- **Tools System**: Plugin-based architecture with ITool interface, zero if-else statements
- **State Management**: Redis for conversation history persistence
- **AI Integration**: Google Gemini with function calling capabilities
- **GitHub Integration**: Webhook-based system (eliminates GitHub Actions overhead)
- **Production URL**: https://gemini.27cobalto.com
- **Health Check**: https://gemini.27cobalto.com/health

### Legacy (Python - DEPRECATED)
- **API Server**: FastAPI application (`server/app/main.py`) - NO LONGER USED
- **State Management**: Redis for conversation history persistence
- **AI Integration**: Google Gemini (gemini-2.5-flash) with function calling capabilities
- **GitHub Integration**: Custom client script (`/.github/scripts/client.py`) that communicates with the API

## Development Commands

### Local Development
```bash
# Start all services (API + Redis) - TypeScript version
cd server-ts && docker compose up --build -d

# View logs
cd server-ts && docker compose logs -f

# Stop services
cd server-ts && docker compose down

# Run tests
cd server-ts && npm test

# Build TypeScript
cd server-ts && npm run build
```

### Automated Production Deployment (Recommended)
```bash
# One-command deployment using GitHub Secrets
./deploy_with_secrets.sh
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

4. **Get secrets and replace variables**
   ```bash
   cd server-ts  # IMPORTANT: Use server-ts directory, not server
   GEMINI_KEY=$(gh secret get GEMINI_API_KEY)
   GITHUB_KEY=$(gh secret get PROD_GITHUB_TOKEN)
   sed -i "s/\${GEMINI_API_KEY}/GEMINI_API_KEY=$GEMINI_KEY/g" docker-compose.production.yml
   sed -i "s/\${GITHUB_TOKEN}/GITHUB_TOKEN=$GITHUB_KEY/g" docker-compose.production.yml
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
- `GET /health` - Health check endpoint (returns status, timestamp, and available tools)
- `POST /v1/github/execute` - Main endpoint for executing agent tasks (see `server/app/api/openapi.yml` for schema)

### Services (TypeScript)
- **GeminiService** (`server-ts/src/services/GeminiService.ts`): Handles AI interactions with function calling for file operations
- **GitHubService** (`server-ts/src/services/GitHubService.ts`): Manages GitHub API interactions
- **WebhookController** (`server-ts/src/controllers/WebhookController.ts`): Handles GitHub webhook events

### Services (Python - Legacy)
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
- Redis runs on port 6379 (default)
- Conversation history is stored with key pattern: `conversation:{repo}:{issue_number}`
- The agent can resume failed jobs from the last successful step
- All file paths in function calls should be relative to the repository root
- **IMPORTANT**: Production deployment uses `server-ts/` directory, not `server/`

## Production Server Info

### 🚀 PRODUCTION DEPLOYED ✅
- **Target domain**: gemini.27cobalto.com
- **Production server**: `root@178.128.133.94`
- **SSL**: ✅ Namecheap certificate installed (manual, not Let's Encrypt)
- **Status**: ✅ ACTIVE - TypeScript server deployed
- **Health check**: ✅ https://gemini.27cobalto.com/health
- **Services**: API + Redis + Nginx proxy + SSL companion

### 🔧 Production Server Access
- **SSH Connection**: `ssh root@178.128.133.94`
- **Claude Code SSH Support**: ✅ YES - SSH connections are supported
- **Deployment directory**: `/opt/gemini_agent_new`
- **Server IP**: `178.128.133.94`
- **Other services running**: Vault (port 8200), OCR services (8000, 8081), PostgreSQL (5432)

### 🔐 GitHub Secrets Configuration
- **GEMINI_API_KEY**: Google Gemini API key (configured via `gh secret set`)
- **PROD_GITHUB_TOKEN**: GitHub personal access token (configured via `gh secret set`)
- **Access secrets**: `gh secret get SECRET_NAME`
- **List secrets**: `gh secret list`

### 📋 Deployment Scripts
- **deploy_with_secrets.sh**: Automated deployment using GitHub Secrets
- **Requirements**: `gh` CLI tool authenticated on local machine

## Lecciones Aprendidas (2025-07-16)

### 🚨 Problemas Críticos Encontrados y Soluciones

#### 1. **Directorio Incorrecto de Deployment**
- **Problema**: Se estaba deployando desde `server/` (Python) en lugar de `server-ts/` (TypeScript)
- **Síntoma**: Endpoint `/health` devolvía 404 Not Found
- **Solución**: Cambiar deployment a usar `server-ts/docker-compose.production.yml`
- **Lección**: Siempre verificar que el directorio de deployment coincida con la tecnología actual

#### 2. **Certificados SSL con Formato Incorrecto**
- **Problema**: nginx no podía cargar certificados SSL (error: PEM routines::bad end line)
- **Síntoma**: `nginx -t` fallaba con error SSL
- **Solución**: Regenerar fullchain.pem con nueva línea entre certificados: `(cat cert.crt; echo; cat ca-bundle) > fullchain.pem`
- **Lección**: Los certificados SSL deben tener formato correcto con líneas vacías entre certificados

#### 3. **nginx.conf Montado como Directorio**
- **Problema**: nginx.conf se creó como directorio vacío en lugar de archivo
- **Síntoma**: api-proxy container fallaba al iniciar
- **Solución**: Usar la ruta correcta `../server-ts/nginx.conf` en docker-compose
- **Lección**: Verificar que los archivos de configuración existan y sean archivos, no directorios

#### 4. **Clave Privada SSL Perdida**
- **Problema**: La clave privada del certificado SSL no estaba en el repositorio
- **Síntoma**: No se podía completar la instalación SSL
- **Solución**: Recuperar la clave privada del CSR original en `/tmp/gemini.27cobalto.com.key`
- **Lección**: Guardar claves privadas en ubicación segura durante el proceso de certificación

#### 5. **Let's Encrypt Rate Limit**
- **Problema**: "too many certificates (5) already issued for this exact set"
- **Síntoma**: acme-companion no podía generar nuevos certificados
- **Solución**: Usar certificado comercial de Namecheap
- **Lección**: Tener plan B para SSL cuando Let's Encrypt falla

### 🎯 Mejores Prácticas Establecidas

#### SSL Certificate Management
1. **Usar certificado comercial** para producción (Namecheap)
2. **Guardar claves privadas** en ubicación segura
3. **Verificar formato** de certificados antes de instalación
4. **Probar nginx -t** antes de aplicar cambios

#### Deployment Process
1. **Verificar directorio correcto** (`server-ts/` no `server/`)
2. **Probar endpoints** después de deployment
3. **Verificar SSL** con curl externo
4. **Documentar cambios** en CLAUDE.md

#### Troubleshooting
1. **Verificar logs** de todos los contenedores
2. **Probar nginx -t** para validar configuración
3. **Usar curl interno** para aislar problemas de red
4. **Verificar volúmenes** de Docker para certificados

### 🔄 Status Actual (2025-07-16)
- ✅ **SSL funcionando** con certificado Namecheap
- ✅ **TypeScript server** deployado en producción
- ✅ **Health endpoint** funcionando: https://gemini.27cobalto.com/health
- ✅ **Todos los servicios** funcionando correctamente
- ✅ **Documentación** actualizada en CLAUDE.md