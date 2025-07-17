import { TaskPlan, PlanCreateRequest, PlanUpdateRequest, PlanStatusRequest } from '../models/TaskPlan';
export declare class PlanService {
    private static instance;
    private readonly plansDirectory;
    private logger;
    private constructor();
    static getInstance(): PlanService;
    private ensureDirectoryExists;
    createPlan(request: PlanCreateRequest): Promise<TaskPlan>;
    getPlan(planId: string): Promise<TaskPlan | null>;
    updateTaskStatus(request: PlanUpdateRequest): Promise<TaskPlan | null>;
    updatePlanStatus(request: PlanStatusRequest): Promise<TaskPlan | null>;
    getPlansByIssue(issueNumber: number, repository?: string): Promise<TaskPlan[]>;
    generateMarkdown(plan: TaskPlan): string;
    private savePlan;
    deletePlan(planId: string): Promise<boolean>;
    getCompletionStats(plan: TaskPlan): {
        total: number;
        completed: number;
        percentage: number;
    };
}
//# sourceMappingURL=PlanService.d.ts.map