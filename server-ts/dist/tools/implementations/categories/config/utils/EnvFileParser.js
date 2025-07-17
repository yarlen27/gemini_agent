"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvFileParser = void 0;
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const path_1 = require("path");
class EnvFileParser {
    /**
     * Parse .env file content into key-value pairs
     * @param content - The .env file content
     * @returns Object with parsed environment variables
     */
    static parse(content) {
        const env = {};
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }
            // Find the first = character
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex === -1) {
                continue;
            }
            const key = trimmedLine.substring(0, equalIndex).trim();
            let value = trimmedLine.substring(equalIndex + 1).trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[key] = value;
        }
        return env;
    }
    /**
     * Convert key-value pairs back to .env file format
     * @param env - Object with environment variables
     * @returns String representation of .env file
     */
    static stringify(env) {
        const lines = [];
        for (const [key, value] of Object.entries(env)) {
            // Quote values that contain spaces or special characters
            const needsQuotes = /\s|#|=/.test(value);
            const formattedValue = needsQuotes ? `"${value}"` : value;
            lines.push(`${key}=${formattedValue}`);
        }
        return lines.join('\n');
    }
    /**
     * Read and parse .env file
     * @param filePath - Path to the .env file
     * @returns Object with parsed environment variables
     */
    static async readEnvFile(filePath) {
        if (!(0, fs_1.existsSync)(filePath)) {
            return {};
        }
        const content = await (0, promises_1.readFile)(filePath, 'utf-8');
        return this.parse(content);
    }
    /**
     * Write environment variables to .env file
     * @param filePath - Path to the .env file
     * @param env - Object with environment variables
     */
    static async writeEnvFile(filePath, env) {
        const content = this.stringify(env);
        await (0, promises_1.writeFile)(filePath, content, 'utf-8');
    }
    /**
     * Set or update a single environment variable in .env file
     * @param filePath - Path to the .env file
     * @param key - Environment variable key
     * @param value - Environment variable value
     * @param overwrite - Whether to overwrite existing value
     * @param createIfMissing - Whether to create file if it doesn't exist
     */
    static async setEnvVariable(filePath, key, value, overwrite = true, createIfMissing = true) {
        let env = {};
        // Read existing file if it exists
        if ((0, fs_1.existsSync)(filePath)) {
            env = await this.readEnvFile(filePath);
        }
        else if (!createIfMissing) {
            throw new Error(`Environment file ${filePath} does not exist`);
        }
        // Check if key already exists
        if (key in env && !overwrite) {
            throw new Error(`Environment variable ${key} already exists`);
        }
        // Set the new value
        env[key] = value;
        // Write back to file
        await this.writeEnvFile(filePath, env);
    }
    /**
     * Get the resolved path for .env file
     * @param envFilePath - Optional path to .env file
     * @param workingDirectory - Working directory context
     * @returns Resolved path to .env file
     */
    static getEnvFilePath(envFilePath, workingDirectory) {
        const defaultPath = '.env';
        const targetPath = envFilePath || defaultPath;
        if (workingDirectory) {
            return (0, path_1.join)(workingDirectory, targetPath);
        }
        return targetPath;
    }
}
exports.EnvFileParser = EnvFileParser;
//# sourceMappingURL=EnvFileParser.js.map