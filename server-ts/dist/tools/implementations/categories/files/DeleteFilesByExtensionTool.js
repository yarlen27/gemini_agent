"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteFilesByExtensionTool = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const fs_1 = require("fs");
class DeleteFilesByExtensionTool {
    constructor() {
        this.name = 'delete_files_by_extension';
        this.description = 'Delete files by extension with safety confirmations';
        this.schema = {
            type: 'object',
            properties: {
                directory: { type: 'string', description: 'Directory to search' },
                extension: { type: 'string', description: 'File extension to delete' },
                recursive: { type: 'boolean', description: 'Search subdirectories', default: false },
                dry_run: { type: 'boolean', description: 'Show what would be deleted without deleting', default: false },
                confirm_deletion: { type: 'boolean', description: 'Must be true to confirm destruction' }
            },
            required: ['directory', 'extension', 'confirm_deletion'],
            additionalProperties: false
        };
    }
    async execute(params, context) {
        try {
            const { directory, extension, recursive = false, dry_run = false, confirm_deletion } = params;
            if (!directory || !extension) {
                return {
                    success: false,
                    error: 'directory and extension are required'
                };
            }
            if (!confirm_deletion) {
                return {
                    success: false,
                    error: 'confirm_deletion must be true to proceed with file deletion'
                };
            }
            const dirPath = this.resolvePath(directory, context);
            // Check if directory exists
            try {
                await (0, promises_1.access)(dirPath, fs_1.constants.F_OK);
            }
            catch {
                return {
                    success: false,
                    error: `Directory does not exist: ${dirPath}`
                };
            }
            const filesToDelete = [];
            await this.findFilesByExtension(dirPath, extension, recursive, filesToDelete);
            if (filesToDelete.length === 0) {
                return {
                    success: true,
                    data: {
                        files_deleted: [],
                        total_count: 0,
                        dry_run: dry_run
                    }
                };
            }
            // Log warning for bulk operations
            if (filesToDelete.length > 10) {
                console.warn(`WARNING: About to delete ${filesToDelete.length} files with extension ${extension}`);
            }
            if (dry_run) {
                return {
                    success: true,
                    data: {
                        files_to_delete: filesToDelete,
                        total_count: filesToDelete.length,
                        dry_run: true
                    }
                };
            }
            // Actually delete the files
            const deletedFiles = [];
            for (const file of filesToDelete) {
                try {
                    await (0, promises_1.unlink)(file);
                    deletedFiles.push(file);
                }
                catch (error) {
                    console.warn(`Failed to delete file ${file}: ${error.message}`);
                }
            }
            return {
                success: true,
                data: {
                    files_deleted: deletedFiles,
                    total_count: deletedFiles.length,
                    dry_run: false
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
    async findFilesByExtension(dirPath, extension, recursive, results) {
        const entries = await (0, promises_1.readdir)(dirPath);
        for (const entry of entries) {
            const entryPath = (0, path_1.join)(dirPath, entry);
            const stats = await (0, promises_1.stat)(entryPath);
            if (stats.isDirectory() && recursive) {
                await this.findFilesByExtension(entryPath, extension, recursive, results);
            }
            else if (stats.isFile() && (0, path_1.extname)(entry) === (extension.startsWith('.') ? extension : `.${extension}`)) {
                results.push(entryPath);
            }
        }
    }
}
exports.DeleteFilesByExtensionTool = DeleteFilesByExtensionTool;
//# sourceMappingURL=DeleteFilesByExtensionTool.js.map