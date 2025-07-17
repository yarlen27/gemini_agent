import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { RenameFileParams } from './types/FileManipulationTypes';
export declare class RenameFileWithPatternTool implements ITool {
    readonly name = "rename_file_with_pattern";
    readonly description = "Rename files using pattern matching and replacement";
    readonly schema: {
        type: string;
        properties: {
            file_path: {
                type: string;
                description: string;
            };
            pattern: {
                type: string;
                description: string;
            };
            replacement: {
                type: string;
                description: string;
            };
            backup_original: {
                type: string;
                description: string;
                default: boolean;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
    execute(params: RenameFileParams, context: ToolContext): Promise<ToolResult>;
    private resolvePath;
}
//# sourceMappingURL=RenameFileWithPatternTool.d.ts.map