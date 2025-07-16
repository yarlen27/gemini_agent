import os
import json
import requests
import subprocess
import logging
from datetime import datetime

# --- Logging Setup ---
# Create a unique log file for each run
log_filename = f"client_run_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_filename),
        logging.StreamHandler() # Also print to console
    ]
)
logger = logging.getLogger(__name__)

logger.info(f"--- Client Script Started --- Log file: {log_filename}")

# Read GitHub environment variables
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
ISSUE_TITLE = os.getenv("ISSUE_TITLE")
ISSUE_BODY = os.getenv("ISSUE_BODY")
ISSUE_NUMBER = os.getenv("ISSUE_NUMBER")
PROMPT_BODY = os.getenv("PROMPT_BODY")
GEMINI_AGENT_API_URL = os.getenv("GEMINI_AGENT_API_URL")
INITIAL_COMMENT_ID = os.getenv("INITIAL_COMMENT_ID")

logger.info(f"Initial Environment Variables:")
logger.info(f"  Issue Title: {ISSUE_TITLE}")
logger.info(f"  Issue Body: {ISSUE_BODY}")
logger.info(f"  Prompt Body: {PROMPT_BODY}")
logger.info(f"  API URL: {GEMINI_AGENT_API_URL}")
logger.info(f"  Initial Comment ID: {INITIAL_COMMENT_ID}")

# Create a new branch for the changes
BRANCH_NAME = f"gemini-issue-{ISSUE_NUMBER}"
logger.info(f"Creating new branch: {BRANCH_NAME}")
try:
    subprocess.run(f"git checkout -b {BRANCH_NAME}", shell=True, check=True)
    # Skip push for local testing
    # subprocess.run(f"git push origin {BRANCH_NAME}", shell=True, check=True) # Push empty branch
except subprocess.CalledProcessError as e:
    logger.error(f"Error creating branch: {e.stderr}")
    # Don't exit for local testing
    # exit(1)

conversation_id = None

def run_shell_command(command: str):
    logger.info(f"Executing command: {command}")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, check=True)
        stdout = result.stdout
        stderr = result.stderr
        exit_code = result.returncode
        logger.info(f"Command Stdout:\n{stdout}")
        if stderr:
            logger.warning(f"Command Stderr:\n{stderr}")
        return {"tool_name": "run_shell_command", "command": command, "stdout": stdout, "stderr": stderr, "exit_code": exit_code}
    except subprocess.CalledProcessError as e:
        logger.error(f"Command failed with error: {e.stderr}")
        return {"tool_name": "run_shell_command", "command": command, "stdout": e.stdout, "stderr": e.stderr, "exit_code": e.returncode}
    except Exception as e:
        logger.critical(f"An unexpected error occurred: {e}")
        return {"tool_name": "run_shell_command", "command": command, "stdout": "", "stderr": str(e), "exit_code": 1}

def list_directory(path: str = "."):
    logger.info(f"Listing directory: {path}")
    try:
        # Try modern exa first, fallback to ls
        result = subprocess.run(["exa", "-la", "--git", path], capture_output=True, text=True)
        if result.returncode == 0:
            return {"tool_name": "list_directory", "path": path, "stdout": result.stdout, "tool_used": "exa"}
        else:
            # Fallback to ls
            result = subprocess.run(["ls", "-la", path], capture_output=True, text=True, check=True)
            return {"tool_name": "list_directory", "path": path, "stdout": result.stdout, "tool_used": "ls"}
    except Exception as e:
        logger.error(f"Error listing directory: {e}")
        return {"tool_name": "list_directory", "path": path, "stderr": str(e), "exit_code": 1}

def glob_files(pattern: str, path: str = "."):
    logger.info(f"Finding files with pattern '{pattern}' in '{path}'")
    try:
        # Try modern fd first, fallback to find
        result = subprocess.run(["fd", pattern, path], capture_output=True, text=True)
        if result.returncode == 0:
            return {"tool_name": "glob_files", "pattern": pattern, "path": path, "stdout": result.stdout, "tool_used": "fd"}
        else:
            # Fallback to find
            result = subprocess.run(["find", path, "-name", pattern], capture_output=True, text=True, check=True)
            return {"tool_name": "glob_files", "pattern": pattern, "path": path, "stdout": result.stdout, "tool_used": "find"}
    except Exception as e:
        logger.error(f"Error finding files: {e}")
        return {"tool_name": "glob_files", "pattern": pattern, "path": path, "stderr": str(e), "exit_code": 1}

def grep_content(pattern: str, path: str = ".", file_type: str = ""):
    logger.info(f"Searching for '{pattern}' in '{path}' (type: {file_type})")
    try:
        # Try modern rg first, fallback to grep
        cmd = ["rg", pattern, path]
        if file_type:
            cmd.extend(["-t", file_type])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return {"tool_name": "grep_content", "pattern": pattern, "path": path, "stdout": result.stdout, "tool_used": "rg"}
        else:
            # Fallback to grep
            cmd = ["grep", "-r", pattern, path]
            if file_type:
                cmd.extend(["--include", f"*.{file_type}"])
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return {"tool_name": "grep_content", "pattern": pattern, "path": path, "stdout": result.stdout, "tool_used": "grep"}
    except Exception as e:
        logger.error(f"Error searching content: {e}")
        return {"tool_name": "grep_content", "pattern": pattern, "path": path, "stderr": str(e), "exit_code": 1}

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

    logger.info(f"Sending API request: {json.dumps(request_body, indent=2)}")
    try:
        response = requests.post(f"{GEMINI_AGENT_API_URL}/v1/github/execute", json=request_body)
        response.raise_for_status() # Raise an exception for HTTP errors
        agent_response = response.json()
        logger.info(f"Received API Response: {json.dumps(agent_response, indent=2)}")

        conversation_id = agent_response["conversation_id"]

        action = agent_response["action"]
        logger.info(f"Agent Action: {action}")
        if action == "finish":
            logger.info(f"Agent finished with message: {agent_response.get('message', 'No message')}")
            # Commit changes and create PR
            try:
                subprocess.run("git add .", shell=True, check=True)
                subprocess.run(["git", "commit", "-m", f"feat: Resolves #{ISSUE_NUMBER} - {ISSUE_TITLE}"], check=True)
                subprocess.run(f"git push origin {BRANCH_NAME}", shell=True, check=True)
                
                pr_title = f"feat(issue-{ISSUE_NUMBER}): {ISSUE_TITLE}"
                pr_body = f"Resolves #{ISSUE_NUMBER}\n\nThis PR was automatically generated by Gemini.\n\nAgent's final message:\n{agent_response.get('message', 'No message')}"
                
                # Create PR link instead of automatic PR
                import urllib.parse
                encoded_title = urllib.parse.quote(pr_title)
                encoded_body = urllib.parse.quote(pr_body)
                pr_link = f"https://github.com/yarlen27/gemini_agent/compare/main...{BRANCH_NAME}?quick_pull=1&title={encoded_title}&body={encoded_body}"
                
                logger.info(f"Pull Request link created: {pr_link}")
                
                # Edit the initial comment with the final result
                comment_body = f"Gemini finished @{GITHUB_TOKEN.split('_')[0] if GITHUB_TOKEN else 'yarlen27'}'s task — [Create PR →]({pr_link})\n\n✅ **Completed**: {agent_response.get('message', 'Task completed successfully.')}"
                
                try:
                    if INITIAL_COMMENT_ID:
                        subprocess.run([
                            "gh", "api", f"repos/yarlen27/gemini_agent/issues/comments/{INITIAL_COMMENT_ID}",
                            "--method", "PATCH",
                            "--field", f"body={comment_body}"
                        ], check=True)
                        logger.info(f"Edited initial comment {INITIAL_COMMENT_ID} with final result")
                    else:
                        # Fallback to creating new comment if no initial comment ID
                        subprocess.run([
                            "gh", "issue", "comment", ISSUE_NUMBER, 
                            "--body", comment_body
                        ], check=True)
                        logger.info(f"Created new comment on issue #{ISSUE_NUMBER} with PR link")
                except subprocess.CalledProcessError as e:
                    logger.error(f"Failed to update comment: {e}")
                
                print(f"\n🔗 Create Pull Request: {pr_link}")
                print(f"\n✅ Gemini finished: {agent_response.get('message', 'No message')}")
            except subprocess.CalledProcessError as e:
                logger.error(f"Error creating PR: {e}")
                exit(1)
            break
        elif action == "run_shell_command":
            tool_result = run_shell_command(agent_response["command"])
            
            # Send tool response immediately
            tool_response_body = {"conversation_id": conversation_id, "tool_response": tool_result}
            logger.info(f"Sending tool response: {json.dumps(tool_response_body, indent=2)}")
            try:
                response = requests.post(f"{GEMINI_AGENT_API_URL}/v1/github/execute", json=tool_response_body)
                response.raise_for_status()
                agent_response = response.json()
                logger.info(f"Received API Response after tool: {json.dumps(agent_response, indent=2)}")
                conversation_id = agent_response["conversation_id"]
                
                # Check if the response is finish, then break the loop
                if agent_response.get("action") == "finish":
                    logger.info(f"Agent finished with message: {agent_response.get('message', 'No message')}")
                    # Commit changes and create PR
                    try:
                        subprocess.run("git add .", shell=True, check=True)
                        subprocess.run(["git", "commit", "-m", f"feat: Resolves #{ISSUE_NUMBER} - {ISSUE_TITLE}"], check=True)
                        subprocess.run(f"git push origin {BRANCH_NAME}", shell=True, check=True)
                        
                        pr_title = f"feat(issue-{ISSUE_NUMBER}): {ISSUE_TITLE}"
                        pr_body = f"Resolves #{ISSUE_NUMBER}\\n\\nThis PR was automatically generated by Gemini.\\n\\nAgent's final message:\\n{agent_response.get('message', 'No message')}"
                        
                        # Create PR link instead of automatic PR
                        import urllib.parse
                        encoded_title = urllib.parse.quote(pr_title)
                        encoded_body = urllib.parse.quote(pr_body)
                        pr_link = f"https://github.com/yarlen27/gemini_agent/compare/main...{BRANCH_NAME}?quick_pull=1&title={encoded_title}&body={encoded_body}"
                        
                        logger.info(f"Pull Request link created: {pr_link}")
                        
                        # Edit the initial comment with the final result
                        comment_body = f"Gemini finished @{GITHUB_TOKEN.split('_')[0] if GITHUB_TOKEN else 'yarlen27'}'s task — [Create PR →]({pr_link})\\n\\n✅ **Completed**: {agent_response.get('message', 'Task completed successfully.')}"
                        
                        try:
                            if INITIAL_COMMENT_ID:
                                subprocess.run([
                                    "gh", "api", f"repos/yarlen27/gemini_agent/issues/comments/{INITIAL_COMMENT_ID}",
                                    "--method", "PATCH",
                                    "--field", f"body={comment_body}"
                                ], check=True)
                                logger.info(f"Edited initial comment {INITIAL_COMMENT_ID} with final result")
                            else:
                                # Fallback to creating new comment if no initial comment ID
                                subprocess.run([
                                    "gh", "issue", "comment", ISSUE_NUMBER, 
                                    "--body", comment_body
                                ], check=True)
                                logger.info(f"Created new comment on issue #{ISSUE_NUMBER} with PR link")
                        except subprocess.CalledProcessError as e:
                            logger.error(f"Failed to update comment: {e}")
                        
                        print(f"\\n🔗 Create Pull Request: {pr_link}")
                        print(f"\\n✅ Gemini finished: {agent_response.get('message', 'No message')}")
                    except subprocess.CalledProcessError as e:
                        logger.error(f"Error creating PR: {e}")
                        exit(1)
                    break
                # Continue processing the new response (not finish)
                continue  # Go back to the main loop to process the new action
            except requests.exceptions.RequestException as e:
                logger.critical(f"Error sending tool response: {e}")
                exit(1)
        elif action == "read_file":
            logger.info(f"Agent requested to read file: {agent_response['file_path']}")
            file_path = agent_response["file_path"]
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                tool_result = {"tool_name": "read_file", "file_path": file_path, "content": content}
            except FileNotFoundError:
                tool_result = {"tool_name": "read_file", "file_path": file_path, "stderr": "File not found", "exit_code": 1}
            except Exception as e:
                tool_result = {"tool_name": "read_file", "file_path": file_path, "stderr": str(e), "exit_code": 1}
            
            # Send tool response immediately
            tool_response_body = {"conversation_id": conversation_id, "tool_response": tool_result}
            logger.info(f"Sending tool response: {json.dumps(tool_response_body, indent=2)}")
            try:
                response = requests.post(f"{GEMINI_AGENT_API_URL}/v1/github/execute", json=tool_response_body)
                response.raise_for_status()
                agent_response = response.json()
                logger.info(f"Received API Response after tool: {json.dumps(agent_response, indent=2)}")
                conversation_id = agent_response["conversation_id"]
                
                # Check if the response is finish, then break the loop
                if agent_response.get("action") == "finish":
                    logger.info(f"Agent finished with message: {agent_response.get('message', 'No message')}")
                    # Commit changes and create PR
                    try:
                        subprocess.run("git add .", shell=True, check=True)
                        subprocess.run(["git", "commit", "-m", f"feat: Resolves #{ISSUE_NUMBER} - {ISSUE_TITLE}"], check=True)
                        subprocess.run(f"git push origin {BRANCH_NAME}", shell=True, check=True)
                        
                        pr_title = f"feat(issue-{ISSUE_NUMBER}): {ISSUE_TITLE}"
                        pr_body = f"Resolves #{ISSUE_NUMBER}\\n\\nThis PR was automatically generated by Gemini.\\n\\nAgent's final message:\\n{agent_response.get('message', 'No message')}"
                        
                        # Create PR link instead of automatic PR
                        import urllib.parse
                        encoded_title = urllib.parse.quote(pr_title)
                        encoded_body = urllib.parse.quote(pr_body)
                        pr_link = f"https://github.com/yarlen27/gemini_agent/compare/main...{BRANCH_NAME}?quick_pull=1&title={encoded_title}&body={encoded_body}"
                        
                        logger.info(f"Pull Request link created: {pr_link}")
                        
                        # Edit the initial comment with the final result
                        comment_body = f"Gemini finished @{GITHUB_TOKEN.split('_')[0] if GITHUB_TOKEN else 'yarlen27'}'s task — [Create PR →]({pr_link})\\n\\n✅ **Completed**: {agent_response.get('message', 'Task completed successfully.')}"
                        
                        try:
                            if INITIAL_COMMENT_ID:
                                subprocess.run([
                                    "gh", "api", f"repos/yarlen27/gemini_agent/issues/comments/{INITIAL_COMMENT_ID}",
                                    "--method", "PATCH",
                                    "--field", f"body={comment_body}"
                                ], check=True)
                                logger.info(f"Edited initial comment {INITIAL_COMMENT_ID} with final result")
                            else:
                                # Fallback to creating new comment if no initial comment ID
                                subprocess.run([
                                    "gh", "issue", "comment", ISSUE_NUMBER, 
                                    "--body", comment_body
                                ], check=True)
                                logger.info(f"Created new comment on issue #{ISSUE_NUMBER} with PR link")
                        except subprocess.CalledProcessError as e:
                            logger.error(f"Failed to update comment: {e}")
                        
                        print(f"\\n🔗 Create Pull Request: {pr_link}")
                        print(f"\\n✅ Gemini finished: {agent_response.get('message', 'No message')}")
                    except subprocess.CalledProcessError as e:
                        logger.error(f"Error creating PR: {e}")
                        exit(1)
                    break
                # Continue processing the new response (not finish)
                continue  # Go back to the main loop to process the new action
            except requests.exceptions.RequestException as e:
                logger.critical(f"Error sending tool response: {e}")
                exit(1)
        elif action == "write_file":
            logger.info(f"Agent requested to write file: {agent_response['file_path']}")
            file_path = agent_response["file_path"]
            content = agent_response["content"]
            try:
                # Ensure directory exists
                dir_path = os.path.dirname(file_path)
                if dir_path:  # Only create directory if file_path contains a directory
                    os.makedirs(dir_path, exist_ok=True)
                
                logger.info(f"Writing to file: {file_path}")
                logger.info(f"Content length: {len(content)} characters")
                with open(file_path, 'w') as f:
                    f.write(content)
                logger.info(f"File written successfully: {file_path}")
                tool_result = {"tool_name": "write_file", "file_path": file_path, "stdout": "File written successfully"}
            except Exception as e:
                tool_result = {"tool_name": "write_file", "file_path": file_path, "stderr": str(e), "exit_code": 1}
            
            # Send tool response immediately
            tool_response_body = {"conversation_id": conversation_id, "tool_response": tool_result}
            logger.info(f"Sending tool response: {json.dumps(tool_response_body, indent=2)}")
            try:
                response = requests.post(f"{GEMINI_AGENT_API_URL}/v1/github/execute", json=tool_response_body)
                response.raise_for_status()
                agent_response = response.json()
                logger.info(f"Received API Response after tool: {json.dumps(agent_response, indent=2)}")
                conversation_id = agent_response["conversation_id"]
                
                # Check if the response is finish, then break the loop
                if agent_response.get("action") == "finish":
                    logger.info(f"Agent finished with message: {agent_response.get('message', 'No message')}")
                    # Commit changes and create PR
                    try:
                        subprocess.run("git add .", shell=True, check=True)
                        subprocess.run(["git", "commit", "-m", f"feat: Resolves #{ISSUE_NUMBER} - {ISSUE_TITLE}"], check=True)
                        subprocess.run(f"git push origin {BRANCH_NAME}", shell=True, check=True)
                        
                        pr_title = f"feat(issue-{ISSUE_NUMBER}): {ISSUE_TITLE}"
                        pr_body = f"Resolves #{ISSUE_NUMBER}\\n\\nThis PR was automatically generated by Gemini.\\n\\nAgent's final message:\\n{agent_response.get('message', 'No message')}"
                        
                        # Create PR link instead of automatic PR
                        import urllib.parse
                        encoded_title = urllib.parse.quote(pr_title)
                        encoded_body = urllib.parse.quote(pr_body)
                        pr_link = f"https://github.com/yarlen27/gemini_agent/compare/main...{BRANCH_NAME}?quick_pull=1&title={encoded_title}&body={encoded_body}"
                        
                        logger.info(f"Pull Request link created: {pr_link}")
                        
                        # Edit the initial comment with the final result
                        comment_body = f"Gemini finished @{GITHUB_TOKEN.split('_')[0] if GITHUB_TOKEN else 'yarlen27'}'s task — [Create PR →]({pr_link})\\n\\n✅ **Completed**: {agent_response.get('message', 'Task completed successfully.')}"
                        
                        try:
                            if INITIAL_COMMENT_ID:
                                subprocess.run([
                                    "gh", "api", f"repos/yarlen27/gemini_agent/issues/comments/{INITIAL_COMMENT_ID}",
                                    "--method", "PATCH",
                                    "--field", f"body={comment_body}"
                                ], check=True)
                                logger.info(f"Edited initial comment {INITIAL_COMMENT_ID} with final result")
                            else:
                                # Fallback to creating new comment if no initial comment ID
                                subprocess.run([
                                    "gh", "issue", "comment", ISSUE_NUMBER, 
                                    "--body", comment_body
                                ], check=True)
                                logger.info(f"Created new comment on issue #{ISSUE_NUMBER} with PR link")
                        except subprocess.CalledProcessError as e:
                            logger.error(f"Failed to update comment: {e}")
                        
                        print(f"\\n🔗 Create Pull Request: {pr_link}")
                        print(f"\\n✅ Gemini finished: {agent_response.get('message', 'No message')}")
                    except subprocess.CalledProcessError as e:
                        logger.error(f"Error creating PR: {e}")
                        exit(1)
                    break
                # Continue processing the new response (not finish)
                continue  # Go back to the main loop to process the new action
            except requests.exceptions.RequestException as e:
                logger.critical(f"Error sending tool response: {e}")
                exit(1)
        elif action == "list_directory":
            logger.info(f"Agent requested to list directory: {agent_response.get('file_path', '.')}")
            path = agent_response.get("file_path", ".")
            tool_result = list_directory(path)
            
            # Send tool response immediately
            tool_response_body = {"conversation_id": conversation_id, "tool_response": tool_result}
            logger.info(f"Sending tool response: {json.dumps(tool_response_body, indent=2)}")
            try:
                response = requests.post(f"{GEMINI_AGENT_API_URL}/v1/github/execute", json=tool_response_body)
                response.raise_for_status()
                agent_response = response.json()
                logger.info(f"Received API Response after tool: {json.dumps(agent_response, indent=2)}")
                conversation_id = agent_response["conversation_id"]
                
                # Check if the response is finish, then break the loop
                if agent_response.get("action") == "finish":
                    logger.info(f"Agent finished with message: {agent_response.get('message', 'No message')}")
                    # Commit changes and create PR
                    try:
                        subprocess.run("git add .", shell=True, check=True)
                        subprocess.run(["git", "commit", "-m", f"feat: Resolves #{ISSUE_NUMBER} - {ISSUE_TITLE}"], check=True)
                        subprocess.run(f"git push origin {BRANCH_NAME}", shell=True, check=True)
                        
                        pr_title = f"feat(issue-{ISSUE_NUMBER}): {ISSUE_TITLE}"
                        pr_body = f"Resolves #{ISSUE_NUMBER}\\n\\nThis PR was automatically generated by Gemini.\\n\\nAgent's final message:\\n{agent_response.get('message', 'Task completed successfully.')}"
                        
                        # Create PR link instead of automatic PR
                        import urllib.parse
                        encoded_title = urllib.parse.quote(pr_title)
                        encoded_body = urllib.parse.quote(pr_body)
                        pr_link = f"https://github.com/yarlen27/gemini_agent/compare/main...{BRANCH_NAME}?quick_pull=1&title={encoded_title}&body={encoded_body}"
                        
                        logger.info(f"Pull Request link created: {pr_link}")
                        
                        # Edit the initial comment with the final result
                        comment_body = f"Gemini finished @{GITHUB_TOKEN.split('_')[0] if GITHUB_TOKEN else 'yarlen27'}'s task — [Create PR →]({pr_link})\\n\\n✅ **Completed**: {agent_response.get('message', 'Task completed successfully.')}"
                        
                        try:
                            if INITIAL_COMMENT_ID:
                                subprocess.run([
                                    "gh", "api", f"repos/yarlen27/gemini_agent/issues/comments/{INITIAL_COMMENT_ID}",
                                    "--method", "PATCH",
                                    "--field", f"body={comment_body}"
                                ], check=True)
                                logger.info(f"Edited initial comment {INITIAL_COMMENT_ID} with final result")
                            else:
                                # Fallback to creating new comment if no initial comment ID
                                subprocess.run([
                                    "gh", "issue", "comment", ISSUE_NUMBER, 
                                    "--body", comment_body
                                ], check=True)
                                logger.info(f"Created new comment on issue #{ISSUE_NUMBER} with PR link")
                        except subprocess.CalledProcessError as e:
                            logger.error(f"Failed to update comment: {e}")
                        
                        print(f"\\n🔗 Create Pull Request: {pr_link}")
                        print(f"\\n✅ Gemini finished: {agent_response.get('message', 'No message')}")
                    except subprocess.CalledProcessError as e:
                        logger.error(f"Error creating PR: {e}")
                        exit(1)
                    break
                # Continue processing the new response (not finish)
                continue  # Go back to the main loop to process the new action
            except requests.exceptions.RequestException as e:
                logger.critical(f"Error sending tool response: {e}")
                exit(1)
        elif action == "glob_files":
            logger.info(f"Agent requested to find files: pattern='{agent_response.get('content', '')}', path='{agent_response.get('file_path', '.')}'")
            pattern = agent_response.get("content", "")
            path = agent_response.get("file_path", ".")
            tool_result = glob_files(pattern, path)
            
            # Send tool response immediately
            tool_response_body = {"conversation_id": conversation_id, "tool_response": tool_result}
            logger.info(f"Sending tool response: {json.dumps(tool_response_body, indent=2)}")
            try:
                response = requests.post(f"{GEMINI_AGENT_API_URL}/v1/github/execute", json=tool_response_body)
                response.raise_for_status()
                agent_response = response.json()
                logger.info(f"Received API Response after tool: {json.dumps(agent_response, indent=2)}")
                conversation_id = agent_response["conversation_id"]
                
                # Check if the response is finish, then break the loop
                if agent_response.get("action") == "finish":
                    logger.info(f"Agent finished with message: {agent_response.get('message', 'No message')}")
                    # Commit changes and create PR
                    try:
                        subprocess.run("git add .", shell=True, check=True)
                        subprocess.run(["git", "commit", "-m", f"feat: Resolves #{ISSUE_NUMBER} - {ISSUE_TITLE}"], check=True)
                        subprocess.run(f"git push origin {BRANCH_NAME}", shell=True, check=True)
                        
                        pr_title = f"feat(issue-{ISSUE_NUMBER}): {ISSUE_TITLE}"
                        pr_body = f"Resolves #{ISSUE_NUMBER}\\n\\nThis PR was automatically generated by Gemini.\\n\\nAgent's final message:\\n{agent_response.get('message', 'Task completed successfully.')}"
                        
                        # Create PR link instead of automatic PR
                        import urllib.parse
                        encoded_title = urllib.parse.quote(pr_title)
                        encoded_body = urllib.parse.quote(pr_body)
                        pr_link = f"https://github.com/yarlen27/gemini_agent/compare/main...{BRANCH_NAME}?quick_pull=1&title={encoded_title}&body={encoded_body}"
                        
                        logger.info(f"Pull Request link created: {pr_link}")
                        
                        # Edit the initial comment with the final result
                        comment_body = f"Gemini finished @{GITHUB_TOKEN.split('_')[0] if GITHUB_TOKEN else 'yarlen27'}'s task — [Create PR →]({pr_link})\\n\\n✅ **Completed**: {agent_response.get('message', 'Task completed successfully.')}"
                        
                        try:
                            if INITIAL_COMMENT_ID:
                                subprocess.run([
                                    "gh", "api", f"repos/yarlen27/gemini_agent/issues/comments/{INITIAL_COMMENT_ID}",
                                    "--method", "PATCH",
                                    "--field", f"body={comment_body}"
                                ], check=True)
                                logger.info(f"Edited initial comment {INITIAL_COMMENT_ID} with final result")
                            else:
                                # Fallback to creating new comment if no initial comment ID
                                subprocess.run([
                                    "gh", "issue", "comment", ISSUE_NUMBER, 
                                    "--body", comment_body
                                ], check=True)
                                logger.info(f"Created new comment on issue #{ISSUE_NUMBER} with PR link")
                        except subprocess.CalledProcessError as e:
                            logger.error(f"Failed to update comment: {e}")
                        
                        print(f"\\n🔗 Create Pull Request: {pr_link}")
                        print(f"\\n✅ Gemini finished: {agent_response.get('message', 'No message')}")
                    except subprocess.CalledProcessError as e:
                        logger.error(f"Error creating PR: {e}")
                        exit(1)
                    break
                # Continue processing the new response (not finish)
                continue  # Go back to the main loop to process the new action
            except requests.exceptions.RequestException as e:
                logger.critical(f"Error sending tool response: {e}")
                exit(1)
        elif action == "grep_content":
            logger.info(f"Agent requested to search content: pattern='{agent_response.get('content', '')}', path='{agent_response.get('file_path', '.')}'")
            pattern = agent_response.get("content", "")
            path = agent_response.get("file_path", ".")
            file_type = agent_response.get("command", "")
            tool_result = grep_content(pattern, path, file_type)
            
            # Send tool response immediately
            tool_response_body = {"conversation_id": conversation_id, "tool_response": tool_result}
            logger.info(f"Sending tool response: {json.dumps(tool_response_body, indent=2)}")
            try:
                response = requests.post(f"{GEMINI_AGENT_API_URL}/v1/github/execute", json=tool_response_body)
                response.raise_for_status()
                agent_response = response.json()
                logger.info(f"Received API Response after tool: {json.dumps(agent_response, indent=2)}")
                conversation_id = agent_response["conversation_id"]
                
                # Check if the response is finish, then break the loop
                if agent_response.get("action") == "finish":
                    logger.info(f"Agent finished with message: {agent_response.get('message', 'No message')}")
                    # Commit changes and create PR
                    try:
                        subprocess.run("git add .", shell=True, check=True)
                        subprocess.run(["git", "commit", "-m", f"feat: Resolves #{ISSUE_NUMBER} - {ISSUE_TITLE}"], check=True)
                        subprocess.run(f"git push origin {BRANCH_NAME}", shell=True, check=True)
                        
                        pr_title = f"feat(issue-{ISSUE_NUMBER}): {ISSUE_TITLE}"
                        pr_body = f"Resolves #{ISSUE_NUMBER}\\n\\nThis PR was automatically generated by Gemini.\\n\\nAgent's final message:\\n{agent_response.get('message', 'Task completed successfully.')}"
                        
                        # Create PR link instead of automatic PR
                        import urllib.parse
                        encoded_title = urllib.parse.quote(pr_title)
                        encoded_body = urllib.parse.quote(pr_body)
                        pr_link = f"https://github.com/yarlen27/gemini_agent/compare/main...{BRANCH_NAME}?quick_pull=1&title={encoded_title}&body={encoded_body}"
                        
                        logger.info(f"Pull Request link created: {pr_link}")
                        
                        # Edit the initial comment with the final result
                        comment_body = f"Gemini finished @{GITHUB_TOKEN.split('_')[0] if GITHUB_TOKEN else 'yarlen27'}'s task — [Create PR →]({pr_link})\\n\\n✅ **Completed**: {agent_response.get('message', 'Task completed successfully.')}"
                        
                        try:
                            if INITIAL_COMMENT_ID:
                                subprocess.run([
                                    "gh", "api", f"repos/yarlen27/gemini_agent/issues/comments/{INITIAL_COMMENT_ID}",
                                    "--method", "PATCH",
                                    "--field", f"body={comment_body}"
                                ], check=True)
                                logger.info(f"Edited initial comment {INITIAL_COMMENT_ID} with final result")
                            else:
                                # Fallback to creating new comment if no initial comment ID
                                subprocess.run([
                                    "gh", "issue", "comment", ISSUE_NUMBER, 
                                    "--body", comment_body
                                ], check=True)
                                logger.info(f"Created new comment on issue #{ISSUE_NUMBER} with PR link")
                        except subprocess.CalledProcessError as e:
                            logger.error(f"Failed to update comment: {e}")
                        
                        print(f"\\n🔗 Create Pull Request: {pr_link}")
                        print(f"\\n✅ Gemini finished: {agent_response.get('message', 'No message')}")
                    except subprocess.CalledProcessError as e:
                        logger.error(f"Error creating PR: {e}")
                        exit(1)
                    break
                # Continue processing the new response (not finish)
                continue  # Go back to the main loop to process the new action
            except requests.exceptions.RequestException as e:
                logger.critical(f"Error sending tool response: {e}")
                exit(1)
        else:
            logger.error(f"Unknown action: {action}")
            break

    except requests.exceptions.RequestException as e:
        logger.critical(f"Error making API call: {e}")
        exit(1)

logger.info(f"--- Client Script Finished ---")
