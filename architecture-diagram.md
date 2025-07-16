# Arquitectura del Sistema Gemini Agent

## 📊 Flujo Actual (Con Problema)

```
┌─────────────────────┐
│   GitHub Issue      │
│ "@gemini do this"   │
└──────────┬──────────┘
           │ 1. Trigger
           ▼
┌─────────────────────┐
│  GitHub Actions     │
│  (.github/workflows)│
└──────────┬──────────┘
           │ 2. Ejecuta
           ▼
┌─────────────────────┐
│   client.py         │ ❌ PROBLEMA: Llama a
│  (Python Script)    │    /v1/github/execute
└──────────┬──────────┘    (no existe)
           │ 3. POST
           ▼
┌─────────────────────┐
│ Gemini Agent Server │
│   (TypeScript)      │
│ ┌─────────────────┐ │
│ │ /health ✅      │ │
│ │ /v1/github/     │ │
│ │   webhook ✅    │ │
│ │ /v1/github/     │ │
│ │   execute ❌    │ │
│ └─────────────────┘ │
└─────────────────────┘
```

## 🎯 Arquitectura Objetivo (Post-Migración)

```
┌─────────────────────┐
│   GitHub Issue      │
│ "@gemini do this"   │
└──────────┬──────────┘
           │ 1. Trigger
           ▼
┌─────────────────────┐
│  GitHub Actions     │
│  (.github/workflows)│
└──────────┬──────────┘
           │ 2. Ejecuta
           ▼
┌─────────────────────┐
│   client.ts         │ ✅ NUEVO: TypeScript
│  (TypeScript)       │    Llama a /v1/github/webhook
└──────────┬──────────┘
           │ 3. POST
           ▼
┌─────────────────────────────────┐
│     Gemini Agent Server         │
│        (TypeScript)             │
│ ┌─────────────────────────────┐ │
│ │   Express.js Server         │ │
│ ├─────────────────────────────┤ │
│ │ GET  /health                │ │
│ │ POST /v1/github/webhook     │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │      Services Layer         │ │
│ ├─────────────────────────────┤ │
│ │ • GeminiService             │ │◄──── Google Gemini API
│ │ • GitHubService             │ │◄──── GitHub API
│ │ • WebhookController         │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │    Tools (Plugin System)    │ │
│ ├─────────────────────────────┤ │
│ │ • ShellTool                 │ │
│ │ • ReadFileTool              │ │
│ │ • WriteFileTool             │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
           │
           │ 4. Crea PR
           ▼
┌─────────────────────┐
│   GitHub Pull       │
│   Request           │
└─────────────────────┘
```

## 🔄 Flujo Detallado del Proceso

### 1️⃣ Usuario crea issue
```
Usuario: "[@gemini] Crea un archivo test.md"
```

### 2️⃣ GitHub Actions se activa
```yaml
on:
  issues:
    types: [opened, edited]
```

### 3️⃣ Client TypeScript procesa
```typescript
// Lee variables de entorno
const issueNumber = process.env.ISSUE_NUMBER;
const issueBody = process.env.ISSUE_BODY;

// Prepara payload
const payload = {
  issue_number: issueNumber,
  issue_title: issueTitle,
  issue_body: issueBody,
  repo: repo,
  github_token: token
};

// Envía a servidor
POST https://gemini.27cobalto.com/v1/github/webhook
```

### 4️⃣ Servidor procesa con Gemini
```
Server → Gemini AI: "Necesito crear test.md"
Gemini → Server: "Usa write_file tool"
Server → Ejecuta WriteFileTool
Server → Crea commit
Server → Push a GitHub
Server → Crea link de PR
```

### 5️⃣ Resultado final
```
GitHub Comment: "✅ Completado - [Crear PR →](link)"
```

## 🏗️ Componentes Clave

### Cliente (client.ts)
- **Propósito**: Puente entre GitHub Actions y servidor
- **Responsabilidades**:
  - Leer variables de entorno
  - Formatear payload
  - Manejar errores
  - Actualizar comentarios

### Servidor (TypeScript)
- **WebhookController**: Maneja requests entrantes
- **GeminiService**: Comunica con AI
- **GitHubService**: Operaciones Git/GitHub
- **ToolRegistry**: Sistema de plugins para herramientas

### Herramientas (Tools)
- **ShellTool**: Ejecuta comandos bash
- **ReadFileTool**: Lee archivos
- **WriteFileTool**: Crea/modifica archivos
- **FinishTool**: Completa la tarea

## 🔐 Seguridad
- GitHub Token se pasa desde Actions
- Gemini API Key en servidor
- No hay secretos en código