import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { SearchTextInFilesParams } from './types/FileManipulationTypes';
export declare class SearchTextInFilesTool implements ITool {
    readonly name = "search_text_in_files";
    readonly description = "Search for text patterns across multiple files with results";
    readonly schema: {
        type: string;
        properties: {
            directory: {
                type: string;
                description: string;
            };
            search_pattern: {
                type: string;
                description: string;
            };
            file_extensions: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            recursive: {
                type: string;
                description: string;
                default: boolean;
            };
            case_sensitive: {
                type: string;
                description: string;
                default: boolean;
            };
            max_results: {
                type: string;
                description: string;
                default: number;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
    execute(params: SearchTextInFilesParams, context: ToolContext): Promise<ToolResult>;
    private resolvePath;
    private searchInDirectory;
    private searchInFile;
}
//# sourceMappingURL=SearchTextInFilesTool.d.ts.map