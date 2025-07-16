import { ITool } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
export declare class ReadFileTool implements ITool {
    readonly name = "read_file";
    execute(args: {
        file_path: string;
    }): Promise<ToolResult>;
}
//# sourceMappingURL=ReadFileTool.d.ts.map