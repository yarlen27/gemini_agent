import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { RenameFileParams } from './types/FileManipulationTypes';
import { copyFile, access, rename } from 'fs/promises';
import { join, resolve, dirname, basename } from 'path';
import { constants } from 'fs';

export class RenameFileWithPatternTool implements ITool {
    readonly name = 'rename_file_with_pattern';
    readonly description = 'Rename files using pattern matching and replacement';
    
    readonly schema = {
        type: 'object',
        properties: {
            file_path: { type: 'string', description: 'File to rename' },
            pattern: { type: 'string', description: 'Pattern to match (regex supported)' },
            replacement: { type: 'string', description: 'Replacement pattern' },
            backup_original: { type: 'boolean', description: 'Create backup before rename', default: false }
        },
        required: ['file_path', 'pattern', 'replacement'],
        additionalProperties: false
    };

    async execute(params: RenameFileParams, context: ToolContext): Promise<ToolResult> {
        try {
            const { file_path, pattern, replacement, backup_original = false } = params;
            
            if (!file_path || !pattern || replacement === undefined) {
                return {
                    success: false,
                    error: 'file_path, pattern, and replacement are required'
                };
            }

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