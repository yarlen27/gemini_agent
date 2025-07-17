import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { CreateBranchFromMainParams, CreatePullRequestWithTemplateParams, AddCommentToIssueParams, GetDiffBetweenBranchesParams, CherryPickCommitParams } from './types/GitHubAdvancedTypes';
export declare class CreateBranchFromMainTool implements ITool {
    readonly name = "create_branch_from_main";
    execute(params: CreateBranchFromMainParams, context?: ToolContext): Promise<ToolResult>;
}
export declare class CreatePullRequestWithTemplateTool implements ITool {
    readonly name = "create_pull_request_with_template";
    execute(params: CreatePullRequestWithTemplateParams, context?: ToolContext): Promise<ToolResult>;
}
export declare class AddCommentToIssueTool implements ITool {
    readonly name = "add_comment_to_issue";
    execute(params: AddCommentToIssueParams, context?: ToolContext): Promise<ToolResult>;
}
export declare class GetDiffBetweenBranchesTool implements ITool {
    readonly name = "get_diff_between_branches";
    execute(params: GetDiffBetweenBranchesParams, context?: ToolContext): Promise<ToolResult>;
}
export declare class CherryPickCommitTool implements ITool {
    readonly name = "cherry_pick_commit";
    execute(params: CherryPickCommitParams, context?: ToolContext): Promise<ToolResult>;
}
//# sourceMappingURL=GitHubAdvancedTool.d.ts.map