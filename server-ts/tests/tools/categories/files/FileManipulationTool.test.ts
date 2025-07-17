import { CopyFileToDirectoryTool } from '../../../../src/tools/implementations/categories/files/CopyFileToDirectoryTool';
import { RenameFileWithPatternTool } from '../../../../src/tools/implementations/categories/files/RenameFileWithPatternTool';
import { DeleteFilesByExtensionTool } from '../../../../src/tools/implementations/categories/files/DeleteFilesByExtensionTool';
import { CreateDirectoryStructureTool } from '../../../../src/tools/implementations/categories/files/CreateDirectoryStructureTool';
import { SearchTextInFilesTool } from '../../../../src/tools/implementations/categories/files/SearchTextInFilesTool';
import { ToolResult } from '../../../../src/models/ToolResult';
import { ToolContext } from '../../../../src/tools/interfaces/ITool';
import { writeFileSync, unlinkSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

describe('File Manipulation Tools', () => {
    const testDir = join(__dirname, 'test-files');
    const context: ToolContext = { workingDirectory: testDir };

    beforeEach(() => {
        // Clean up before each test
        rmSync(testDir, { recursive: true, force: true });
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    describe('CopyFileToDirectoryTool', () => {
        let copyTool: CopyFileToDirectoryTool;

        beforeEach(() => {
            copyTool = new CopyFileToDirectoryTool();
        });

        test('should have correct name', () => {
            expect(copyTool.name).toBe('copy_file_to_directory');
        });

        test('should copy file successfully', async () => {
            // Setup
            const sourceFile = join(testDir, 'source.txt');
            const targetDir = join(testDir, 'target');
            const content = 'Hello, World!';
            
            writeFileSync(sourceFile, content);

            // Execute
            const result: ToolResult = await copyTool.execute({
                source_path: 'source.txt',
                target_directory: 'target'
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(result.data.target_path).toBe(join(targetDir, 'source.txt'));
            expect(existsSync(join(targetDir, 'source.txt'))).toBe(true);
            expect(readFileSync(join(targetDir, 'source.txt'), 'utf-8')).toBe(content);
        });

        test('should handle missing source file', async () => {
            const result: ToolResult = await copyTool.execute({
                source_path: 'nonexistent.txt',
                target_directory: 'target'
            }, context);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Source file does not exist');
        });

        test('should handle existing target file without overwrite', async () => {
            // Setup
            const sourceFile = join(testDir, 'source.txt');
            const targetDir = join(testDir, 'target');
            const targetFile = join(targetDir, 'source.txt');
            
            writeFileSync(sourceFile, 'source content');
            mkdirSync(targetDir, { recursive: true });
            writeFileSync(targetFile, 'existing content');

            // Execute
            const result: ToolResult = await copyTool.execute({
                source_path: 'source.txt',
                target_directory: 'target'
            }, context);

            // Verify
            expect(result.success).toBe(false);
            expect(result.error).toContain('Target file already exists');
        });

        test('should overwrite existing target file when overwrite is true', async () => {
            // Setup
            const sourceFile = join(testDir, 'source.txt');
            const targetDir = join(testDir, 'target');
            const targetFile = join(targetDir, 'source.txt');
            
            writeFileSync(sourceFile, 'new content');
            mkdirSync(targetDir, { recursive: true });
            writeFileSync(targetFile, 'old content');

            // Execute
            const result: ToolResult = await copyTool.execute({
                source_path: 'source.txt',
                target_directory: 'target',
                overwrite: true
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(readFileSync(targetFile, 'utf-8')).toBe('new content');
        });

        test('should handle missing parameters', async () => {
            const result: ToolResult = await copyTool.execute({
                source_path: 'source.txt',
                target_directory: ''
            }, context);

            expect(result.success).toBe(false);
            expect(result.error).toContain('source_path and target_directory are required');
        });
    });

    describe('RenameFileWithPatternTool', () => {
        let renameTool: RenameFileWithPatternTool;

        beforeEach(() => {
            renameTool = new RenameFileWithPatternTool();
        });

        test('should have correct name', () => {
            expect(renameTool.name).toBe('rename_file_with_pattern');
        });

        test('should rename file successfully', async () => {
            // Setup
            const sourceFile = join(testDir, 'test_file.txt');
            const content = 'Hello, World!';
            
            writeFileSync(sourceFile, content);

            // Execute
            const result: ToolResult = await renameTool.execute({
                file_path: 'test_file.txt',
                pattern: 'test_',
                replacement: 'renamed_'
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(result.data.new_path).toBe(join(testDir, 'renamed_file.txt'));
            expect(existsSync(join(testDir, 'renamed_file.txt'))).toBe(true);
            expect(existsSync(sourceFile)).toBe(false);
        });

        test('should handle pattern that does not match', async () => {
            // Setup
            const sourceFile = join(testDir, 'test_file.txt');
            writeFileSync(sourceFile, 'content');

            // Execute
            const result: ToolResult = await renameTool.execute({
                file_path: 'test_file.txt',
                pattern: 'nomatch',
                replacement: 'replaced'
            }, context);

            // Verify
            expect(result.success).toBe(false);
            expect(result.error).toContain('Pattern \'nomatch\' did not match anything');
        });

        test('should create backup when requested', async () => {
            // Setup
            const sourceFile = join(testDir, 'test_file.txt');
            const content = 'Hello, World!';
            
            writeFileSync(sourceFile, content);

            // Execute
            const result: ToolResult = await renameTool.execute({
                file_path: 'test_file.txt',
                pattern: 'test_',
                replacement: 'renamed_',
                backup_original: true
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(existsSync(join(testDir, 'renamed_file.txt'))).toBe(true);
            expect(existsSync(join(testDir, 'test_file.txt.backup'))).toBe(true);
            expect(readFileSync(join(testDir, 'test_file.txt.backup'), 'utf-8')).toBe(content);
        });

        test('should handle missing file', async () => {
            const result: ToolResult = await renameTool.execute({
                file_path: 'nonexistent.txt',
                pattern: 'test',
                replacement: 'renamed'
            }, context);

            expect(result.success).toBe(false);
            expect(result.error).toContain('File does not exist');
        });
    });

    describe('DeleteFilesByExtensionTool', () => {
        let deleteTool: DeleteFilesByExtensionTool;

        beforeEach(() => {
            deleteTool = new DeleteFilesByExtensionTool();
        });

        test('should have correct name', () => {
            expect(deleteTool.name).toBe('delete_files_by_extension');
        });

        test('should delete files by extension', async () => {
            // Setup
            const txtFile1 = join(testDir, 'file1.txt');
            const txtFile2 = join(testDir, 'file2.txt');
            const jsFile = join(testDir, 'file3.js');
            
            writeFileSync(txtFile1, 'content1');
            writeFileSync(txtFile2, 'content2');
            writeFileSync(jsFile, 'content3');

            // Execute
            const result: ToolResult = await deleteTool.execute({
                directory: '.',
                extension: 'txt',
                confirm_deletion: true
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(result.data.total_count).toBe(2);
            expect(existsSync(txtFile1)).toBe(false);
            expect(existsSync(txtFile2)).toBe(false);
            expect(existsSync(jsFile)).toBe(true);
        });

        test('should handle dry run', async () => {
            // Setup
            const txtFile = join(testDir, 'file1.txt');
            writeFileSync(txtFile, 'content');

            // Execute
            const result: ToolResult = await deleteTool.execute({
                directory: '.',
                extension: 'txt',
                dry_run: true,
                confirm_deletion: true
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(result.data.dry_run).toBe(true);
            expect(result.data.total_count).toBe(1);
            expect(existsSync(txtFile)).toBe(true); // File should still exist
        });

        test('should require confirm_deletion', async () => {
            const result: ToolResult = await deleteTool.execute({
                directory: '.',
                extension: 'txt',
                confirm_deletion: false
            }, context);

            expect(result.success).toBe(false);
            expect(result.error).toContain('confirm_deletion must be true');
        });

        test('should handle recursive deletion', async () => {
            // Setup
            const subDir = join(testDir, 'subdir');
            mkdirSync(subDir, { recursive: true });
            
            const txtFile1 = join(testDir, 'file1.txt');
            const txtFile2 = join(subDir, 'file2.txt');
            
            writeFileSync(txtFile1, 'content1');
            writeFileSync(txtFile2, 'content2');

            // Execute
            const result: ToolResult = await deleteTool.execute({
                directory: '.',
                extension: 'txt',
                recursive: true,
                confirm_deletion: true
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(result.data.total_count).toBe(2);
            expect(existsSync(txtFile1)).toBe(false);
            expect(existsSync(txtFile2)).toBe(false);
        });

        test('should handle non-existent directory', async () => {
            const result: ToolResult = await deleteTool.execute({
                directory: 'nonexistent',
                extension: 'txt',
                confirm_deletion: true
            }, context);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Directory does not exist');
        });
    });

    describe('CreateDirectoryStructureTool', () => {
        let createTool: CreateDirectoryStructureTool;

        beforeEach(() => {
            createTool = new CreateDirectoryStructureTool();
        });

        test('should have correct name', () => {
            expect(createTool.name).toBe('create_directory_structure');
        });

        test('should create directory structure from array', async () => {
            // Execute
            const result: ToolResult = await createTool.execute({
                base_path: '.',
                structure: ['src', 'tests', 'docs']
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(result.data.total_count).toBe(3);
            expect(existsSync(join(testDir, 'src'))).toBe(true);
            expect(existsSync(join(testDir, 'tests'))).toBe(true);
            expect(existsSync(join(testDir, 'docs'))).toBe(true);
        });

        test('should create directory structure from object', async () => {
            // Execute
            const result: ToolResult = await createTool.execute({
                base_path: '.',
                structure: {
                    src: {
                        components: {},
                        services: {}
                    },
                    tests: {}
                }
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(result.data.total_count).toBe(4);
            expect(existsSync(join(testDir, 'src'))).toBe(true);
            expect(existsSync(join(testDir, 'src', 'components'))).toBe(true);
            expect(existsSync(join(testDir, 'src', 'services'))).toBe(true);
            expect(existsSync(join(testDir, 'tests'))).toBe(true);
        });

        test('should create .gitkeep files when requested', async () => {
            // Execute
            const result: ToolResult = await createTool.execute({
                base_path: '.',
                structure: ['src', 'tests'],
                create_gitkeep: true
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(existsSync(join(testDir, 'src', '.gitkeep'))).toBe(true);
            expect(existsSync(join(testDir, 'tests', '.gitkeep'))).toBe(true);
        });

        test('should handle nested paths', async () => {
            // Execute
            const result: ToolResult = await createTool.execute({
                base_path: '.',
                structure: ['src/components/ui', 'tests/unit/services']
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(existsSync(join(testDir, 'src', 'components', 'ui'))).toBe(true);
            expect(existsSync(join(testDir, 'tests', 'unit', 'services'))).toBe(true);
        });

        test('should handle missing parameters', async () => {
            const result: ToolResult = await createTool.execute({
                base_path: '.',
                structure: []
            }, context);

            expect(result.success).toBe(true);
            expect(result.data.total_count).toBe(0);
        });
    });

    describe('SearchTextInFilesTool', () => {
        let searchTool: SearchTextInFilesTool;

        beforeEach(() => {
            searchTool = new SearchTextInFilesTool();
        });

        test('should have correct name', () => {
            expect(searchTool.name).toBe('search_text_in_files');
        });

        test('should search text in files', async () => {
            // Setup
            const file1 = join(testDir, 'file1.txt');
            const file2 = join(testDir, 'file2.txt');
            
            writeFileSync(file1, 'Hello World\nThis is a test');
            writeFileSync(file2, 'Another test file\nHello Universe');

            // Execute
            const result: ToolResult = await searchTool.execute({
                directory: '.',
                search_pattern: 'Hello'
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(result.data.total_matches).toBe(2);
            expect(result.data.results).toHaveLength(2);
            expect(result.data.results[0].line_content).toContain('Hello');
            expect(result.data.results[1].line_content).toContain('Hello');
        });

        test('should handle case sensitivity', async () => {
            // Setup
            const file1 = join(testDir, 'file1.txt');
            writeFileSync(file1, 'Hello World\nhello world');

            // Execute case sensitive
            const result1: ToolResult = await searchTool.execute({
                directory: '.',
                search_pattern: 'Hello',
                case_sensitive: true
            }, context);

            // Execute case insensitive
            const result2: ToolResult = await searchTool.execute({
                directory: '.',
                search_pattern: 'Hello',
                case_sensitive: false
            }, context);

            // Verify
            expect(result1.success).toBe(true);
            expect(result1.data.total_matches).toBe(1);
            expect(result2.success).toBe(true);
            expect(result2.data.total_matches).toBe(2);
        });

        test('should filter by file extensions', async () => {
            // Setup
            const txtFile = join(testDir, 'file1.txt');
            const jsFile = join(testDir, 'file2.js');
            
            writeFileSync(txtFile, 'Hello World');
            writeFileSync(jsFile, 'Hello Universe');

            // Execute
            const result: ToolResult = await searchTool.execute({
                directory: '.',
                search_pattern: 'Hello',
                file_extensions: ['txt']
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(result.data.total_matches).toBe(1);
            expect(result.data.results[0].file_path).toContain('file1.txt');
        });

        test('should handle recursive search', async () => {
            // Setup
            const subDir = join(testDir, 'subdir');
            mkdirSync(subDir, { recursive: true });
            
            const file1 = join(testDir, 'file1.txt');
            const file2 = join(subDir, 'file2.txt');
            
            writeFileSync(file1, 'Hello World');
            writeFileSync(file2, 'Hello Universe');

            // Execute with recursive
            const result1: ToolResult = await searchTool.execute({
                directory: '.',
                search_pattern: 'Hello',
                recursive: true
            }, context);

            // Execute without recursive
            const result2: ToolResult = await searchTool.execute({
                directory: '.',
                search_pattern: 'Hello',
                recursive: false
            }, context);

            // Verify
            expect(result1.success).toBe(true);
            expect(result1.data.total_matches).toBe(2);
            expect(result2.success).toBe(true);
            expect(result2.data.total_matches).toBe(1);
        });

        test('should handle max results limit', async () => {
            // Setup
            const file1 = join(testDir, 'file1.txt');
            writeFileSync(file1, 'test\ntest\ntest\ntest\ntest');

            // Execute
            const result: ToolResult = await searchTool.execute({
                directory: '.',
                search_pattern: 'test',
                max_results: 3
            }, context);

            // Verify
            expect(result.success).toBe(true);
            expect(result.data.results).toHaveLength(3);
            expect(result.data.truncated).toBe(true);
        });

        test('should handle non-existent directory', async () => {
            const result: ToolResult = await searchTool.execute({
                directory: 'nonexistent',
                search_pattern: 'test'
            }, context);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Directory does not exist');
        });

        test('should handle missing parameters', async () => {
            const result: ToolResult = await searchTool.execute({
                directory: '.',
                search_pattern: ''
            }, context);

            expect(result.success).toBe(false);
            expect(result.error).toContain('directory and search_pattern are required');
        });
    });
});