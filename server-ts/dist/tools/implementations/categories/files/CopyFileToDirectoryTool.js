"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopyFileToDirectoryTool = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const fs_1 = require("fs");
class CopyFileToDirectoryTool {
    constructor() {
        this.name = 'copy_file_to_directory';
        this.description = 'Copy files to specific directories with overwrite options';
        this.schema = {
            type: 'object',
            properties: {
                source_path: { type: 'string', description: 'Source file path' },
                target_directory: { type: 'string', description: 'Target directory path' },
                overwrite: { type: 'boolean', description: 'Overwrite existing files', default: false },
                preserve_permissions: { type: 'boolean', description: 'Keep original file permissions', default: false }
            },
            required: ['source_path', 'target_directory'],
            additionalProperties: false
        };
    }
    async execute(params, context) {
        try {
            const { source_path, target_directory, overwrite = false, preserve_permissions = false } = params;
            if (!source_path || !target_directory) {
                return {
                    success: false,
                    error: 'source_path and target_directory are required'
                };
            }
            // Resolve paths relative to working directory
            const sourcePath = this.resolvePath(source_path, context);
            const targetDir = this.resolvePath(target_directory, context);
            const fileName = (0, path_1.basename)(sourcePath);
            const targetPath = (0, path_1.join)(targetDir, fileName);
            // Check if source file exists
            try {
                await (0, promises_1.access)(sourcePath, fs_1.constants.F_OK);
            }
            catch {
                return {
                    success: false,
                    error: `Source file does not exist: ${sourcePath}`
                };
            }
            // Create target directory if it doesn't exist
            await (0, promises_1.mkdir)(targetDir, { recursive: true });
            // Check if target file already exists
            try {
                await (0, promises_1.access)(targetPath, fs_1.constants.F_OK);
                if (!overwrite) {
                    return {
                        success: false,
                        error: `Target file already exists: ${targetPath}. Use overwrite: true to replace it.`
                    };
                }
            }
            catch {
                // Target file doesn't exist, which is fine
            }
            // Copy the file
            await (0, promises_1.copyFile)(sourcePath, targetPath);
            // Preserve permissions if requested
            if (preserve_permissions) {
                const sourceStats = await (0, promises_1.stat)(sourcePath);
                await (0, promises_1.chmod)(targetPath, sourceStats.mode);
            }
            return {
                success: true,
                data: {
                    source_path: sourcePath,
                    target_path: targetPath,
                    overwrite_occurred: overwrite
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
}
exports.CopyFileToDirectoryTool = CopyFileToDirectoryTool;
//# sourceMappingURL=CopyFileToDirectoryTool.js.map