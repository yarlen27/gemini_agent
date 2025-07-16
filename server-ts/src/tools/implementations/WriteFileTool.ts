import { ITool, ToolContext } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join, resolve } from 'path';

export class WriteFileTool implements ITool {
    public readonly name = 'write_file';

    public async execute(args: { file_path: string; content: string }, context?: ToolContext): Promise<ToolResult> {
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

            // Ensure directory exists
            const dir = dirname(fullPath);
            await mkdir(dir, { recursive: true });

            // Write file
            await writeFile(fullPath, args.content || '', 'utf-8');
            
            return {
                success: true,
                data: `File written successfully: ${fullPath}`
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}