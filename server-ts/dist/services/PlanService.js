"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanService = void 0;
const Logger_1 = require("../utils/Logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
class PlanService {
    constructor() {
        this.plansDirectory = path.join(process.cwd(), 'logs', 'plans');
        this.logger = Logger_1.Logger.getInstance();
        this.ensureDirectoryExists();
    }
    static getInstance() {
        if (!PlanService.instance) {
            PlanService.instance = new PlanService();
        }
        return PlanService.instance;
    }
    ensureDirectoryExists() {
        if (!fs.existsSync(this.plansDirectory)) {
            fs.mkdirSync(this.plansDirectory, { recursive: true });
        }
    }
    async createPlan(request) {
        const planId = (0, uuid_1.v4)();
        const now = new Date();
        const sections = request.sections.map((section, sectionIndex) => ({
            name: section.name,
            order: sectionIndex,
            tasks: section.tasks.map((task, taskIndex) => ({
                id: (0, uuid_1.v4)(),
                description: task.description,
                completed: false,
                details: task.details,
                order: taskIndex
            }))
        }));
        const plan = {
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
    async getPlan(planId) {
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
            plan.sections.forEach((section) => {
                section.tasks.forEach((task) => {
                    if (task.startedAt)
                        task.startedAt = new Date(task.startedAt);
                    if (task.completedAt)
                        task.completedAt = new Date(task.completedAt);
                });
            });
            return plan;
        }
        catch (error) {
            this.logger.error('PlanService', `Error reading plan ${planId}: ${error}`);
            return null;
        }
    }
    async updateTaskStatus(request) {
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
            if (taskFound)
                break;
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
    async updatePlanStatus(request) {
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
    async getPlansByIssue(issueNumber, repository) {
        const plans = [];
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
    generateMarkdown(plan) {
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
        const completedTasks = plan.sections.reduce((sum, section) => sum + section.tasks.filter(task => task.completed).length, 0);
        if (plan.status === 'completed') {
            markdown += `### Implementación Completada ✅\n`;
            markdown += `- **Tareas totales:** ${totalTasks}\n`;
            markdown += `- **Tareas completadas:** ${completedTasks}\n`;
            markdown += `- **Estado:** ${plan.status}\n`;
        }
        else {
            markdown += `### Progreso: ${completedTasks}/${totalTasks} (${Math.round((completedTasks / totalTasks) * 100)}%)\n`;
        }
        return markdown;
    }
    async savePlan(plan) {
        const planPath = path.join(this.plansDirectory, `${plan.id}.json`);
        try {
            fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
        }
        catch (error) {
            this.logger.error('PlanService', `Error saving plan ${plan.id}: ${error}`);
            throw error;
        }
    }
    async deletePlan(planId) {
        const planPath = path.join(this.plansDirectory, `${planId}.json`);
        if (fs.existsSync(planPath)) {
            try {
                fs.unlinkSync(planPath);
                this.logger.info('PlanService', `Deleted plan ${planId}`);
                return true;
            }
            catch (error) {
                this.logger.error('PlanService', `Error deleting plan ${planId}: ${error}`);
                return false;
            }
        }
        return false;
    }
    getCompletionStats(plan) {
        const total = plan.sections.reduce((sum, section) => sum + section.tasks.length, 0);
        const completed = plan.sections.reduce((sum, section) => sum + section.tasks.filter(task => task.completed).length, 0);
        return {
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }
}
exports.PlanService = PlanService;
//# sourceMappingURL=PlanService.js.map