import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export class EnvFileParser {
    /**
     * Parse .env file content into key-value pairs
     * @param content - The .env file content
     * @returns Object with parsed environment variables
     */
    static parse(content: string): Record<string, string> {
        const env: Record<string, string> = {};
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
    static stringify(env: Record<string, string>): string {
        const lines: string[] = [];

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
    static async readEnvFile(filePath: string): Promise<Record<string, string>> {
        if (!existsSync(filePath)) {
            return {};
        }

        const content = await readFile(filePath, 'utf-8');
        return this.parse(content);
    }

    /**
     * Write environment variables to .env file
     * @param filePath - Path to the .env file
     * @param env - Object with environment variables
     */
    static async writeEnvFile(filePath: string, env: Record<string, string>): Promise<void> {
        const content = this.stringify(env);
        await writeFile(filePath, content, 'utf-8');
    }

    /**
     * Set or update a single environment variable in .env file
     * @param filePath - Path to the .env file
     * @param key - Environment variable key
     * @param value - Environment variable value
     * @param overwrite - Whether to overwrite existing value
     * @param createIfMissing - Whether to create file if it doesn't exist
     */
    static async setEnvVariable(
        filePath: string,
        key: string,
        value: string,
        overwrite: boolean = true,
        createIfMissing: boolean = true
    ): Promise<void> {
        let env: Record<string, string> = {};

        // Read existing file if it exists
        if (existsSync(filePath)) {
            env = await this.readEnvFile(filePath);
        } else if (!createIfMissing) {
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
    static getEnvFilePath(envFilePath?: string, workingDirectory?: string): string {
        const defaultPath = '.env';
        const targetPath = envFilePath || defaultPath;

        if (workingDirectory) {
            return join(workingDirectory, targetPath);
        }

        return targetPath;
    }
}