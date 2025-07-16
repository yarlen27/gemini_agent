"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShellTool = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ShellTool {
    constructor() {
        this.name = 'run_shell_command';
    }
    async execute(args, context) {
        try {
            if (!args.command || args.command.trim() === '') {
                return {
                    success: false,
                    error: 'Command cannot be empty'
                };
            }
            // Set execution options with working directory if provided
            const execOptions = {};
            if (context?.workingDirectory) {
                execOptions.cwd = context.workingDirectory;
            }
            const { stdout, stderr } = await execAsync(args.command, execOptions);
            return {
                success: true,
                stdout: stdout.toString(),
                stderr: stderr.toString(),
                exitCode: 0
            };
        }
        catch (error) {
            return {
                success: false,
                stdout: error.stdout || '',
                stderr: error.stderr || error.message,
                exitCode: error.code || 1
            };
        }
    }
}
exports.ShellTool = ShellTool;
//# sourceMappingURL=ShellTool.js.map