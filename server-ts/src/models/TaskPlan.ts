export interface TaskPlan {
    id: string;
    title: string;
    sections: PlanSection[];
    status: 'planning' | 'executing' | 'completed';
    createdAt: Date;
    updatedAt: Date;
    issueNumber?: number;
    repository?: string;
}

export interface PlanSection {
    name: string;
    tasks: PlanTask[];
    order: number;
}

export interface PlanTask {
    id: string;
    description: string;
    completed: boolean;
    details?: string;
    order: number;
    startedAt?: Date;
    completedAt?: Date;
}

export interface PlanCreateRequest {
    title: string;
    sections: Array<{
        name: string;
        tasks: Array<{
            description: string;
            details?: string;
        }>;
    }>;
    issueNumber?: number;
    repository?: string;
}

export interface PlanUpdateRequest {
    planId: string;
    taskId: string;
    completed: boolean;
    details?: string;
}

export interface PlanStatusRequest {
    planId: string;
    status: 'planning' | 'executing' | 'completed';
}