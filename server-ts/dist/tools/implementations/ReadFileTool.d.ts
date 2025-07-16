import { ITool, ToolContext } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
export declare class ReadFileTool implements ITool {
    readonly name = "read_file";
    execute(args: {
        file_path: string;
    }, context?: ToolContext): Promise<ToolResult>;
}
//# sourceMappingURL=ReadFileTool.d.ts.map