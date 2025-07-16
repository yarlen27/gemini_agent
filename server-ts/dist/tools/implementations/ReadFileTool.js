"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadFileTool = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
class ReadFileTool {
    constructor() {
        this.name = 'read_file';
    }
    async execute(args, context) {
        try {
            if (!args.file_path || args.file_path.trim() === '') {
                return {
                    success: false,
                    error: 'File path cannot be empty'
                };
            }
            // Resolve file path relative to working directory
            let fullPath = args.file_path;
            if (context?.workingDirectory) {
                // If path is relative, join with working directory
                if (!args.file_path.startsWith('/')) {
                    fullPath = (0, path_1.join)(context.workingDirectory, args.file_path);
                }
                else {
                    // If path is absolute, still ensure it's within working directory for security
                    fullPath = (0, path_1.resolve)(context.workingDirectory, '.' + args.file_path);
                }
            }
            const content = await (0, promises_1.readFile)(fullPath, 'utf-8');
            return {
                success: true,
                data: content
            };
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return {
                    success: false,
                    error: 'File not found'
                };
            }
            return {
                success: false,
                error: error.message
            };
        }
    }
}
exports.ReadFileTool = ReadFileTool;
//# sourceMappingURL=ReadFileTool.js.map