"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadFileTool = void 0;
const promises_1 = require("fs/promises");
class ReadFileTool {
    constructor() {
        this.name = 'read_file';
    }
    async execute(args) {
        try {
            if (!args.file_path || args.file_path.trim() === '') {
                return {
                    success: false,
                    error: 'File path cannot be empty'
                };
            }
            const content = await (0, promises_1.readFile)(args.file_path, 'utf-8');
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