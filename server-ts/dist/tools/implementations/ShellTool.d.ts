import { ITool } from '../interfaces/ITool';
import { ToolResult } from '../../models/ToolResult';
export declare class ShellTool implements ITool {
    readonly name = "run_shell_command";
    execute(args: {
        command: string;
    }): Promise<ToolResult>;
}
//# sourceMappingURL=ShellTool.d.ts.map