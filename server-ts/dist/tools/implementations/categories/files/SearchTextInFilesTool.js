"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchTextInFilesTool = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const fs_1 = require("fs");
class SearchTextInFilesTool {
    constructor() {
        this.name = 'search_text_in_files';
        this.description = 'Search for text patterns across multiple files with results';
        this.schema = {
            type: 'object',
            properties: {
                directory: { type: 'string', description: 'Directory to search' },
                search_pattern: { type: 'string', description: 'Text pattern to find (regex supported)' },
                file_extensions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Limit search to specific extensions'
                },
                recursive: { type: 'boolean', description: 'Search subdirectories', default: true },
                case_sensitive: { type: 'boolean', description: 'Case-sensitive search', default: false },
                max_results: { type: 'number', description: 'Limit number of results', default: 100 }
            },
            required: ['directory', 'search_pattern'],
            additionalProperties: false
        };
    }
    async execute(params, context) {
        try {
            const { directory, search_pattern, file_extensions = [], recursive = true, case_sensitive = false, max_results = 100 } = params;
            if (!directory || !search_pattern) {
                return {
                    success: false,
                    error: 'directory and search_pattern are required'
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
            const results = [];
            const regex = new RegExp(search_pattern, case_sensitive ? 'g' : 'gi');
            await this.searchInDirectory(dirPath, regex, file_extensions, recursive, results, max_results);
            return {
                success: true,
                data: {
                    results: results,
                    total_matches: results.length,
                    truncated: results.length >= max_results,
                    search_pattern: search_pattern,
                    directory: dirPath
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
            if (!path.startsWith('/') && !path.startsWith('\\')) {
                return (0, path_1.join)(context.workingDirectory, path);
            }
            else {
                return (0, path_1.resolve)(context.workingDirectory, '.' + path);
            }
        }
        return path;
    }
    async searchInDirectory(dirPath, regex, extensions, recursive, results, maxResults) {
        if (results.length >= maxResults)
            return;
        const entries = await (0, promises_1.readdir)(dirPath);
        for (const entry of entries) {
            if (results.length >= maxResults)
                break;
            const entryPath = (0, path_1.join)(dirPath, entry);
            const stats = await (0, promises_1.stat)(entryPath);
            if (stats.isDirectory() && recursive) {
                await this.searchInDirectory(entryPath, regex, extensions, recursive, results, maxResults);
            }
            else if (stats.isFile()) {
                const ext = (0, path_1.extname)(entry);
                if (extensions.length === 0 || extensions.includes(ext) || extensions.includes(ext.substring(1))) {
                    await this.searchInFile(entryPath, regex, results, maxResults);
                }
            }
        }
    }
    async searchInFile(filePath, regex, results, maxResults) {
        if (results.length >= maxResults)
            return;
        try {
            const content = await (0, promises_1.readFile)(filePath, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length && results.length < maxResults; i++) {
                const line = lines[i];
                let match;
                // Reset regex lastIndex to ensure we find all matches
                regex.lastIndex = 0;
                while ((match = regex.exec(line)) !== null && results.length < maxResults) {
                    results.push({
                        file_path: filePath,
                        line_number: i + 1,
                        line_content: line,
                        match: match[0]
                    });
                    // Break if regex doesn't have global flag to avoid infinite loop
                    if (!regex.global)
                        break;
                }
            }
        }
        catch (error) {
            // Skip files that can't be read (binary files, permission issues, etc.)
            console.warn(`Skipping file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.SearchTextInFilesTool = SearchTextInFilesTool;
//# sourceMappingURL=SearchTextInFilesTool.js.map