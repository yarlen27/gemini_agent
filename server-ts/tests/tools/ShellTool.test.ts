import { ShellTool } from '../../src/tools/implementations/ShellTool';
import { ToolResult } from '../../src/models/ToolResult';

describe('ShellTool', () => {
    let shellTool: ShellTool;

    beforeEach(() => {
        shellTool = new ShellTool();
    });

    test('should have correct name', () => {
        expect(shellTool.name).toBe('run_shell_command');
    });

    test('should execute simple command successfully', async () => {
        const args = { command: 'echo "Hello World"' };
        const result: ToolResult = await shellTool.execute(args);

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Hello World');
        expect(result.exitCode).toBe(0);
    });

    test('should handle command with error', async () => {
        const args = { command: 'invalidcommand123' };
        const result: ToolResult = await shellTool.execute(args);

        expect(result.success).toBe(false);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toBeTruthy();
    });

    test('should handle empty command', async () => {
        const args = { command: '' };
        const result: ToolResult = await shellTool.execute(args);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Command cannot be empty');
    });

    test('should execute ls command', async () => {
        const args = { command: 'ls -la' };
        const result: ToolResult = await shellTool.execute(args);

        expect(result.success).toBe(true);
        expect(result.stdout).toBeTruthy();
        expect(result.exitCode).toBe(0);
    });
});