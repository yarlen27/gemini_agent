import { ReadFileTool } from '../../src/tools/implementations/ReadFileTool';
import { ToolResult } from '../../src/models/ToolResult';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('ReadFileTool', () => {
    let readFileTool: ReadFileTool;
    const testDir = join(__dirname, 'test-files');
    const testFile = join(testDir, 'test.txt');

    beforeEach(() => {
        readFileTool = new ReadFileTool();
        // Clean up before each test
        rmSync(testDir, { recursive: true, force: true });
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    test('should have correct name', () => {
        expect(readFileTool.name).toBe('read_file');
    });

    test('should read file successfully', async () => {
        const content = 'Hello, World!\nThis is a test file.';
        writeFileSync(testFile, content);

        const args = { file_path: testFile };
        const result: ToolResult = await readFileTool.execute(args);

        expect(result.success).toBe(true);
        expect(result.data).toBe(content);
    });

    test('should handle non-existent file', async () => {
        const args = { file_path: '/non/existent/file.txt' };
        const result: ToolResult = await readFileTool.execute(args);

        expect(result.success).toBe(false);
        expect(result.error).toContain('File not found');
    });

    test('should handle empty file path', async () => {
        const args = { file_path: '' };
        const result: ToolResult = await readFileTool.execute(args);

        expect(result.success).toBe(false);
        expect(result.error).toContain('File path cannot be empty');
    });

    test('should handle empty file', async () => {
        writeFileSync(testFile, '');

        const args = { file_path: testFile };
        const result: ToolResult = await readFileTool.execute(args);

        expect(result.success).toBe(true);
        expect(result.data).toBe('');
    });

    test('should handle large file', async () => {
        const largeContent = 'A'.repeat(10000);
        writeFileSync(testFile, largeContent);

        const args = { file_path: testFile };
        const result: ToolResult = await readFileTool.execute(args);

        expect(result.success).toBe(true);
        expect(result.data).toBe(largeContent);
    });
});