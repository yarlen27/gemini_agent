"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManipulationTool = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const fs_1 = require("fs");
class FileManipulationTool {
    constructor() {
        this.name = 'file_manipulation';
        this.description = 'Provides file manipulation operations: copy, rename, delete, create directories, and search text in files';
        this.schema = {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    enum: ['copy_file_to_directory', 'rename_file_with_pattern', 'delete_files_by_extension', 'create_directory_structure', 'search_text_in_files']
                },
                // Parameters for each operation
                source_path: { type: 'string' },
                target_directory: { type: 'string' },
                overwrite: { type: 'boolean' },
                preserve_permissions: { type: 'boolean' },
                file_path: { type: 'string' },
                pattern: { type: 'string' },
                replacement: { type: 'string' },
                backup_original: { type: 'boolean' },
                directory: { type: 'string' },
                extension: { type: 'string' },
                recursive: { type: 'boolean' },
                dry_run: { type: 'boolean' },
                confirm_deletion: { type: 'boolean' },
                base_path: { type: 'string' },
                structure: {
                    oneOf: [
                        { type: 'array', items: { type: 'string' } },
                        { type: 'object' }
                    ]
                },
                create_gitkeep: { type: 'boolean' },
                search_pattern: { type: 'string' },
                file_extensions: { type: 'array', items: { type: 'string' } },
                case_sensitive: { type: 'boolean' },
                max_results: { type: 'number' }
            },
            required: ['operation'],
            additionalProperties: false
        };
    }
    async execute(params, context) {
        try {
            const { operation, ...args } = params;
            switch (operation) {
                case 'copy_file_to_directory':
                    return await this.copyFileToDirectory(args, context);
                case 'rename_file_with_pattern':
                    return await this.renameFileWithPattern(args, context);
                case 'delete_files_by_extension':
                    return await this.deleteFilesByExtension(args, context);
                case 'create_directory_structure':
                    return await this.createDirectoryStructure(args, context);
                case 'search_text_in_files':
                    return await this.searchTextInFiles(args, context);
                default:
                    return {
                        success: false,
                        error: `Unknown operation: ${operation}`
                    };
            }
        }
        catch (error) {
            return {
                success: false,
                error: `Error in ${this.name}: ${error.message}`
            };
        }
    }
    async copyFileToDirectory(params, context) {
        const { source_path, target_directory, overwrite = false, preserve_permissions = false } = params;
        if (!source_path || !target_directory) {
            return {
                success: false,
                error: 'source_path and target_directory are required'
            };
        }
        try {
            // Resolve paths relative to working directory
            const sourcePath = this.resolvePath(source_path, context);
            const targetDir = this.resolvePath(target_directory, context);
            const fileName = (0, path_1.basename)(sourcePath);
            const targetPath = (0, path_1.join)(targetDir, fileName);
            // Check if source file exists
            try {
                await (0, promises_1.access)(sourcePath, fs_1.constants.F_OK);
            }
            catch {
                return {
                    success: false,
                    error: `Source file does not exist: ${sourcePath}`
                };
            }
            // Create target directory if it doesn't exist
            await (0, promises_1.mkdir)(targetDir, { recursive: true });
            // Check if target file already exists
            try {
                await (0, promises_1.access)(targetPath, fs_1.constants.F_OK);
                if (!overwrite) {
                    return {
                        success: false,
                        error: `Target file already exists: ${targetPath}. Use overwrite: true to replace it.`
                    };
                }
            }
            catch {
                // Target file doesn't exist, which is fine
            }
            // Copy the file
            await (0, promises_1.copyFile)(sourcePath, targetPath);
            // Preserve permissions if requested
            if (preserve_permissions) {
                const sourceStats = await (0, promises_1.stat)(sourcePath);
                await (0, promises_2.chmod)(targetPath, sourceStats.mode);
            }
            return {
                success: true,
                data: {
                    source_path: sourcePath,
                    target_path: targetPath,
                    overwrite_occurred: overwrite
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to copy file: ${error.message}`
            };
        }
    }
    async renameFileWithPattern(params, context) {
        const { file_path, pattern, replacement, backup_original = false } = params;
        if (!file_path || !pattern || replacement === undefined) {
            return {
                success: false,
                error: 'file_path, pattern, and replacement are required'
            };
        }
        try {
            const filePath = this.resolvePath(file_path, context);
            const fileName = (0, path_1.basename)(filePath);
            const fileDir = (0, path_1.dirname)(filePath);
            // Check if file exists
            try {
                await (0, promises_1.access)(filePath, fs_1.constants.F_OK);
            }
            catch {
                return {
                    success: false,
                    error: `File does not exist: ${filePath}`
                };
            }
            // Apply pattern replacement
            const regex = new RegExp(pattern, 'g');
            const newFileName = fileName.replace(regex, replacement);
            if (newFileName === fileName) {
                return {
                    success: false,
                    error: `Pattern '${pattern}' did not match anything in filename '${fileName}'`
                };
            }
            const newFilePath = (0, path_1.join)(fileDir, newFileName);
            // Check if target file already exists
            try {
                await (0, promises_1.access)(newFilePath, fs_1.constants.F_OK);
                return {
                    success: false,
                    error: `Target file already exists: ${newFilePath}`
                };
            }
            catch {
                // Target file doesn't exist, which is fine
            }
            // Create backup if requested
            if (backup_original) {
                const backupPath = `${filePath}.backup`;
                await (0, promises_1.copyFile)(filePath, backupPath);
            }
            // Rename the file
            await (0, promises_2.rename)(filePath, newFilePath);
            return {
                success: true,
                data: {
                    original_path: filePath,
                    new_path: newFilePath,
                    backup_created: backup_original,
                    backup_path: backup_original ? `${filePath}.backup` : null
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to rename file: ${error.message}`
            };
        }
    }
    async deleteFilesByExtension(params, context) {
        const { directory, extension, recursive = false, dry_run = false, confirm_deletion } = params;
        if (!directory || !extension) {
            return {
                success: false,
                error: 'directory and extension are required'
            };
        }
        if (!confirm_deletion) {
            return {
                success: false,
                error: 'confirm_deletion must be true to proceed with file deletion'
            };
        }
        try {
            const dirPath = this.resolvePath(directory, context);
            // Check if directory exists
            try {
                await (0, promises_1.access)(dirPath, fs_1.constants.F_OK);
            }
            catch {
                return {
                    success: false,
                    error: `Directory does not exist: ${dirPath}`
                };
            }
            const filesToDelete = [];
            await this.findFilesByExtension(dirPath, extension, recursive, filesToDelete);
            if (filesToDelete.length === 0) {
                return {
                    success: true,
                    data: {
                        files_deleted: [],
                        total_count: 0,
                        dry_run: dry_run
                    }
                };
            }
            if (dry_run) {
                return {
                    success: true,
                    data: {
                        files_to_delete: filesToDelete,
                        total_count: filesToDelete.length,
                        dry_run: true
                    }
                };
            }
            // Actually delete the files
            const deletedFiles = [];
            for (const file of filesToDelete) {
                try {
                    await (0, promises_1.unlink)(file);
                    deletedFiles.push(file);
                }
                catch (error) {
                    console.warn(`Failed to delete file ${file}: ${error.message}`);
                }
            }
            return {
                success: true,
                data: {
                    files_deleted: deletedFiles,
                    total_count: deletedFiles.length,
                    dry_run: false
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to delete files: ${error.message}`
            };
        }
    }
    async createDirectoryStructure(params, context) {
        const { base_path, structure, create_gitkeep = false } = params;
        if (!base_path || !structure) {
            return {
                success: false,
                error: 'base_path and structure are required'
            };
        }
        try {
            const basePath = this.resolvePath(base_path, context);
            const createdDirs = [];
            if (Array.isArray(structure)) {
                // Handle array structure
                for (const dirPath of structure) {
                    const fullPath = (0, path_1.join)(basePath, dirPath);
                    await (0, promises_1.mkdir)(fullPath, { recursive: true });
                    createdDirs.push(fullPath);
                    if (create_gitkeep) {
                        const gitkeepPath = (0, path_1.join)(fullPath, '.gitkeep');
                        await (0, promises_1.writeFile)(gitkeepPath, '');
                    }
                }
            }
            else {
                // Handle object structure (tree)
                await this.createDirectoryTree(basePath, structure, createdDirs, create_gitkeep);
            }
            return {
                success: true,
                data: {
                    created_directories: createdDirs,
                    total_count: createdDirs.length,
                    gitkeep_created: create_gitkeep
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to create directory structure: ${error.message}`
            };
        }
    }
    async searchTextInFiles(params, context) {
        const { directory, search_pattern, file_extensions = [], recursive = true, case_sensitive = false, max_results = 100 } = params;
        if (!directory || !search_pattern) {
            return {
                success: false,
                error: 'directory and search_pattern are required'
            };
        }
        try {
            const dirPath = this.resolvePath(directory, context);
            // Check if directory exists
            try {
                await (0, promises_1.access)(dirPath, fs_1.constants.F_OK);
            }
            catch {
                return {
                    success: false,
                    error: `Directory does not exist: ${dirPath}`
                };
            }
            const results = [];
            const regex = new RegExp(search_pattern, case_sensitive ? 'g' : 'gi');
            await this.searchInDirectory(dirPath, regex, file_extensions, recursive, results, max_results);
            return {
                success: true,
                data: {
                    results: results.slice(0, max_results),
                    total_matches: results.length,
                    truncated: results.length > max_results
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to search text in files: ${error.message}`
            };
        }
    }
    // Helper methods
    resolvePath(path, context) {
        if (context?.workingDirectory) {
            if (!path.startsWith('/')) {
                return (0, path_1.join)(context.workingDirectory, path);
            }
            else {
                return (0, path_1.resolve)(context.workingDirectory, '.' + path);
            }
        }
        return path;
    }
    async findFilesByExtension(dirPath, extension, recursive, results) {
        const entries = await (0, promises_1.readdir)(dirPath);
        for (const entry of entries) {
            const entryPath = (0, path_1.join)(dirPath, entry);
            const stats = await (0, promises_1.stat)(entryPath);
            if (stats.isDirectory() && recursive) {
                await this.findFilesByExtension(entryPath, extension, recursive, results);
            }
            else if (stats.isFile() && (0, path_1.extname)(entry) === (extension.startsWith('.') ? extension : `.${extension}`)) {
                results.push(entryPath);
            }
        }
    }
    async createDirectoryTree(basePath, tree, created, createGitkeep) {
        for (const [key, value] of Object.entries(tree)) {
            const currentPath = (0, path_1.join)(basePath, key);
            await (0, promises_1.mkdir)(currentPath, { recursive: true });
            created.push(currentPath);
            if (typeof value === 'object') {
                await this.createDirectoryTree(currentPath, value, created, createGitkeep);
            }
            else if (createGitkeep) {
                const gitkeepPath = (0, path_1.join)(currentPath, '.gitkeep');
                await (0, promises_1.writeFile)(gitkeepPath, '');
            }
        }
    }
    async searchInDirectory(dirPath, regex, extensions, recursive, results, maxResults) {
        if (results.length >= maxResults)
            return;
        const entries = await (0, promises_1.readdir)(dirPath);
        for (const entry of entries) {
            if (results.length >= maxResults)
                break;
            const entryPath = (0, path_1.join)(dirPath, entry);
            const stats = await (0, promises_1.stat)(entryPath);
            if (stats.isDirectory() && recursive) {
                await this.searchInDirectory(entryPath, regex, extensions, recursive, results, maxResults);
            }
            else if (stats.isFile()) {
                const ext = (0, path_1.extname)(entry);
                if (extensions.length === 0 || extensions.includes(ext) || extensions.includes(ext.substring(1))) {
                    await this.searchInFile(entryPath, regex, results, maxResults);
                }
            }
        }
    }
    async searchInFile(filePath, regex, results, maxResults) {
        if (results.length >= maxResults)
            return;
        try {
            const content = await (0, promises_1.readFile)(filePath, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length && results.length < maxResults; i++) {
                const line = lines[i];
                const matches = line.match(regex);
                if (matches) {
                    for (const match of matches) {
                        if (results.length >= maxResults)
                            break;
                        results.push({
                            file_path: filePath,
                            line_number: i + 1,
                            line_content: line,
                            match: match
                        });
                    }
                }
            }
        }
        catch (error) {
            // Skip files that can't be read (binary files, permission issues, etc.)
        }
    }
}
exports.FileManipulationTool = FileManipulationTool;
// Import missing functions
const promises_2 = require("fs/promises");
//# sourceMappingURL=FileManipulationTool.js.map