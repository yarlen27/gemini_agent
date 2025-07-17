import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { CreateDirectoryStructureParams } from './types/FileManipulationTypes';
export declare class CreateDirectoryStructureTool implements ITool {
    readonly name = "create_directory_structure";
    readonly description = "Create nested directory structures from path definitions";
    readonly schema: {
        type: string;
        properties: {
            base_path: {
                type: string;
                description: string;
            };
            structure: {
                description: string;
                oneOf: ({
                    type: string;
                    items: {
                        type: string;
                    };
                } | {
                    type: string;
                    items?: undefined;
                })[];
            };
            create_gitkeep: {
                type: string;
                description: string;
                default: boolean;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
    execute(params: CreateDirectoryStructureParams, context: ToolContext): Promise<ToolResult>;
    private resolvePath;
    private createDirectoryTree;
}
//# sourceMappingURL=CreateDirectoryStructureTool.d.ts.map