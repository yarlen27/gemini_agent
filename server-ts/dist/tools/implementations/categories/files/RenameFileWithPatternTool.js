"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenameFileWithPatternTool = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const fs_1 = require("fs");
class RenameFileWithPatternTool {
    constructor() {
        this.name = 'rename_file_with_pattern';
        this.description = 'Rename files using pattern matching and replacement';
        this.schema = {
            type: 'object',
            properties: {
                file_path: { type: 'string', description: 'File to rename' },
                pattern: { type: 'string', description: 'Pattern to match (regex supported)' },
                replacement: { type: 'string', description: 'Replacement pattern' },
                backup_original: { type: 'boolean', description: 'Create backup before rename', default: false }
            },
            required: ['file_path', 'pattern', 'replacement'],
            additionalProperties: false
        };
    }
    async execute(params, context) {
        try {
            const { file_path, pattern, replacement, backup_original = false } = params;
            if (!file_path || !pattern || replacement === undefined) {
                return {
                    success: false,
                    error: 'file_path, pattern, and replacement are required'
                };
            }
            const filePath = this.resolvePath(file_path, context);
            const fileName = (0, path_1.basename)(filePath);
            const fileDir = (0, path_1.dirname)(filePath);
            // Check if file exists
            try {
                await (0, promises_1.access)(filePath, fs_1.constants.F_OK);
            }
            catch {
                return {
                    success: false,
                    error: `File does not exist: ${filePath}`
                };
            }
            // Apply pattern replacement
            const regex = new RegExp(pattern, 'g');
            const newFileName = fileName.replace(regex, replacement);
            if (newFileName === fileName) {
                return {
                    success: false,
                    error: `Pattern '${pattern}' did not match anything in filename '${fileName}'`
                };
            }
            const newFilePath = (0, path_1.join)(fileDir, newFileName);
            // Check if target file already exists
            try {
                await (0, promises_1.access)(newFilePath, fs_1.constants.F_OK);
                return {
                    success: false,
                    error: `Target file already exists: ${newFilePath}`
                };
            }
            catch {
                // Target file doesn't exist, which is fine
            }
            // Create backup if requested
            if (backup_original) {
                const backupPath = `${filePath}.backup`;
                await (0, promises_1.copyFile)(filePath, backupPath);
            }
            // Rename the file
            await (0, promises_1.rename)(filePath, newFilePath);
            return {
                success: true,
                data: {
                    original_path: filePath,
                    new_path: newFilePath,
                    backup_created: backup_original,
                    backup_path: backup_original ? `${filePath}.backup` : null
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
exports.RenameFileWithPatternTool = RenameFileWithPatternTool;
//# sourceMappingURL=RenameFileWithPatternTool.js.map