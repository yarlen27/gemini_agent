import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { CopyFileParams } from './types/FileManipulationTypes';
import { copyFile, access, mkdir, stat, chmod } from 'fs/promises';
import { join, resolve, dirname, basename } from 'path';
import { constants } from 'fs';

export class CopyFileToDirectoryTool implements ITool {
    readonly name = 'copy_file_to_directory';
    readonly description = 'Copy files to specific directories with overwrite options';
    
    readonly schema = {
        type: 'object',
        properties: {
            source_path: { type: 'string', description: 'Source file path' },
            target_directory: { type: 'string', description: 'Target directory path' },
            overwrite: { type: 'boolean', description: 'Overwrite existing files', default: false },
            preserve_permissions: { type: 'boolean', description: 'Keep original file permissions', default: false }
        },
        required: ['source_path', 'target_directory'],
        additionalProperties: false
    };

    async execute(params: CopyFileParams, context: ToolContext): Promise<ToolResult> {
        try {
            const { source_path, target_directory, overwrite = false, preserve_permissions = false } = params;
            
            if (!source_path || !target_directory) {
                return {
                    success: false,
                    error: 'source_path and target_directory are required'
                };
            }

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
}