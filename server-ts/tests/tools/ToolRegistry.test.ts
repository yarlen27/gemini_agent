import { ToolRegistry } from '../../src/tools/ToolRegistry';
import { ShellTool } from '../../src/tools/implementations/ShellTool';
import { ReadFileTool } from '../../src/tools/implementations/ReadFileTool';
import { WriteFileTool } from '../../src/tools/implementations/WriteFileTool';

describe('ToolRegistry', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
        registry = new ToolRegistry();
    });

    test('should register tools correctly', () => {
        const shellTool = new ShellTool();
        registry.register(shellTool);

        expect(registry.hasTool('run_shell_command')).toBe(true);
        expect(registry.getAvailableTools()).toContain('run_shell_command');
    });

    test('should execute registered tool', async () => {
        const shellTool = new ShellTool();
        registry.register(shellTool);

        const result = await registry.execute('run_shell_command', { command: 'echo "test"' });
        
        expect(result.success).toBe(true);
        expect(result.stdout).toContain('test');
    });

    test('should return error for unknown tool', async () => {
        const result = await registry.execute('unknown_tool', {});
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Tool \'unknown_tool\' not found');
    });

    test('should list available tools', () => {
        const shellTool = new ShellTool();
        const readTool = new ReadFileTool();
        const writeTool = new WriteFileTool();

        registry.register(shellTool);
        registry.register(readTool);
        registry.register(writeTool);

        const availableTools = registry.getAvailableTools();
        
        expect(availableTools).toHaveLength(3);
        expect(availableTools).toContain('run_shell_command');
        expect(availableTools).toContain('read_file');
        expect(availableTools).toContain('write_file');
    });

    test('should check if tool exists', () => {
        const shellTool = new ShellTool();
        registry.register(shellTool);

        expect(registry.hasTool('run_shell_command')).toBe(true);
        expect(registry.hasTool('nonexistent_tool')).toBe(false);
    });
});