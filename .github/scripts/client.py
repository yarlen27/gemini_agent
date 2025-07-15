import os
import json
import requests

# Read GitHub environment variables
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
ISSUE_TITLE = os.getenv("ISSUE_TITLE")
ISSUE_BODY = os.getenv("ISSUE_BODY")
ISSUE_NUMBER = os.getenv("ISSUE_NUMBER")
PROMPT_BODY = os.getenv("PROMPT_BODY")
GEMINI_AGENT_API_URL = os.getenv("GEMINI_AGENT_API_URL")

print(f"--- Client Script Started ---")
print(f"Issue Title: {ISSUE_TITLE}")
print(f"Issue Body: {ISSUE_BODY}")
print(f"Prompt Body: {PROMPT_BODY}")
print(f"API URL: {GEMINI_AGENT_API_URL}")

conversation_id = None

while True:
    request_body = {}
    if conversation_id:
        request_body["conversation_id"] = conversation_id
    
    if not conversation_id and PROMPT_BODY:
        request_body["prompt"] = {
            "issue_title": ISSUE_TITLE,
            "issue_body": ISSUE_BODY,
            "github_context": {
                "issue_number": ISSUE_NUMBER,
                "prompt_body": PROMPT_BODY
            }
        }
    # TODO: Add tool_response if applicable

    try:
        response = requests.post(f"{GEMINI_AGENT_API_URL}/v1/github/execute", json=request_body)
        response.raise_for_status() # Raise an exception for HTTP errors
        agent_response = response.json()
        print(f"API Response: {json.dumps(agent_response, indent=2)}")

        conversation_id = agent_response["conversation_id"]

        action = agent_response["action"]
        if action == "finish":
            print(f"Agent finished with message: {agent_response.get("message", "No message")}")
            break
        elif action == "run_shell_command":
            print(f"Agent requested to run command: {agent_response["command"]}")
            # TODO: Implement command execution
            pass
        elif action == "read_file":
            print(f"Agent requested to read file: {agent_response["file_path"]}")
            # TODO: Implement file reading
            pass
        elif action == "write_file":
            print(f"Agent requested to write file: {agent_response["file_path"]}")
            # TODO: Implement file writing
            pass
        else:
            print(f"Unknown action: {action}")
            break

    except requests.exceptions.RequestException as e:
        print(f"Error making API call: {e}")
        exit(1)

print(f"--- Client Script Finished ---")
