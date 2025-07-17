import { PlanningTool } from '../../src/tools/implementations/PlanningTool';
import { PlanService } from '../../src/services/PlanService';
import { TaskPlan } from '../../src/models/TaskPlan';
import * as fs from 'fs';
import * as path from 'path';

// Mock PlanService
jest.mock('../../src/services/PlanService');
jest.mock('../../src/utils/Logger');
jest.mock('fs');
jest.mock('path');

describe('PlanningTool', () => {
    let planningTool: PlanningTool;
    let mockPlanService: jest.Mocked<PlanService>;
    let mockLogger: any;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock Logger
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            getInstance: jest.fn()
        };

        // Mock PlanService
        mockPlanService = {
            createPlan: jest.fn(),
            getPlan: jest.fn(),
            updateTaskStatus: jest.fn(),
            updatePlanStatus: jest.fn(),
            getPlansByIssue: jest.fn(),
            generateMarkdown: jest.fn(),
            deletePlan: jest.fn(),
            getCompletionStats: jest.fn(),
            getInstance: jest.fn()
        } as any;

        (PlanService.getInstance as jest.Mock).mockReturnValue(mockPlanService);
        
        // Mock Logger.getInstance
        const { Logger } = require('../../src/utils/Logger');
        (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);
        
        planningTool = new PlanningTool();
    });

    describe('Parameter Validation', () => {
        it('should return error when action is missing', async () => {
            const result = await planningTool.execute({} as any);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Action parameter is required');
        });

        it('should return error when create action is missing title', async () => {
            const result = await planningTool.execute({
                action: 'create',
                sections: [{ name: 'Test', tasks: [{ description: 'Test task' }] }]
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Title is required for create action');
        });

        it('should return error when create action is missing sections', async () => {
            const result = await planningTool.execute({
                action: 'create',
                title: 'Test Plan'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('At least one section is required for create action');
        });

        it('should return error when update_task action is missing required params', async () => {
            const result = await planningTool.execute({
                action: 'update_task',
                planId: 'test-plan-id'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('planId and taskId are required for update_task action');
        });

        it('should return error when update_task action is missing completed status', async () => {
            const result = await planningTool.execute({
                action: 'update_task',
                planId: 'test-plan-id',
                taskId: 'test-task-id'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('completed status is required for update_task action');
        });
    });

    describe('Create Plan', () => {
        it('should create a plan successfully', async () => {
            const mockPlan: TaskPlan = {
                id: 'test-plan-id',
                title: 'Test Plan',
                sections: [
                    {
                        name: 'Test Section',
                        order: 0,
                        tasks: [
                            {
                                id: 'task-1',
                                description: 'Test Task',
                                completed: false,
                                order: 0
                            }
                        ]
                    }
                ],
                status: 'planning',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPlanService.createPlan.mockResolvedValue(mockPlan);
            mockPlanService.generateMarkdown.mockReturnValue('# Test Plan\\n- [ ] Test Task');
            mockPlanService.getCompletionStats.mockReturnValue({ total: 1, completed: 0, percentage: 0 });

            const result = await planningTool.execute({
                action: 'create',
                title: 'Test Plan',
                sections: [
                    {
                        name: 'Test Section',
                        tasks: [{ description: 'Test Task' }]
                    }
                ]
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('plan');
            expect(result.data).toHaveProperty('markdown');
            expect(result.data).toHaveProperty('stats');
            expect(mockPlanService.createPlan).toHaveBeenCalledWith({
                title: 'Test Plan',
                sections: [
                    {
                        name: 'Test Section',
                        tasks: [{ description: 'Test Task' }]
                    }
                ]
            });
        });
    });

    describe('Update Task', () => {
        it('should update task status successfully', async () => {
            const mockPlan: TaskPlan = {
                id: 'test-plan-id',
                title: 'Test Plan',
                sections: [
                    {
                        name: 'Test Section',
                        order: 0,
                        tasks: [
                            {
                                id: 'task-1',
                                description: 'Test Task',
                                completed: true,
                                order: 0
                            }
                        ]
                    }
                ],
                status: 'executing',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPlanService.updateTaskStatus.mockResolvedValue(mockPlan);
            mockPlanService.generateMarkdown.mockReturnValue('# Test Plan\\n- [x] Test Task');
            mockPlanService.getCompletionStats.mockReturnValue({ total: 1, completed: 1, percentage: 100 });

            const result = await planningTool.execute({
                action: 'update_task',
                planId: 'test-plan-id',
                taskId: 'task-1',
                completed: true,
                details: 'Task completed successfully'
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('plan');
            expect(result.data).toHaveProperty('markdown');
            expect(result.data).toHaveProperty('stats');
            expect(mockPlanService.updateTaskStatus).toHaveBeenCalledWith({
                planId: 'test-plan-id',
                taskId: 'task-1',
                completed: true,
                details: 'Task completed successfully'
            });
        });

        it('should return error when plan or task not found', async () => {
            mockPlanService.updateTaskStatus.mockResolvedValue(null);

            const result = await planningTool.execute({
                action: 'update_task',
                planId: 'non-existent-plan',
                taskId: 'non-existent-task',
                completed: true
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Plan non-existent-plan or task non-existent-task not found');
        });
    });

    describe('Update Plan Status', () => {
        it('should update plan status successfully', async () => {
            const mockPlan: TaskPlan = {
                id: 'test-plan-id',
                title: 'Test Plan',
                sections: [],
                status: 'completed',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPlanService.updatePlanStatus.mockResolvedValue(mockPlan);
            mockPlanService.generateMarkdown.mockReturnValue('# Test Plan - Completed');
            mockPlanService.getCompletionStats.mockReturnValue({ total: 0, completed: 0, percentage: 0 });

            const result = await planningTool.execute({
                action: 'update_status',
                planId: 'test-plan-id',
                status: 'completed'
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('plan');
            expect(result.data).toHaveProperty('markdown');
            expect(result.data).toHaveProperty('stats');
            expect(mockPlanService.updatePlanStatus).toHaveBeenCalledWith({
                planId: 'test-plan-id',
                status: 'completed'
            });
        });

        it('should return error when plan not found', async () => {
            mockPlanService.updatePlanStatus.mockResolvedValue(null);

            const result = await planningTool.execute({
                action: 'update_status',
                planId: 'non-existent-plan',
                status: 'completed'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Plan non-existent-plan not found');
        });
    });

    describe('Get Plan', () => {
        it('should get plan successfully', async () => {
            const mockPlan: TaskPlan = {
                id: 'test-plan-id',
                title: 'Test Plan',
                sections: [],
                status: 'planning',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPlanService.getPlan.mockResolvedValue(mockPlan);
            mockPlanService.generateMarkdown.mockReturnValue('# Test Plan');
            mockPlanService.getCompletionStats.mockReturnValue({ total: 0, completed: 0, percentage: 0 });

            const result = await planningTool.execute({
                action: 'get',
                planId: 'test-plan-id'
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('plan');
            expect(result.data).toHaveProperty('markdown');
            expect(result.data).toHaveProperty('stats');
            expect(mockPlanService.getPlan).toHaveBeenCalledWith('test-plan-id');
        });

        it('should return error when plan not found', async () => {
            mockPlanService.getPlan.mockResolvedValue(null);

            const result = await planningTool.execute({
                action: 'get',
                planId: 'non-existent-plan'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Plan non-existent-plan not found');
        });
    });

    describe('Get Plans by Issue', () => {
        it('should get plans by issue successfully', async () => {
            const mockPlans: TaskPlan[] = [
                {
                    id: 'plan-1',
                    title: 'Plan 1',
                    sections: [],
                    status: 'planning',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    issueNumber: 123
                },
                {
                    id: 'plan-2',
                    title: 'Plan 2',
                    sections: [],
                    status: 'completed',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    issueNumber: 123
                }
            ];

            mockPlanService.getPlansByIssue.mockResolvedValue(mockPlans);
            mockPlanService.generateMarkdown.mockReturnValue('# Test Plan');

            const result = await planningTool.execute({
                action: 'get_by_issue',
                issueNumber: 123,
                repository: 'test/repo'
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('plans');
            expect(result.data).toHaveProperty('count');
            expect(result.data).toHaveProperty('markdowns');
            expect(result.data.count).toBe(2);
            expect(mockPlanService.getPlansByIssue).toHaveBeenCalledWith(123, 'test/repo');
        });
    });

    describe('Generate Markdown', () => {
        it('should generate markdown successfully', async () => {
            const mockPlan: TaskPlan = {
                id: 'test-plan-id',
                title: 'Test Plan',
                sections: [],
                status: 'planning',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPlanService.getPlan.mockResolvedValue(mockPlan);
            mockPlanService.generateMarkdown.mockReturnValue('# Test Plan\\n- [ ] Test Task');
            mockPlanService.getCompletionStats.mockReturnValue({ total: 1, completed: 0, percentage: 0 });

            const result = await planningTool.execute({
                action: 'generate_markdown',
                planId: 'test-plan-id'
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('markdown');
            expect(result.data).toHaveProperty('stats');
            expect(mockPlanService.generateMarkdown).toHaveBeenCalledWith(mockPlan);
        });
    });

    describe('Delete Plan', () => {
        it('should delete plan successfully', async () => {
            mockPlanService.deletePlan.mockResolvedValue(true);

            const result = await planningTool.execute({
                action: 'delete',
                planId: 'test-plan-id'
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('message');
            expect(mockPlanService.deletePlan).toHaveBeenCalledWith('test-plan-id');
        });

        it('should return error when plan deletion fails', async () => {
            mockPlanService.deletePlan.mockResolvedValue(false);

            const result = await planningTool.execute({
                action: 'delete',
                planId: 'non-existent-plan'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Plan non-existent-plan not found or could not be deleted');
        });
    });

    describe('Error Handling', () => {
        it('should handle unknown actions', async () => {
            const result = await planningTool.execute({
                action: 'unknown_action' as any
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unknown action');
        });

        it('should handle service errors', async () => {
            mockPlanService.createPlan.mockRejectedValue(new Error('Service error'));

            const result = await planningTool.execute({
                action: 'create',
                title: 'Test Plan',
                sections: [{ name: 'Test', tasks: [{ description: 'Test' }] }]
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Planning tool error');
        });
    });
});