import os
import json
import requests
import subprocess

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

def run_shell_command(command: str):
    print(f"Executing command: {command}")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, check=True)
        stdout = result.stdout
        stderr = result.stderr
        exit_code = result.returncode
        print(f"Command Stdout:\n{stdout}")
        if stderr:
            print(f"Command Stderr:\n{stderr}")
        return {"tool_name": "run_shell_command", "command": command, "stdout": stdout, "stderr": stderr, "exit_code": exit_code}
    except subprocess.CalledProcessError as e:
        print(f"Command failed with error: {e}")
        return {"tool_name": "run_shell_command", "command": command, "stdout": e.stdout, "stderr": e.stderr, "exit_code": e.returncode}
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return {"tool_name": "run_shell_command", "command": command, "stdout": "", "stderr": str(e), "exit_code": 1}

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
            tool_result = run_shell_command(agent_response["command"])
            # Send tool_result back to the server in the next iteration
            request_body["tool_response"] = tool_result
            continue # Continue the loop to send the tool_response
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
