from fastapi import APIRouter
from ..core.models import AgentRequest, AgentResponse
from ..services.redis_service import redis_service
from ..services.gemini_service import gemini_service
import uuid
import json

router = APIRouter()

@router.post("/v1/github/execute", response_model=AgentResponse)
async def execute_github_step(request: AgentRequest):
    conversation_id = request.conversation_id
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        history = []
    else:
        history = await redis_service.get_conversation(conversation_id)

    # Add the current request to the history
    if request.prompt:
        # Initial prompt from GitHub Issue
        user_message = {
            "role": "user",
            "parts": [
                {
                    "text": f"""
You are an AI software engineering agent.
Your task is to create a file named 'test_simple.txt' with the content 'This is a simple test.'.
You MUST respond with a JSON object containing "action" and its parameters.

Example of the expected JSON response for this task:
{{
  "action": "write_file",
  "file_path": "test_simple.txt",
  "content": "This is a simple test."
}}

Respond ONLY with the JSON object. Do NOT include any other text or explanation.
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
You previously requested to run the tool '{request.tool_response.tool_name}'.
Here is the output from that tool execution:

Command: {request.tool_response.command}
Stdout: {request.tool_response.stdout}
Stderr: {request.tool_response.stderr}
Exit Code: {request.tool_response.exit_code}

Based on this output, what is your next action?
You MUST respond with a JSON object.
"""
                }
            ]
        }
        history.append(tool_output)

    # Get response from Gemini
    gemini_response_text = await gemini_service.generate_response(history)
    history.append({"role": "model", "parts": gemini_response_text})

    await redis_service.save_conversation(conversation_id, history)

    # Parse Gemini's response to determine the next action
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