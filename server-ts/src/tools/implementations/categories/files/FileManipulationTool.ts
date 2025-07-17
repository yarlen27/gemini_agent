import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { 
    CopyFileParams, 
    RenameFileParams, 
    DeleteFilesByExtensionParams, 
    CreateDirectoryStructureParams, 
    SearchTextInFilesParams,
    SearchResult,
    DeletePreviewResult,
    CreateDirectoryResult,
    DirectoryTree
} from './types/FileManipulationTypes';
import { copyFile, readdir, stat, unlink, mkdir, readFile, writeFile, access } from 'fs/promises';
import { join, resolve, dirname, basename, extname } from 'path';
import { constants } from 'fs';

export class FileManipulationTool implements ITool {
    readonly name = 'file_manipulation';
    readonly description = 'Provides file manipulation operations: copy, rename, delete, create directories, and search text in files';
    
    readonly schema = {
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

    async execute(params: any, context: ToolContext): Promise<ToolResult> {
        try {
            const { operation, ...args } = params;
            
            switch (operation) {
                case 'copy_file_to_directory':
                    return await this.copyFileToDirectory(args as CopyFileParams, context);
                case 'rename_file_with_pattern':
                    return await this.renameFileWithPattern(args as RenameFileParams, context);
                case 'delete_files_by_extension':
                    return await this.deleteFilesByExtension(args as DeleteFilesByExtensionParams, context);
                case 'create_directory_structure':
                    return await this.createDirectoryStructure(args as CreateDirectoryStructureParams, context);
                case 'search_text_in_files':
                    return await this.searchTextInFiles(args as SearchTextInFilesParams, context);
                default:
                    return {
                        success: false,
                        error: `Unknown operation: ${operation}`
                    };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `Error in ${this.name}: ${error.message}`
            };
        }
    }

    private async copyFileToDirectory(params: CopyFileParams, context?: ToolContext): Promise<ToolResult> {
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
            const fileName = basename(sourcePath);
            const targetPath = join(targetDir, fileName);

            // Check if source file exists
            try {
                await access(sourcePath, constants.F_OK);
            } catch {
                return {
                    success: false,
                    error: `Source file does not exist: ${sourcePath}`
                };
            }

            // Create target directory if it doesn't exist
            await mkdir(targetDir, { recursive: true });

            // Check if target file already exists
            try {
                await access(targetPath, constants.F_OK);
                if (!overwrite) {
                    return {
                        success: false,
                        error: `Target file already exists: ${targetPath}. Use overwrite: true to replace it.`
                    };
                }
            } catch {
                // Target file doesn't exist, which is fine
            }

            // Copy the file
            await copyFile(sourcePath, targetPath);

            // Preserve permissions if requested
            if (preserve_permissions) {
                const sourceStats = await stat(sourcePath);
                await chmod(targetPath, sourceStats.mode);
            }

            return {
                success: true,
                data: {
                    source_path: sourcePath,
                    target_path: targetPath,
                    overwrite_occurred: overwrite
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to copy file: ${error.message}`
            };
        }
    }

    private async renameFileWithPattern(params: RenameFileParams, context?: ToolContext): Promise<ToolResult> {
        const { file_path, pattern, replacement, backup_original = false } = params;
        
        if (!file_path || !pattern || replacement === undefined) {
            return {
                success: false,
                error: 'file_path, pattern, and replacement are required'
            };
        }

        try {
            const filePath = this.resolvePath(file_path, context);
            const fileName = basename(filePath);
            const fileDir = dirname(filePath);
            
            // Check if file exists
            try {
                await access(filePath, constants.F_OK);
            } catch {
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

            const newFilePath = join(fileDir, newFileName);

            // Check if target file already exists
            try {
                await access(newFilePath, constants.F_OK);
                return {
                    success: false,
                    error: `Target file already exists: ${newFilePath}`
                };
            } catch {
                // Target file doesn't exist, which is fine
            }

            // Create backup if requested
            if (backup_original) {
                const backupPath = `${filePath}.backup`;
                await copyFile(filePath, backupPath);
            }

            // Rename the file
            await rename(filePath, newFilePath);

            return {
                success: true,
                data: {
                    original_path: filePath,
                    new_path: newFilePath,
                    backup_created: backup_original,
                    backup_path: backup_original ? `${filePath}.backup` : null
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to rename file: ${error.message}`
            };
        }
    }

    private async deleteFilesByExtension(params: DeleteFilesByExtensionParams, context?: ToolContext): Promise<ToolResult> {
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
                await access(dirPath, constants.F_OK);
            } catch {
                return {
                    success: false,
                    error: `Directory does not exist: ${dirPath}`
                };
            }

            const filesToDelete: string[] = [];
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
                    } as DeletePreviewResult
                };
            }

            // Actually delete the files
            const deletedFiles: string[] = [];
            for (const file of filesToDelete) {
                try {
                    await unlink(file);
                    deletedFiles.push(file);
                } catch (error: any) {
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
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to delete files: ${error.message}`
            };
        }
    }

    private async createDirectoryStructure(params: CreateDirectoryStructureParams, context?: ToolContext): Promise<ToolResult> {
        const { base_path, structure, create_gitkeep = false } = params;
        
        if (!base_path || !structure) {
            return {
                success: false,
                error: 'base_path and structure are required'
            };
        }

        try {
            const basePath = this.resolvePath(base_path, context);
            const createdDirs: string[] = [];

            if (Array.isArray(structure)) {
                // Handle array structure
                for (const dirPath of structure) {
                    const fullPath = join(basePath, dirPath);
                    await mkdir(fullPath, { recursive: true });
                    createdDirs.push(fullPath);
                    
                    if (create_gitkeep) {
                        const gitkeepPath = join(fullPath, '.gitkeep');
                        await writeFile(gitkeepPath, '');
                    }
                }
            } else {
                // Handle object structure (tree)
                await this.createDirectoryTree(basePath, structure as DirectoryTree, createdDirs, create_gitkeep);
            }

            return {
                success: true,
                data: {
                    created_directories: createdDirs,
                    total_count: createdDirs.length,
                    gitkeep_created: create_gitkeep
                } as CreateDirectoryResult
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to create directory structure: ${error.message}`
            };
        }
    }

    private async searchTextInFiles(params: SearchTextInFilesParams, context?: ToolContext): Promise<ToolResult> {
        const { 
            directory, 
            search_pattern, 
            file_extensions = [], 
            recursive = true, 
            case_sensitive = false, 
            max_results = 100 
        } = params;
        
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
                await access(dirPath, constants.F_OK);
            } catch {
                return {
                    success: false,
                    error: `Directory does not exist: ${dirPath}`
                };
            }

            const results: SearchResult[] = [];
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
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to search text in files: ${error.message}`
            };
        }
    }

    // Helper methods
    private resolvePath(path: string, context?: ToolContext): string {
        if (context?.workingDirectory) {
            if (!path.startsWith('/')) {
                return join(context.workingDirectory, path);
            } else {
                return resolve(context.workingDirectory, '.' + path);
            }
        }
        return path;
    }

    private async findFilesByExtension(
        dirPath: string, 
        extension: string, 
        recursive: boolean, 
        results: string[]
    ): Promise<void> {
        const entries = await readdir(dirPath);
        
        for (const entry of entries) {
            const entryPath = join(dirPath, entry);
            const stats = await stat(entryPath);
            
            if (stats.isDirectory() && recursive) {
                await this.findFilesByExtension(entryPath, extension, recursive, results);
            } else if (stats.isFile() && extname(entry) === (extension.startsWith('.') ? extension : `.${extension}`)) {
                results.push(entryPath);
            }
        }
    }

    private async createDirectoryTree(
        basePath: string, 
        tree: DirectoryTree, 
        created: string[], 
        createGitkeep: boolean
    ): Promise<void> {
        for (const [key, value] of Object.entries(tree)) {
            const currentPath = join(basePath, key);
            await mkdir(currentPath, { recursive: true });
            created.push(currentPath);
            
            if (typeof value === 'object') {
                await this.createDirectoryTree(currentPath, value, created, createGitkeep);
            } else if (createGitkeep) {
                const gitkeepPath = join(currentPath, '.gitkeep');
                await writeFile(gitkeepPath, '');
            }
        }
    }

    private async searchInDirectory(
        dirPath: string, 
        regex: RegExp, 
        extensions: string[], 
        recursive: boolean, 
        results: SearchResult[], 
        maxResults: number
    ): Promise<void> {
        if (results.length >= maxResults) return;
        
        const entries = await readdir(dirPath);
        
        for (const entry of entries) {
            if (results.length >= maxResults) break;
            
            const entryPath = join(dirPath, entry);
            const stats = await stat(entryPath);
            
            if (stats.isDirectory() && recursive) {
                await this.searchInDirectory(entryPath, regex, extensions, recursive, results, maxResults);
            } else if (stats.isFile()) {
                const ext = extname(entry);
                if (extensions.length === 0 || extensions.includes(ext) || extensions.includes(ext.substring(1))) {
                    await this.searchInFile(entryPath, regex, results, maxResults);
                }
            }
        }
    }

    private async searchInFile(
        filePath: string, 
        regex: RegExp, 
        results: SearchResult[], 
        maxResults: number
    ): Promise<void> {
        if (results.length >= maxResults) return;
        
        try {
            const content = await readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length && results.length < maxResults; i++) {
                const line = lines[i];
                const matches = line.match(regex);
                
                if (matches) {
                    for (const match of matches) {
                        if (results.length >= maxResults) break;
                        
                        results.push({
                            file_path: filePath,
                            line_number: i + 1,
                            line_content: line,
                            match: match
                        });
                    }
                }
            }
        } catch (error) {
            // Skip files that can't be read (binary files, permission issues, etc.)
        }
    }
}

// Import missing functions
import { rename, chmod } from 'fs/promises';