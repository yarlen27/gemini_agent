import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { DeleteFilesByExtensionParams } from './types/FileManipulationTypes';
export declare class DeleteFilesByExtensionTool implements ITool {
    readonly name = "delete_files_by_extension";
    readonly description = "Delete files by extension with safety confirmations";
    readonly schema: {
        type: string;
        properties: {
            directory: {
                type: string;
                description: string;
            };
            extension: {
                type: string;
                description: string;
            };
            recursive: {
                type: string;
                description: string;
                default: boolean;
            };
            dry_run: {
                type: string;
                description: string;
                default: boolean;
            };
            confirm_deletion: {
                type: string;
                description: string;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
    execute(params: DeleteFilesByExtensionParams, context: ToolContext): Promise<ToolResult>;
    private resolvePath;
    private findFilesByExtension;
}
//# sourceMappingURL=DeleteFilesByExtensionTool.d.ts.map