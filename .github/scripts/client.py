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

# Initial API call
initial_request_body = {
    "prompt": {
        "issue_title": ISSUE_TITLE,
        "issue_body": ISSUE_BODY,
        "github_context": {
            "issue_number": ISSUE_NUMBER,
            "prompt_body": PROMPT_BODY
        }
    }
}

try:
    response = requests.post(f"{GEMINI_AGENT_API_URL}/v1/github/execute", json=initial_request_body)
    response.raise_for_status() # Raise an exception for HTTP errors
    agent_response = response.json()
    print(f"Initial API Response: {json.dumps(agent_response, indent=2)}")

    # Output conversation_id for subsequent calls
    print(f"::set-output name=conversation_id::{agent_response["conversation_id"]}")

except requests.exceptions.RequestException as e:
    print(f"Error making initial API call: {e}")
    exit(1)

print(f"--- Client Script Finished ---")

# TODO: Implement API calls and tool execution logic
