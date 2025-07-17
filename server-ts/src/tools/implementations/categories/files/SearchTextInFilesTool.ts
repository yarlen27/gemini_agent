import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { SearchTextInFilesParams, SearchResult } from './types/FileManipulationTypes';
import { readdir, stat, readFile, access } from 'fs/promises';
import { join, resolve, extname } from 'path';
import { constants } from 'fs';

export class SearchTextInFilesTool implements ITool {
    readonly name = 'search_text_in_files';
    readonly description = 'Search for text patterns across multiple files with results';
    
    readonly schema = {
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

    async execute(params: SearchTextInFilesParams, context: ToolContext): Promise<ToolResult> {
        try {
            const { 
                directory, 
                search_pattern, 
                file_extensions = [], 
                recursive = true, 
                case_sensitive = false, 
                max_results = 100 
            } = params;
            
            if (!directory || !search_pattern) {
                return {
                    success: false,
                    error: 'directory and search_pattern are required'
                };
            }

            const dirPath = this.resolvePath(directory, context);
            
            // Check if directory exists
            try {
                await access(dirPath, constants.F_OK);
            } catch {
                return {
                    success: false,
                    error: `Directory does not exist: ${dirPath}`
                };
            }

            const results: SearchResult[] = [];
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
        } catch (error: any) {
            return {
                success: false,
                error: `Error in ${this.name}: ${error.message}`
            };
        }
    }

    private resolvePath(path: string, context?: ToolContext): string {
        if (context?.workingDirectory) {
            if (!path.startsWith('/') && !path.startsWith('\\')) {
                return join(context.workingDirectory, path);
            } else {
                return resolve(context.workingDirectory, '.' + path);
            }
        }
        return path;
    }

    private async searchInDirectory(
        dirPath: string, 
        regex: RegExp, 
        extensions: string[], 
        recursive: boolean, 
        results: SearchResult[], 
        maxResults: number
    ): Promise<void> {
        if (results.length >= maxResults) return;
        
        const entries = await readdir(dirPath);
        
        for (const entry of entries) {
            if (results.length >= maxResults) break;
            
            const entryPath = join(dirPath, entry);
            const stats = await stat(entryPath);
            
            if (stats.isDirectory() && recursive) {
                await this.searchInDirectory(entryPath, regex, extensions, recursive, results, maxResults);
            } else if (stats.isFile()) {
                const ext = extname(entry);
                if (extensions.length === 0 || extensions.includes(ext) || extensions.includes(ext.substring(1))) {
                    await this.searchInFile(entryPath, regex, results, maxResults);
                }
            }
        }
    }

    private async searchInFile(
        filePath: string, 
        regex: RegExp, 
        results: SearchResult[], 
        maxResults: number
    ): Promise<void> {
        if (results.length >= maxResults) return;
        
        try {
            const content = await readFile(filePath, 'utf-8');
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
                    if (!regex.global) break;
                }
            }
        } catch (error) {
            // Skip files that can't be read (binary files, permission issues, etc.)
            console.warn(`Skipping file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}