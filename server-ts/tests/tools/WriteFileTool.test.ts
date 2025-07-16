import { WriteFileTool } from '../../src/tools/implementations/WriteFileTool';
import { ToolResult } from '../../src/models/ToolResult';
import { readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('WriteFileTool', () => {
    let writeFileTool: WriteFileTool;
    const testDir = join(__dirname, 'test-files');
    const testFile = join(testDir, 'test.txt');

    beforeEach(() => {
        writeFileTool = new WriteFileTool();
        // Clean up before each test
        rmSync(testDir, { recursive: true, force: true });
    });

    afterEach(() => {
        try {
            rmSync(testDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    test('should have correct name', () => {
        expect(writeFileTool.name).toBe('write_file');
    });

    test('should write file successfully', async () => {
        const content = 'Hello, World!\nThis is a test file.';
        const args = { file_path: testFile, content };
        
        const result: ToolResult = await writeFileTool.execute(args);

        if (!result.success) {
            console.log('Error:', result.error);
        }

        expect(result.success).toBe(true);
        expect(result.data).toContain('File written successfully');
        expect(existsSync(testFile)).toBe(true);
        expect(readFileSync(testFile, 'utf-8')).toBe(content);
    });

    test('should create directory if not exists', async () => {
        const nestedFile = join(testDir, 'nested', 'deep', 'file.txt');
        const content = 'Nested file content';
        const args = { file_path: nestedFile, content };

        const result: ToolResult = await writeFileTool.execute(args);

        expect(result.success).toBe(true);
        expect(existsSync(nestedFile)).toBe(true);
        expect(readFileSync(nestedFile, 'utf-8')).toBe(content);
    });

    test('should handle empty file path', async () => {
        const args = { file_path: '', content: 'test' };
        const result: ToolResult = await writeFileTool.execute(args);

        expect(result.success).toBe(false);
        expect(result.error).toContain('File path cannot be empty');
    });

    test('should handle empty content', async () => {
        const args = { file_path: testFile, content: '' };
        const result: ToolResult = await writeFileTool.execute(args);

        expect(result.success).toBe(true);
        expect(existsSync(testFile)).toBe(true);
        expect(readFileSync(testFile, 'utf-8')).toBe('');
    });

    test('should overwrite existing file', async () => {
        const originalContent = 'Original content';
        const newContent = 'New content';
        
        // Write original file
        await writeFileTool.execute({ file_path: testFile, content: originalContent });
        expect(readFileSync(testFile, 'utf-8')).toBe(originalContent);

        // Overwrite with new content
        const result = await writeFileTool.execute({ file_path: testFile, content: newContent });
        
        expect(result.success).toBe(true);
        expect(readFileSync(testFile, 'utf-8')).toBe(newContent);
    });

    test('should handle large content', async () => {
        const largeContent = 'A'.repeat(10000);
        const args = { file_path: testFile, content: largeContent };

        const result: ToolResult = await writeFileTool.execute(args);

        expect(result.success).toBe(true);
        expect(readFileSync(testFile, 'utf-8')).toBe(largeContent);
    });
});