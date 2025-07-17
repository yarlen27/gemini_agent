export declare class EnvFileParser {
    /**
     * Parse .env file content into key-value pairs
     * @param content - The .env file content
     * @returns Object with parsed environment variables
     */
    static parse(content: string): Record<string, string>;
    /**
     * Convert key-value pairs back to .env file format
     * @param env - Object with environment variables
     * @returns String representation of .env file
     */
    static stringify(env: Record<string, string>): string;
    /**
     * Read and parse .env file
     * @param filePath - Path to the .env file
     * @returns Object with parsed environment variables
     */
    static readEnvFile(filePath: string): Promise<Record<string, string>>;
    /**
     * Write environment variables to .env file
     * @param filePath - Path to the .env file
     * @param env - Object with environment variables
     */
    static writeEnvFile(filePath: string, env: Record<string, string>): Promise<void>;
    /**
     * Set or update a single environment variable in .env file
     * @param filePath - Path to the .env file
     * @param key - Environment variable key
     * @param value - Environment variable value
     * @param overwrite - Whether to overwrite existing value
     * @param createIfMissing - Whether to create file if it doesn't exist
     */
    static setEnvVariable(filePath: string, key: string, value: string, overwrite?: boolean, createIfMissing?: boolean): Promise<void>;
    /**
     * Get the resolved path for .env file
     * @param envFilePath - Optional path to .env file
     * @param workingDirectory - Working directory context
     * @returns Resolved path to .env file
     */
    static getEnvFilePath(envFilePath?: string, workingDirectory?: string): string;
}
//# sourceMappingURL=EnvFileParser.d.ts.map