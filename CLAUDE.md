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


### GitHub Workflows
- `.github/workflows/gemini.yml` - Triggers on issues containing "@gemini"
- `.github/scripts/client.ts` - TypeScript client that sends requests to the API server

## Development Guidelines

### Git Workflow
1. Create feature branches: `feat/issue-XX-description`
2. Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
3. Create PRs to main branch

### Code Standards
- All TypeScript functions must have proper type annotations
- Use interfaces and types for data validation
- Environment variables loaded via dotenv configuration
- Follow clean architecture patterns with dependency injection

### Function Calling Tools

#### TypeScript Implementation (TDD Approach)
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
- **Problema**: Se estaba deployando desde `server/` (legacy) en lugar de `server-ts/` (TypeScript)
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

#### 6. **Tools ejecutando en directorio incorrecto (2025-07-16)**
- **Problema**: WriteFileTool, ReadFileTool y ShellTool ejecutaban en `/app/` en lugar del directorio del repositorio clonado
- **Síntoma**: Archivos se escribían exitosamente pero no aparecían en commits porque estaban en ubicación incorrecta
- **Investigación**: Sistema de logging implementado mostró que tools reportaban éxito pero archivos estaban en `/app/` no en `/app/tmp/gemini-repos/{repo}/{issue}/`
- **Solución**: Modificar ITool interface para aceptar ToolContext con workingDirectory, actualizar todos los tools para usar el contexto
- **Lección**: Los tools necesitan contexto del directorio de trabajo del repositorio clonado para operaciones correctas

### 🔄 Status Actual (2025-07-16)
- ✅ **SSL funcionando** con certificado Namecheap
- ✅ **TypeScript server** deployado en producción
- ✅ **Health endpoint** funcionando: https://gemini.27cobalto.com/health
- ✅ **Sistema de logging** implementado y funcionando para debugging
- ✅ **Working directory fix** implementado y probado exitosamente
- ✅ **Todos los servicios** funcionando correctamente
- ✅ **Issue #103** procesado exitosamente con archivo creado en ubicación correcta
- ✅ **Documentación** actualizada en CLAUDE.md

### 🛠️ Últimas Mejoras Implementadas (2025-07-16)

#### Sistema de Logging Completo
- **Logger.ts**: Singleton pattern con logging estructurado a archivos y consola
- **LogsController**: Endpoints para debugging (`/logs/debug`, `/logs/conversation/:id`, `/logs/simulate`)
- **Logging detallado**: En todo el flujo de WebhookController y GeminiService
- **Almacenamiento**: Logs en `/app/logs/` dentro del contenedor

#### Working Directory Fix 
- **ITool interface**: Modificada para aceptar ToolContext con workingDirectory
- **Tools actualizados**: WriteFileTool, ReadFileTool, ShellTool usan contexto de directorio
- **ToolRegistry**: Pasa contexto a tools
- **WebhookController**: Obtiene directorio del repositorio de GitHubService
- **Resultado**: Archivos ahora se crean en directorio correcto del repositorio clonado

### 🎯 Funcionalidad Verificada
- ✅ **Clonado de repositorio** en `/app/tmp/gemini-repos/{repo}/{issue}/`
- ✅ **Creación de branches** automática
- ✅ **Ejecución de tools** en directorio correcto del repositorio
- ✅ **Escritura de archivos** en ubicación correcta
- ✅ **Commits automáticos** con archivos incluidos
- ✅ **Push de branches** a GitHub
- ✅ **Creación de PR links** automática
- ✅ **Logging completo** para debugging

## 🚀 Plan de Migración a TypeScript - COMPLETADO ✅ (2025-07-16)

### Objetivo
Migrar completamente el proyecto a TypeScript, eliminando todo el código Python legacy para tener una arquitectura unificada.

### Issues Creados
1. **#90** - Migrar cliente a TypeScript
2. **#94** - Agregar tests de integración
3. **#91** - Actualizar GitHub Workflow para usar TypeScript
4. **#92** - Eliminar código legacy
5. **#93** - Actualizar documentación CLAUDE.md
6. ~~**#95**~~ - ~~Crear capa de compatibilidad~~ (CERRADO - No necesario)

### Orden de Implementación (Simplificado)
1. **Fase 1 - Migración Core** (#90, #94)
   - Crear nuevo cliente TypeScript
   - Implementar tests completos

2. **Fase 2 - Activación** (#91)
   - Cambiar GitHub Actions a TypeScript
   - Validar funcionamiento end-to-end

3. **Fase 3 - Limpieza** (#92, #93)
   - Eliminar todo código legacy
   - Actualizar documentación

### Estado de Migración - COMPLETADO ✅
- ✅ **Cliente TypeScript** - Migrado completamente (#90)
- ✅ **Tests de integración** - Tests TDD implementados (23/23 passing) (#94)
- ✅ **GitHub Workflow actualizado** - Usando Node.js y TypeScript (#91)
- ✅ **Código Python eliminado** - Legacy code cleanup completado (#92)
- ✅ **Documentación actualizada** - CLAUDE.md actualizado con estado actual (#93)
- ✅ **Sistema de logging** - Implementado para debugging
- ✅ **Working directory fix** - Tools funcionando en directorio correcto
- ✅ **Producción funcionando** - Issue #103 procesado exitosamente

### 🎯 Siguientes Pasos
1. **Implementar nuevos tools**: Comenzar con Fase 1 del roadmap (Git y GitHub, Manipulación de Archivos)
2. **Monitoreo**: Usar sistema de logging para identificar cualquier problema en producción
3. **Optimizaciones**: Considerar mejoras de performance basadas en logs de uso real

## 🔮 Tools Futuros - Roadmap de Expansión

### 📁 **Manipulación de Archivos**
- `copy_file_to_directory` - Copiar archivos a directorios específicos
- `rename_file_with_pattern` - Renombrar archivos usando patrones
- `delete_files_by_extension` - Eliminar archivos por extensión
- `create_directory_structure` - Crear estructura de directorios
- `search_text_in_files` - Buscar texto específico en archivos
- `replace_text_in_files` - Reemplazar texto en múltiples archivos
- `get_file_size_and_permissions` - Obtener metadata de archivos
- `compress_directory_to_zip` - Comprimir directorios
- `extract_zip_to_directory` - Extraer archivos comprimidos

### 🔀 **Git y GitHub**
- ✅ `create_branch_from_main` - Crear branch desde main (**IMPLEMENTADO** 2025-07-17)
- ✅ `create_pull_request_with_template` - Crear PR con template (**IMPLEMENTADO** 2025-07-17)
- ✅ `add_comment_to_issue` - Agregar comentarios a issues (**IMPLEMENTADO** 2025-07-17)
- ✅ `get_diff_between_branches` - Obtener diferencias entre branches (**IMPLEMENTADO** 2025-07-17)
- ✅ `cherry_pick_commit` - Cherry pick de commits específicos (**IMPLEMENTADO** 2025-07-17)
- `merge_branch_with_squash` - Merge con squash
- `close_issue_with_message` - Cerrar issues con mensaje
- `revert_specific_commit` - Revertir commits específicos
- `tag_current_commit` - Crear tags en commits

### 🐘 **PostgreSQL y SQL**
- `create_table_with_columns` - Crear tablas con columnas específicas
- `insert_sample_data_to_table` - Insertar datos de prueba
- `backup_table_to_file` - Backup de tablas específicas
- `run_select_query_with_limit` - Ejecutar queries con límites
- `create_index_on_column` - Crear índices en columnas
- `drop_table_if_exists` - Eliminar tablas si existen
- `update_rows_where_condition` - Actualizar filas con condiciones
- `get_table_schema_info` - Obtener información de esquemas

### 📚 **Documentación**
- `generate_readme_from_package_json` - Generar README desde package.json
- `create_api_endpoint_documentation` - Documentar endpoints de API
- `add_jsdoc_comments_to_functions` - Agregar JSDoc a funciones
- `update_changelog_with_version` - Actualizar changelog con versiones
- `generate_type_definitions_docs` - Documentar definiciones de tipos
- `create_installation_guide` - Crear guías de instalación

### 📦 **Gestión de Dependencias**
- `install_npm_package_as_dev_dependency` - Instalar dependencias de desarrollo
- `update_package_to_latest_version` - Actualizar packages a última versión
- `remove_unused_dependencies` - Eliminar dependencias no utilizadas
- `check_package_vulnerabilities` - Verificar vulnerabilidades
- `install_python_requirements_from_file` - Instalar requirements Python
- `add_composer_package_with_version` - Agregar packages PHP

### 🧪 **Testing y Calidad**
- `run_jest_tests_for_specific_file` - Ejecutar tests Jest específicos
- `run_unit_tests_with_coverage_report` - Tests unitarios con coverage
- `run_eslint_on_src_directory` - Ejecutar ESLint en directorios
- `format_code_with_prettier` - Formatear código con Prettier
- `run_typescript_type_check` - Verificación de tipos TypeScript
- `execute_integration_tests_only` - Ejecutar solo tests de integración

### 🌐 **APIs y HTTP**
- `send_post_request_with_json_body` - Enviar requests POST con JSON
- `test_get_endpoint_response_status` - Probar status de endpoints
- `upload_file_via_multipart_form` - Subir archivos multipart
- `download_file_from_url_to_path` - Descargar archivos desde URLs
- `send_webhook_payload_to_url` - Enviar payloads de webhooks

### ⚙️ **Configuración**
- `set_environment_variable_in_dotenv` - Configurar variables en .env
- `read_config_value_from_json` - Leer valores de configuración
- `encrypt_secret_with_key` - Encriptar secretos
- `validate_required_env_variables` - Validar variables requeridas
- `merge_config_files` - Combinar archivos de configuración

### 🐳 **Docker y DevOps**
- `build_docker_image_with_tag` - Construir imágenes Docker con tags
- `run_container_with_port_mapping` - Ejecutar contenedores con puertos
- `stop_all_containers_by_pattern` - Detener contenedores por patrón
- `docker_compose_up_specific_service` - Levantar servicios específicos
- `get_container_logs_last_n_lines` - Obtener logs de contenedores

### 💾 **Bases de Datos Generales**
- `mongodb_insert_document_to_collection` - Insertar documentos MongoDB
- `redis_set_key_with_expiration` - Configurar keys Redis con expiración
- `mysql_create_user_with_permissions` - Crear usuarios MySQL
- `elasticsearch_index_document` - Indexar documentos Elasticsearch

### 🎯 **Priorización de Implementación**
**Fase 1** (Alta prioridad):
1. **Git y GitHub** - Operaciones git avanzadas
2. **Manipulación de Archivos** - Búsqueda y organización
3. **Testing y Calidad** - Validación automatizada

**Fase 2** (Media prioridad):
4. **Gestión de Dependencias** - Manejo de packages
5. **APIs y HTTP** - Testing de endpoints
6. **Configuración** - Gestión de entornos

**Fase 3** (Expansión):
7. **PostgreSQL y SQL** - Operaciones de base de datos
8. **Docker y DevOps** - Automatización de deployment
9. **Documentación** - Generación automática

## 🎯 Recientemente Implementado (2025-07-17)

### ✅ Git y GitHub Advanced Tools - Issue #113
Implementación completa de 5 herramientas avanzadas para Git y GitHub:

#### 🔧 **Nuevas Herramientas Disponibles**
1. **`create_branch_from_main`** - Crear branch desde main con configuración avanzada
   - Parámetros: `branch_name`, `push_to_remote`, `checkout_after_create`
   - Validación de nombre de branch y manejo de errores
   - Sync automático con main antes de crear branch

2. **`create_pull_request_with_template`** - Crear PR usando templates
   - Parámetros: `title`, `body`, `base_branch`, `head_branch`, `template`, `draft`
   - Integración con GitHub API y soporte para templates
   - Detección automática de repositorio desde remote

3. **`add_comment_to_issue`** - Agregar comentarios a issues con opciones
   - Parámetros: `issue_number`, `comment_body`, `close_issue`
   - Soporte para markdown y cierre automático de issues
   - Validación de permisos y manejo de errores API

4. **`get_diff_between_branches`** - Obtener diferencias entre branches
   - Parámetros: `base_branch`, `compare_branch`, `file_filter`, `summary_only`
   - Modo resumen y filtrado por archivos
   - Estadísticas de cambios y formato detallado

5. **`cherry_pick_commit`** - Cherry pick de commits específicos
   - Parámetros: `commit_hash`, `target_branch`, `no_commit`
   - Detección de conflictos y resolución guiada
   - Validación de hash y manejo de commits inexistentes

#### 🎯 **Características Técnicas**
- ✅ **Implementación completa** siguiendo AGENT_GUIDELINES.md
- ✅ **Validación robusta** de parámetros con mensajes de error claros
- ✅ **Manejo de errores** con try/catch y fallbacks apropiados
- ✅ **Integración GitHub API** con autenticación token
- ✅ **Comandos Git seguros** con validaciones de estado
- ✅ **Tests unitarios** para validación y casos edge
- ✅ **Documentación completa** con ejemplos de uso
- ✅ **Registro automático** en ToolRegistry

#### 📊 **Estado de Implementación**
- **Fecha**: 2025-07-17
- **Issue**: #113
- **Archivos creados**: 
  - `server-ts/src/tools/implementations/categories/git/GitHubAdvancedTool.ts`
  - `server-ts/src/tools/implementations/categories/git/types/GitHubAdvancedTypes.ts`
  - `server-ts/tests/tools/categories/git/GitHubAdvancedTool.test.ts`
- **Verificación**: ✅ Build exitoso, ✅ Tools registrados, ✅ Tests básicos pasando

## Memories

### Project Management
- **Guarda el estado del proyecto**