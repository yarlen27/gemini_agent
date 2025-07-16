import google.generativeai as genai
from ..core.config import settings
import json

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.5-flash') # Using gemini-2.5-flash as requested

        # Define the tools (Function Declarations)
        self.tools = [
            {
                "name": "write_file",
                "description": "Writes content to a file.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": { "type": "string" },
                        "content": { "type": "string" }
                    },
                    "required": ["file_path", "content"]
                }
            },
            {
                "name": "read_file",
                "description": "Reads the content of a file.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": { "type": "string" }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "run_shell_command",
                "description": "Executes a shell command.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": { "type": "string" }
                    },
                    "required": ["command"]
                }
            },
            {
                "name": "finish",
                "description": "Indicates task completion.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "message": { "type": "string" }
                    },
                    "required": ["message"]
                }
            }
        ]

    async def generate_response(self, history: list) -> str:
        try:
            response = await self.model.generate_content_async(history, tools=self.tools)
        except Exception as e:
            # Fallback without tools if there's an error
            print(f"Error with tools: {e}")
            response = await self.model.generate_content_async(history)
            # Return a default action if no tools available
            return '{"action": "finish", "message": "Error with function calling. Please try again."}'
        # Parse the functionCall from the response
        if response.candidates and response.candidates[0].content.parts[0].function_call:
            function_call = response.candidates[0].content.parts[0].function_call
            return json.dumps({"action": function_call.name, **function_call.args})
        else:
            # If no function call, return the text response
            return response.text

gemini_service = GeminiService()
