import { ITool, ToolContext } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ShellTool implements ITool {
    public readonly name = 'run_shell_command';

    public async execute(args: { command: string }, context?: ToolContext): Promise<ToolResult> {
        try {
            if (!args.command || args.command.trim() === '') {
                return {
                    success: false,
                    error: 'Command cannot be empty'
                };
            }

            // Set execution options with working directory if provided
            const execOptions: any = {};
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
        } catch (error: any) {
            return {
                success: false,
                stdout: error.stdout || '',
                stderr: error.stderr || error.message,
                exitCode: error.code || 1
            };
        }
    }
}