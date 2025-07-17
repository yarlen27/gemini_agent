import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { CopyFileParams } from './types/FileManipulationTypes';
export declare class CopyFileToDirectoryTool implements ITool {
    readonly name = "copy_file_to_directory";
    readonly description = "Copy files to specific directories with overwrite options";
    readonly schema: {
        type: string;
        properties: {
            source_path: {
                type: string;
                description: string;
            };
            target_directory: {
                type: string;
                description: string;
            };
            overwrite: {
                type: string;
                description: string;
                default: boolean;
            };
            preserve_permissions: {
                type: string;
                description: string;
                default: boolean;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
    execute(params: CopyFileParams, context: ToolContext): Promise<ToolResult>;
    private resolvePath;
}
//# sourceMappingURL=CopyFileToDirectoryTool.d.ts.map