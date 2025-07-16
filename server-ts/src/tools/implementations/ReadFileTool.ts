import { ITool } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
import { readFile } from 'fs/promises';

export class ReadFileTool implements ITool {
    public readonly name = 'read_file';

    public async execute(args: { file_path: string }): Promise<ToolResult> {
        try {
            if (!args.file_path || args.file_path.trim() === '') {
                return {
                    success: false,
                    error: 'File path cannot be empty'
                };
            }

            const content = await readFile(args.file_path, 'utf-8');
            
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