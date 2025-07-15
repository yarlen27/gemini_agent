import os
from github import Github

# Configuration
REPO_OWNER = "yarlen27"
REPO_NAME = "gemini_agent"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

NOTICE_TEXT = """
---
**Important:** Please read the [CONTRIBUTING.md](https://github.com/yarlen27/gemini_agent/blob/main/CONTRIBUTING.md) file for guidelines on setting up your development environment, workflow, and coding standards before starting work on this issue.
"""

def update_github_issues():
    if not GITHUB_TOKEN:
        print("Error: GITHUB_TOKEN environment variable not set.")
        print("Please set it with your GitHub Personal Access Token.")
        return

    try:
        g = Github(GITHUB_TOKEN)
        repo = g.get_user(REPO_OWNER).get_repo(REPO_NAME)
        print(f"Connected to repository: {repo.full_name}")

        # Fetch all open issues (or you can specify a range if needed)
        issues = repo.get_issues(state='open')

        for issue in issues:
            print(f"Processing Issue #{issue.number}: {issue.title}")
            current_body = issue.body if issue.body else ""

            if NOTICE_TEXT not in current_body:
                new_body = current_body + "\n" + NOTICE_TEXT
                issue.edit(body=new_body)
                print(f"  - Successfully updated Issue #{issue.number}.")
            else:
                print(f"  - Notice already present in Issue #{issue.number}. Skipping.")

        print("\nAll issues processed.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    update_github_issues()
