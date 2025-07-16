from fastapi import APIRouter
from ..core.models import AgentRequest, AgentResponse
from ..services.redis_service import redis_service
from ..services.gemini_service import gemini_service
import uuid
import json

router = APIRouter()

@router.post("/v1/github/execute", response_model=AgentResponse)
async def execute_github_step(request: AgentRequest):
    print(f"DEBUG: Received request - conversation_id: {request.conversation_id}, has_prompt: {bool(request.prompt)}, has_tool_response: {bool(request.tool_response)}")
    
    conversation_id = request.conversation_id
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        history = []
    else:
        history = await redis_service.get_conversation(conversation_id)
        print(f"DEBUG: Retrieved history length: {len(history)}")

    # Add the current request to the history
    if request.prompt:
        # Initial prompt from GitHub Issue
        user_message = {
            "role": "user",
            "parts": [
                {
                    "text": f"""
You are an AI software engineering agent helping with GitHub issues.

Issue Title: {request.prompt.issue_title}
Issue Body: {request.prompt.issue_body}

Task from user: {request.prompt.github_context.get('prompt_body', request.prompt.issue_body)}

You have access to the following tools:
- write_file: Create or update a file
- read_file: Read file contents
- run_shell_command: Execute shell commands
- finish: Complete the task with a summary message

Analyze the issue and complete the requested task. Work autonomously and use the tools as needed.
When you're done, use the 'finish' action with a summary of what you accomplished.
"""
                }
            ]
        }
        history.append(user_message)
    elif request.tool_response:
        # Response from a tool execution
        tool_output = {
            "role": "user",
            "parts": [
                {
                    "text": f"""
Tool execution result for '{request.tool_response.tool_name}':
{f"Command: {request.tool_response.command}" if hasattr(request.tool_response, 'command') and request.tool_response.command else ""}
{f"File Path: {request.tool_response.file_path}" if hasattr(request.tool_response, 'file_path') and request.tool_response.file_path else ""}
{f"Content: {request.tool_response.content}" if hasattr(request.tool_response, 'content') and request.tool_response.content else ""}
{f"Stdout: {request.tool_response.stdout}" if hasattr(request.tool_response, 'stdout') and request.tool_response.stdout else ""}
{f"Stderr: {request.tool_response.stderr}" if hasattr(request.tool_response, 'stderr') and request.tool_response.stderr else ""}
{f"Exit Code: {request.tool_response.exit_code}" if hasattr(request.tool_response, 'exit_code') and request.tool_response.exit_code is not None else ""}

Continue with your task. What is your next action?
"""
                }
            ]
        }
        history.append(tool_output)
    else:
        # Neither prompt nor tool_response provided
        print(f"DEBUG: No prompt or tool_response provided. Current history: {history}")
        if not history:
            return AgentResponse(
                conversation_id=conversation_id, 
                action="finish", 
                message="Error: No prompt or tool response provided and no conversation history found."
            )

    print(f"DEBUG: About to call Gemini with history length: {len(history)}")
    # Get response from Gemini
    gemini_response_text = await gemini_service.generate_response(history)
    history.append({"role": "model", "parts": gemini_response_text})

    await redis_service.save_conversation(conversation_id, history)

    # Parse Gemini's response to determine the next action
    print(f"DEBUG: Gemini response: {gemini_response_text}")
    try:
        gemini_action = json.loads(gemini_response_text)
        action = gemini_action.get("action")
        if action == "finish":
            return AgentResponse(conversation_id=conversation_id, action="finish", message=gemini_action.get("message", "Task completed."))
        elif action == "run_shell_command":
            return AgentResponse(conversation_id=conversation_id, action="run_shell_command", command=gemini_action.get("command"))
        elif action == "read_file":
            return AgentResponse(conversation_id=conversation_id, action="read_file", file_path=gemini_action.get("file_path"))
        elif action == "write_file":
            return AgentResponse(conversation_id=conversation_id, action="write_file", file_path=gemini_action.get("file_path"), content=gemini_action.get("content"))
        else:
            return AgentResponse(conversation_id=conversation_id, action="finish", message=f"Unknown action from Gemini: {action}. Raw response: {gemini_response_text}")
    except json.JSONDecodeError:
        return AgentResponse(conversation_id=conversation_id, action="finish", message=f"Gemini did not respond with valid JSON. Raw response: {gemini_response_text}")