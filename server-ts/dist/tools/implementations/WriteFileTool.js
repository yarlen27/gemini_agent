"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteFileTool = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
class WriteFileTool {
    constructor() {
        this.name = 'write_file';
    }
    async execute(args) {
        try {
            if (!args.file_path || args.file_path.trim() === '') {
                return {
                    success: false,
                    error: 'File path cannot be empty'
                };
            }
            // Ensure directory exists
            const dir = (0, path_1.dirname)(args.file_path);
            await (0, promises_1.mkdir)(dir, { recursive: true });
            // Write file
            await (0, promises_1.writeFile)(args.file_path, args.content || '', 'utf-8');
            return {
                success: true,
                data: `File written successfully: ${args.file_path}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}
exports.WriteFileTool = WriteFileTool;
//# sourceMappingURL=WriteFileTool.js.map