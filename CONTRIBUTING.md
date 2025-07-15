# Contributing to Gemini Agent

We welcome contributions to the Gemini Agent project! To ensure a smooth and collaborative development process, please follow these guidelines.

## Getting Started

1.  **Fork the Repository:** Start by forking the `gemini_agent` repository to your GitHub account.
2.  **Clone Your Fork:** Clone your forked repository to your local machine.
    ```bash
    git clone https://github.com/YOUR_USERNAME/gemini_agent.git
    cd gemini_agent
    ```
3.  **Set Up Development Environment:**
    This project uses Docker Compose to manage its services (API and Redis).
    ```bash
    docker-compose up --build -d
    ```
    This command will build the `api` service image, pull the `redis` image, and start both containers in detached mode.

## Workflow

1.  **Choose an Issue:**
    *   Browse the [Issues](https://github.com/yarlen27/gemini_agent/issues) section of the repository.
    *   Select an issue that is not assigned and that you'd like to work on.
    *   Assign yourself to the issue to indicate you're working on it.

2.  **Create a New Branch:**
    *   Always create a new branch for your changes. Use a descriptive name, typically in the format `feat/issue-XX-short-description` or `fix/issue-XX-short-description`.
    ```bash
    git checkout main
    git pull origin main # Ensure your main branch is up-to-date
    git checkout -b feat/issue-XX-your-feature-name
    ```

3.  **Make Your Changes:**
    *   Implement the changes required by the issue.
    *   Adhere to the project's coding standards (see "Coding Standards" below).

4.  **Test Your Changes:**
    *   Ensure your changes work as expected.
    *   Run existing tests and add new tests if applicable. (Testing framework will be added later).

5.  **Commit Your Changes:**
    *   Commit your changes with a clear and concise commit message. We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
    *   Example: `feat: Implement Pydantic models for API request/response`
    ```bash
    git add .
    git commit -m "feat: Your commit message"
    ```

6.  **Push Your Branch:**
    ```bash
    git push origin your-branch-name
    ```

7.  **Open a Pull Request (PR):**
    *   Go to the GitHub repository page and open a new Pull Request from your branch to the `main` branch.
    *   Reference the issue you are closing in the PR description (e.g., `Closes #XX`).
    *   Provide a clear description of your changes.

## Coding Standards

*   **Python Formatting:** We use `black` for Python code formatting. Please run `black .` before committing your changes.
*   **Linting:** (To be defined: e.g., `flake8`, `ruff`)
*   **Type Hinting:** Use type hints for all function arguments and return values.

## Running Tests

(Instructions for running tests will be added here once a testing framework is set up.)

## Need Help?

If you have any questions or get stuck, feel free to ask in the issue comments or open a new discussion.
