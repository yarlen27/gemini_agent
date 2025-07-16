import { ITool } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export class WriteFileTool implements ITool {
    public readonly name = 'write_file';

    public async execute(args: { file_path: string; content: string }): Promise<ToolResult> {
        try {
            if (!args.file_path || args.file_path.trim() === '') {
                return {
                    success: false,
                    error: 'File path cannot be empty'
                };
            }

            // Ensure directory exists
            const dir = dirname(args.file_path);
            await mkdir(dir, { recursive: true });

            // Write file
            await writeFile(args.file_path, args.content || '', 'utf-8');
            
            return {
                success: true,
                data: `File written successfully: ${args.file_path}`
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}