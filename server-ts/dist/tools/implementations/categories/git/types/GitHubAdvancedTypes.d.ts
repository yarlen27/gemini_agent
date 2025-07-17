export interface CreateBranchFromMainParams {
    branch_name: string;
    push_to_remote?: boolean;
    checkout_after_create?: boolean;
}
export interface CreatePullRequestWithTemplateParams {
    title: string;
    body?: string;
    base_branch?: string;
    head_branch?: string;
    template?: string;
    draft?: boolean;
}
export interface AddCommentToIssueParams {
    issue_number: number;
    comment_body: string;
    close_issue?: boolean;
}
export interface GetDiffBetweenBranchesParams {
    base_branch: string;
    compare_branch: string;
    file_filter?: string;
    summary_only?: boolean;
}
export interface CherryPickCommitParams {
    commit_hash: string;
    target_branch?: string;
    no_commit?: boolean;
}
//# sourceMappingURL=GitHubAdvancedTypes.d.ts.map