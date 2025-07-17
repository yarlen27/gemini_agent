"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateDirectoryStructureTool = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
class CreateDirectoryStructureTool {
    constructor() {
        this.name = 'create_directory_structure';
        this.description = 'Create nested directory structures from path definitions';
        this.schema = {
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
    }
    async execute(params, context) {
        try {
            const { base_path, structure, create_gitkeep = false } = params;
            if (!base_path || !structure) {
                return {
                    success: false,
                    error: 'base_path and structure are required'
                };
            }
            const basePath = this.resolvePath(base_path, context);
            const createdDirs = [];
            if (Array.isArray(structure)) {
                // Handle array structure
                for (const dirPath of structure) {
                    const fullPath = (0, path_1.join)(basePath, dirPath);
                    await (0, promises_1.mkdir)(fullPath, { recursive: true });
                    createdDirs.push(fullPath);
                    if (create_gitkeep) {
                        const gitkeepPath = (0, path_1.join)(fullPath, '.gitkeep');
                        await (0, promises_1.writeFile)(gitkeepPath, '');
                    }
                }
            }
            else {
                // Handle object structure (tree)
                await this.createDirectoryTree(basePath, structure, createdDirs, create_gitkeep);
            }
            return {
                success: true,
                data: {
                    created_directories: createdDirs,
                    total_count: createdDirs.length,
                    gitkeep_created: create_gitkeep
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Error in ${this.name}: ${error.message}`
            };
        }
    }
    resolvePath(path, context) {
        if (context?.workingDirectory) {
            if (!path.startsWith('/')) {
                return (0, path_1.join)(context.workingDirectory, path);
            }
            else {
                return (0, path_1.resolve)(context.workingDirectory, '.' + path);
            }
        }
        return path;
    }
    async createDirectoryTree(basePath, tree, created, createGitkeep) {
        for (const [key, value] of Object.entries(tree)) {
            const currentPath = (0, path_1.join)(basePath, key);
            await (0, promises_1.mkdir)(currentPath, { recursive: true });
            created.push(currentPath);
            if (typeof value === 'object') {
                await this.createDirectoryTree(currentPath, value, created, createGitkeep);
            }
            else if (createGitkeep) {
                const gitkeepPath = (0, path_1.join)(currentPath, '.gitkeep');
                await (0, promises_1.writeFile)(gitkeepPath, '');
            }
        }
    }
}
exports.CreateDirectoryStructureTool = CreateDirectoryStructureTool;
//# sourceMappingURL=CreateDirectoryStructureTool.js.map