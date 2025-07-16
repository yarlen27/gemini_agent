from typing import Optional, List
from pydantic import BaseModel

class PromptContext(BaseModel):
    issue_title: str
    issue_body: str
    github_context: dict # This can be more detailed later

class ToolResponse(BaseModel):
    tool_name: str
    command: Optional[str] = None
    file_path: Optional[str] = None
    content: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: Optional[int] = None

class AgentRequest(BaseModel):
    conversation_id: Optional[str] = None
    prompt: Optional[PromptContext] = None
    tool_response: Optional[ToolResponse] = None

class AgentResponse(BaseModel):
    conversation_id: str
    action: str # e.g., run_shell_command, read_file, write_file, finish
    command: Optional[str] = None
    file_path: Optional[str] = None
    content: Optional[str] = None
    message: Optional[str] = None
