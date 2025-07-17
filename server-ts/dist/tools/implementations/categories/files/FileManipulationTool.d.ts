import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
export declare class FileManipulationTool implements ITool {
    readonly name = "file_manipulation";
    readonly description = "Provides file manipulation operations: copy, rename, delete, create directories, and search text in files";
    readonly schema: {
        type: string;
        properties: {
            operation: {
                type: string;
                enum: string[];
            };
            source_path: {
                type: string;
            };
            target_directory: {
                type: string;
            };
            overwrite: {
                type: string;
            };
            preserve_permissions: {
                type: string;
            };
            file_path: {
                type: string;
            };
            pattern: {
                type: string;
            };
            replacement: {
                type: string;
            };
            backup_original: {
                type: string;
            };
            directory: {
                type: string;
            };
            extension: {
                type: string;
            };
            recursive: {
                type: string;
            };
            dry_run: {
                type: string;
            };
            confirm_deletion: {
                type: string;
            };
            base_path: {
                type: string;
            };
            structure: {
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
            };
            search_pattern: {
                type: string;
            };
            file_extensions: {
                type: string;
                items: {
                    type: string;
                };
            };
            case_sensitive: {
                type: string;
            };
            max_results: {
                type: string;
            };
        };
        required: string[];
        additionalProperties: boolean;
    };
    execute(params: any, context: ToolContext): Promise<ToolResult>;
    private copyFileToDirectory;
    private renameFileWithPattern;
    private deleteFilesByExtension;
    private createDirectoryStructure;
    private searchTextInFiles;
    private resolvePath;
    private findFilesByExtension;
    private createDirectoryTree;
    private searchInDirectory;
    private searchInFile;
}
//# sourceMappingURL=FileManipulationTool.d.ts.map