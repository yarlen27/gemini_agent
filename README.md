# Gemini Agent for GitHub Automation

This project implements a sophisticated AI agent powered by Google Gemini, designed to automate software development tasks directly within a GitHub repository. The agent is triggered by mentions in GitHub issues and uses a robust, server-based architecture to manage conversations, execute tools, and apply code changes.

## Core Features

### 1. API-Driven Orchestration (Broker Server)
- **Centralized Logic:** A single API endpoint (e.g., `/v1/github/execute`) acts as the brain of the operation.
- **Enhanced Security:** The Gemini API key is securely stored and managed on the server, never exposed to the client-side GitHub Action.
- **Model Abstraction:** The GitHub Action client is decoupled from the underlying AI model, interacting only with our secure API.

### 2. State and Conversation Management (Redis)
- **Persistent Conversation History:** Each task triggered by a GitHub issue is treated as a distinct conversation with its own persistent history.
- **Context Caching:** The full conversation context—including prompts, model responses, and tool outputs—is cached in Redis, keyed by a unique conversation ID.
- **Task Resumption:** The system is designed to be resilient, allowing failed jobs to be resumed from the last successfully executed step.
- **Cache Expiration:** Stale or completed conversation histories are automatically purged to maintain a clean and efficient cache.

### 3. Seamless GitHub Integration (Client-Side)
- **Mention-Based Triggers:** The workflow is initiated by mentioning the agent (e.g., `@gemini`) in a GitHub issue title or comment.
- **Lightweight Client:** The script within the GitHub Action is intentionally simple. Its sole responsibilities are to:
    1. Gather initial context from the GitHub issue.
    2. Communicate with our API server in a loop.
    3. Execute commands returned by the server.
    4. Send the execution results back to the server.
- **Automated Pull Requests:** Upon successful task completion, the agent automatically generates a Pull Request with the proposed changes.

### 4. Powerful Tooling Capabilities
- **Shell Command Execution:** The primary and most flexible tool, allowing the agent to run any required shell command (e.g., `dotnet build`, `ls`, `grep`, `npm install`).
- **File System Operations:** Dedicated tools for reading, writing, and modifying files within the repository checkout.
- **Web Search (Optional):** The agent can be equipped with the ability to perform Google searches to find external information, such as solutions to specific build errors or library documentation.

### 5. Logging and Observability
- **Detailed Logging:** The API server meticulously logs every step of each conversation, including prompts, model responses, and tool outputs.
- **Traceability:** All log entries are tagged with a unique conversation ID, enabling straightforward debugging and tracing of specific jobs.

### 6. AI Model Configuration
- **Configurable Model:** The specific Gemini model (e.g., `gemini-2.5-pro`) can be easily configured on the server side.
- **Centralized Prompt Engineering:** All prompt construction logic resides on the server, allowing for rapid iteration and fine-tuning without modifying the GitHub workflow files.
