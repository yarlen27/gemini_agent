import { ValidationResult } from '../types/ConfigurationTypes';
export declare class ConfigValidator {
    /**
     * Validate that required environment variables are set
     * @param requiredVars - Array of required variable names
     * @param envFile - Optional path to .env file to check
     * @param checkEmpty - Whether to validate variables are not empty
     * @param workingDirectory - Working directory context
     * @returns Validation result with missing and empty variables
     */
    static validateRequiredEnvVars(requiredVars: string[], envFile?: string, checkEmpty?: boolean, workingDirectory?: string): Promise<ValidationResult>;
    /**
     * Validate JSON configuration against a schema
     * @param config - The configuration object to validate
     * @param schema - JSON schema to validate against
     * @returns Whether the configuration is valid
     */
    static validateJsonSchema(config: any, schema: any): boolean;
    /**
     * Validate an object against a simple JSON schema
     * @param obj - The object to validate
     * @param schema - The schema to validate against
     * @returns Whether the object is valid
     */
    private static validateObjectAgainstSchema;
    /**
     * Validate the type of a value
     * @param value - The value to validate
     * @param expectedType - The expected type
     * @returns Whether the value matches the expected type
     */
    private static validateType;
    /**
     * Validate environment variable format
     * @param key - Environment variable key
     * @param value - Environment variable value
     * @returns Whether the key and value are valid
     */
    static validateEnvVariable(key: string, value: string): boolean;
    /**
     * Validate URL format
     * @param url - URL to validate
     * @returns Whether the URL is valid
     */
    static validateUrl(url: string): boolean;
    /**
     * Validate email format
     * @param email - Email to validate
     * @returns Whether the email is valid
     */
    static validateEmail(email: string): boolean;
    /**
     * Validate port number
     * @param port - Port number to validate
     * @returns Whether the port is valid
     */
    static validatePort(port: string | number): boolean;
    /**
     * Validate configuration file path
     * @param filePath - File path to validate
     * @returns Whether the file path is valid
     */
    static validateConfigFilePath(filePath: string): boolean;
    /**
     * Sanitize configuration value
     * @param value - Value to sanitize
     * @returns Sanitized value
     */
    static sanitizeValue(value: string): string;
}
//# sourceMappingURL=ConfigValidator.d.ts.map