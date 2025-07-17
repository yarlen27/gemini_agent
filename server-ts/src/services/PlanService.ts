import { TaskPlan, PlanSection, PlanTask, PlanCreateRequest, PlanUpdateRequest, PlanStatusRequest } from '../models/TaskPlan';
import { Logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class PlanService {
    private static instance: PlanService;
    private readonly plansDirectory: string;
    private logger: Logger;

    private constructor() {
        this.plansDirectory = path.join(process.cwd(), 'logs', 'plans');
        this.logger = Logger.getInstance();
        this.ensureDirectoryExists();
    }

    public static getInstance(): PlanService {
        if (!PlanService.instance) {
            PlanService.instance = new PlanService();
        }
        return PlanService.instance;
    }

    private ensureDirectoryExists(): void {
        if (!fs.existsSync(this.plansDirectory)) {
            fs.mkdirSync(this.plansDirectory, { recursive: true });
        }
    }

    public async createPlan(request: PlanCreateRequest): Promise<TaskPlan> {
        const planId = uuidv4();
        const now = new Date();
        
        const sections: PlanSection[] = request.sections.map((section, sectionIndex) => ({
            name: section.name,
            order: sectionIndex,
            tasks: section.tasks.map((task, taskIndex) => ({
                id: uuidv4(),
                description: task.description,
                completed: false,
                details: task.details,
                order: taskIndex
            }))
        }));

        const plan: TaskPlan = {
            id: planId,
            title: request.title,
            sections,
            status: 'planning',
            createdAt: now,
            updatedAt: now,
            issueNumber: request.issueNumber,
            repository: request.repository
        };

        await this.savePlan(plan);
        this.logger.info('PlanService', `Created plan ${planId} with ${sections.length} sections`);
        
        return plan;
    }

    public async getPlan(planId: string): Promise<TaskPlan | null> {
        const planPath = path.join(this.plansDirectory, `${planId}.json`);
        
        if (!fs.existsSync(planPath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(planPath, 'utf8');
            const plan = JSON.parse(content);
            
            // Convert date strings back to Date objects
            plan.createdAt = new Date(plan.createdAt);
            plan.updatedAt = new Date(plan.updatedAt);
            
            plan.sections.forEach((section: PlanSection) => {
                section.tasks.forEach((task: PlanTask) => {
                    if (task.startedAt) task.startedAt = new Date(task.startedAt);
                    if (task.completedAt) task.completedAt = new Date(task.completedAt);
                });
            });

            return plan;
        } catch (error) {
            this.logger.error('PlanService', `Error reading plan ${planId}: ${error}`);
            return null;
        }
    }

    public async updateTaskStatus(request: PlanUpdateRequest): Promise<TaskPlan | null> {
        const plan = await this.getPlan(request.planId);
        
        if (!plan) {
            return null;
        }

        let taskFound = false;
        const now = new Date();

        for (const section of plan.sections) {
            for (const task of section.tasks) {
                if (task.id === request.taskId) {
                    task.completed = request.completed;
                    task.completedAt = request.completed ? now : undefined;
                    if (request.details) {
                        task.details = request.details;
                    }
                    taskFound = true;
                    break;
                }
            }
            if (taskFound) break;
        }

        if (!taskFound) {
            this.logger.warn('PlanService', `Task ${request.taskId} not found in plan ${request.planId}`);
            return null;
        }

        plan.updatedAt = now;
        await this.savePlan(plan);
        this.logger.info('PlanService', `Updated task ${request.taskId} in plan ${request.planId}`);
        
        return plan;
    }

    public async updatePlanStatus(request: PlanStatusRequest): Promise<TaskPlan | null> {
        const plan = await this.getPlan(request.planId);
        
        if (!plan) {
            return null;
        }

        plan.status = request.status;
        plan.updatedAt = new Date();
        
        await this.savePlan(plan);
        this.logger.info('PlanService', `Updated plan ${request.planId} status to ${request.status}`);
        
        return plan;
    }

    public async getPlansByIssue(issueNumber: number, repository?: string): Promise<TaskPlan[]> {
        const plans: TaskPlan[] = [];
        
        if (!fs.existsSync(this.plansDirectory)) {
            return plans;
        }

        const files = fs.readdirSync(this.plansDirectory).filter(file => file.endsWith('.json'));
        
        for (const file of files) {
            const planId = file.replace('.json', '');
            const plan = await this.getPlan(planId);
            
            if (plan && plan.issueNumber === issueNumber) {
                if (!repository || plan.repository === repository) {
                    plans.push(plan);
                }
            }
        }

        return plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    public generateMarkdown(plan: TaskPlan): string {
        let markdown = `## 🔷 ${plan.title}\n\n`;
        
        for (const section of plan.sections.sort((a, b) => a.order - b.order)) {
            markdown += `### ${section.name}\n`;
            
            for (const task of section.tasks.sort((a, b) => a.order - b.order)) {
                const checkbox = task.completed ? '- [x]' : '- [ ]';
                markdown += `${checkbox} ${task.description}\n`;
                
                if (task.details && task.completed) {
                    markdown += `  - ${task.details}\n`;
                }
            }
            
            markdown += '\n';
        }

        // Add completion status
        const totalTasks = plan.sections.reduce((sum, section) => sum + section.tasks.length, 0);
        const completedTasks = plan.sections.reduce((sum, section) => 
            sum + section.tasks.filter(task => task.completed).length, 0
        );
        
        if (plan.status === 'completed') {
            markdown += `### Implementación Completada ✅\n`;
            markdown += `- **Tareas totales:** ${totalTasks}\n`;
            markdown += `- **Tareas completadas:** ${completedTasks}\n`;
            markdown += `- **Estado:** ${plan.status}\n`;
        } else {
            markdown += `### Progreso: ${completedTasks}/${totalTasks} (${Math.round((completedTasks/totalTasks) * 100)}%)\n`;
        }

        return markdown;
    }

    private async savePlan(plan: TaskPlan): Promise<void> {
        const planPath = path.join(this.plansDirectory, `${plan.id}.json`);
        
        try {
            fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
        } catch (error) {
            this.logger.error('PlanService', `Error saving plan ${plan.id}: ${error}`);
            throw error;
        }
    }

    public async deletePlan(planId: string): Promise<boolean> {
        const planPath = path.join(this.plansDirectory, `${planId}.json`);
        
        if (fs.existsSync(planPath)) {
            try {
                fs.unlinkSync(planPath);
                this.logger.info('PlanService', `Deleted plan ${planId}`);
                return true;
            } catch (error) {
                this.logger.error('PlanService', `Error deleting plan ${planId}: ${error}`);
                return false;
            }
        }
        
        return false;
    }

    public getCompletionStats(plan: TaskPlan): { total: number; completed: number; percentage: number } {
        const total = plan.sections.reduce((sum, section) => sum + section.tasks.length, 0);
        const completed = plan.sections.reduce((sum, section) => 
            sum + section.tasks.filter(task => task.completed).length, 0
        );
        
        return {
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }
}