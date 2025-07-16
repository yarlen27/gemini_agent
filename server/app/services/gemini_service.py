import google.generativeai as genai
from ..core.config import settings
import json

def write_file(file_path: str, content: str) -> str:
    """Writes content to a file."""
    return f"write_file:{file_path}:{content}"

def read_file(file_path: str) -> str:
    """Reads the content of a file."""
    return f"read_file:{file_path}"

def run_shell_command(command: str) -> str:
    """Executes a shell command."""
    return f"run_shell_command:{command}"

def finish(message: str) -> str:
    """Indicates task completion."""
    return f"finish:{message}"

class GeminiService:
    def __init__(self):
        print(f"DEBUG: GEMINI_API_KEY = {settings.GEMINI_API_KEY[:10]}...")
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Use actual Python functions for tools
        self.tools = [write_file, read_file, run_shell_command, finish]
        self.model = genai.GenerativeModel('gemini-2.5-flash', tools=self.tools)

    async def generate_response(self, history: list) -> str:
        response = await self.model.generate_content_async(history)
        
        # Check if response has function calls
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    function_call = part.function_call
                    action = function_call.name
                    args = dict(function_call.args)
                    
                    # Map function names to response structure
                    if action == "write_file":
                        return json.dumps({
                            "action": "write_file",
                            "file_path": args.get("file_path"),
                            "content": args.get("content")
                        })
                    elif action == "read_file":
                        return json.dumps({
                            "action": "read_file", 
                            "file_path": args.get("file_path")
                        })
                    elif action == "run_shell_command":
                        return json.dumps({
                            "action": "run_shell_command",
                            "command": args.get("command")
                        })
                    elif action == "finish":
                        return json.dumps({
                            "action": "finish",
                            "message": args.get("message")
                        })
        
        # If no function call, try to parse text response
        if response.text:
            return json.dumps({
                "action": "finish",
                "message": response.text
            })
        
        # Fallback
        return json.dumps({
            "action": "finish", 
            "message": "No response generated"
        })

gemini_service = GeminiService()
