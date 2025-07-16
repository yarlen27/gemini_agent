import { ITool, ToolContext } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
export declare class WriteFileTool implements ITool {
    readonly name = "write_file";
    execute(args: {
        file_path: string;
        content: string;
    }, context?: ToolContext): Promise<ToolResult>;
}
//# sourceMappingURL=WriteFileTool.d.ts.map