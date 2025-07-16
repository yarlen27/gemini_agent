import { ITool } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ShellTool implements ITool {
    public readonly name = 'run_shell_command';

    public async execute(args: { command: string }): Promise<ToolResult> {
        try {
            if (!args.command || args.command.trim() === '') {
                return {
                    success: false,
                    error: 'Command cannot be empty'
                };
            }

            const { stdout, stderr } = await execAsync(args.command);
            
            return {
                success: true,
                stdout: stdout,
                stderr: stderr,
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