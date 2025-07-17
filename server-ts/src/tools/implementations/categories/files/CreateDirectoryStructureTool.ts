import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { CreateDirectoryStructureParams, CreateDirectoryResult, DirectoryTree } from './types/FileManipulationTypes';
import { mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

export class CreateDirectoryStructureTool implements ITool {
    readonly name = 'create_directory_structure';
    readonly description = 'Create nested directory structures from path definitions';
    
    readonly schema = {
        type: 'object',
        properties: {
            base_path: { type: 'string', description: 'Base directory path' },
            structure: { 
                description: 'Directory structure definition (array or tree)',
                oneOf: [
                    { type: 'array', items: { type: 'string' } },
                    { type: 'object' }
                ]
            },
            create_gitkeep: { type: 'boolean', description: 'Add .gitkeep files to empty directories', default: false }
        },
        required: ['base_path', 'structure'],
        additionalProperties: false
    };

    async execute(params: CreateDirectoryStructureParams, context: ToolContext): Promise<ToolResult> {
        try {
            const { base_path, structure, create_gitkeep = false } = params;
            
            if (!base_path || !structure) {
                return {
                    success: false,
                    error: 'base_path and structure are required'
                };
            }

            const basePath = this.resolvePath(base_path, context);
            const createdDirs: string[] = [];

            if (Array.isArray(structure)) {
                // Handle array structure
                for (const dirPath of structure) {
                    const fullPath = join(basePath, dirPath);
                    await mkdir(fullPath, { recursive: true });
                    createdDirs.push(fullPath);
                    
                    if (create_gitkeep) {
                        const gitkeepPath = join(fullPath, '.gitkeep');
                        await writeFile(gitkeepPath, '');
                    }
                }
            } else {
                // Handle object structure (tree)
                await this.createDirectoryTree(basePath, structure as DirectoryTree, createdDirs, create_gitkeep);
            }

            return {
                success: true,
                data: {
                    created_directories: createdDirs,
                    total_count: createdDirs.length,
                    gitkeep_created: create_gitkeep
                } as CreateDirectoryResult
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Error in ${this.name}: ${error.message}`
            };
        }
    }

    private resolvePath(path: string, context?: ToolContext): string {
        if (context?.workingDirectory) {
            if (!path.startsWith('/')) {
                return join(context.workingDirectory, path);
            } else {
                return resolve(context.workingDirectory, '.' + path);
            }
        }
        return path;
    }

    private async createDirectoryTree(
        basePath: string, 
        tree: DirectoryTree, 
        created: string[], 
        createGitkeep: boolean
    ): Promise<void> {
        for (const [key, value] of Object.entries(tree)) {
            const currentPath = join(basePath, key);
            await mkdir(currentPath, { recursive: true });
            created.push(currentPath);
            
            if (typeof value === 'object') {
                await this.createDirectoryTree(currentPath, value, created, createGitkeep);
            } else if (createGitkeep) {
                const gitkeepPath = join(currentPath, '.gitkeep');
                await writeFile(gitkeepPath, '');
            }
        }
    }
}