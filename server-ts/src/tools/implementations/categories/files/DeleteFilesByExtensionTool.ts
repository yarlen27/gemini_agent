import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { DeleteFilesByExtensionParams, DeletePreviewResult } from './types/FileManipulationTypes';
import { readdir, stat, unlink, access } from 'fs/promises';
import { join, resolve, extname } from 'path';
import { constants } from 'fs';

export class DeleteFilesByExtensionTool implements ITool {
    readonly name = 'delete_files_by_extension';
    readonly description = 'Delete files by extension with safety confirmations';
    
    readonly schema = {
        type: 'object',
        properties: {
            directory: { type: 'string', description: 'Directory to search' },
            extension: { type: 'string', description: 'File extension to delete' },
            recursive: { type: 'boolean', description: 'Search subdirectories', default: false },
            dry_run: { type: 'boolean', description: 'Show what would be deleted without deleting', default: false },
            confirm_deletion: { type: 'boolean', description: 'Must be true to confirm destruction' }
        },
        required: ['directory', 'extension', 'confirm_deletion'],
        additionalProperties: false
    };

    async execute(params: DeleteFilesByExtensionParams, context: ToolContext): Promise<ToolResult> {
        try {
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

            // Log warning for bulk operations
            if (filesToDelete.length > 10) {
                console.warn(`WARNING: About to delete ${filesToDelete.length} files with extension ${extension}`);
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
                error: `Error in ${this.name}: ${error.message}`
            };
        }
    }

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
}