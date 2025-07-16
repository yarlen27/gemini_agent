import google.generativeai as genai
from ..core.config import settings
import json

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-pro') # Ensure we use a model that supports function calling

        # Define the tools (Function Declarations)
        self.tools = [
            {
                "functionDeclarations": [
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
            }
        ]

    async def generate_response(self, history: list) -> str:
        response = await self.model.generate_content_async(history, tools=self.tools)
        # Parse the functionCall from the response
        if response.candidates and response.candidates[0].content.parts[0].function_call:
            function_call = response.candidates[0].content.parts[0].function_call
            return json.dumps({"action": function_call.name, **function_call.args})
        else:
            # If no function call, return the text response
            return response.text

gemini_service = GeminiService()
