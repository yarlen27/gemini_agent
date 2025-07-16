import { ITool, ToolContext } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';

export class ReadFileTool implements ITool {
    public readonly name = 'read_file';

    public async execute(args: { file_path: string }, context?: ToolContext): Promise<ToolResult> {
        try {
            if (!args.file_path || args.file_path.trim() === '') {
                return {
                    success: false,
                    error: 'File path cannot be empty'
                };
            }

            // Resolve file path relative to working directory
            let fullPath = args.file_path;
            if (context?.workingDirectory) {
                // If path is relative, join with working directory
                if (!args.file_path.startsWith('/')) {
                    fullPath = join(context.workingDirectory, args.file_path);
                } else {
                    // If path is absolute, still ensure it's within working directory for security
                    fullPath = resolve(context.workingDirectory, '.' + args.file_path);
                }
            }

            const content = await readFile(fullPath, 'utf-8');
            
            return {
                success: true,
                data: content
            };
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return {
                    success: false,
                    error: 'File not found'
                };
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }
}