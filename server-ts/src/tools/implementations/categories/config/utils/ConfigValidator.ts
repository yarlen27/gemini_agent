import { ValidationResult } from '../types/ConfigurationTypes';
import { EnvFileParser } from './EnvFileParser';

export class ConfigValidator {
    /**
     * Validate that required environment variables are set
     * @param requiredVars - Array of required variable names
     * @param envFile - Optional path to .env file to check
     * @param checkEmpty - Whether to validate variables are not empty
     * @param workingDirectory - Working directory context
     * @returns Validation result with missing and empty variables
     */
    static async validateRequiredEnvVars(
        requiredVars: string[],
        envFile?: string,
        checkEmpty: boolean = false,
        workingDirectory?: string
    ): Promise<ValidationResult> {
        const missingVars: string[] = [];
        const emptyVars: string[] = [];

        // Get environment variables from file if specified
        let envVars: Record<string, string> = {};
        if (envFile) {
            const envFilePath = EnvFileParser.getEnvFilePath(envFile, workingDirectory);
            envVars = await EnvFileParser.readEnvFile(envFilePath);
        }

        // Check each required variable
        for (const varName of requiredVars) {
            let value: string | undefined;

            // Check .env file first, then process.env
            if (envFile && varName in envVars) {
                value = envVars[varName];
            } else {
                value = process.env[varName];
            }

            // Check if variable is missing
            if (value === undefined) {
                missingVars.push(varName);
                continue;
            }

            // Check if variable is empty (if checkEmpty is true)
            if (checkEmpty && (!value || value.trim() === '')) {
                emptyVars.push(varName);
            }
        }

        return {
            missing_vars: missingVars,
            empty_vars: emptyVars,
            all_valid: missingVars.length === 0 && emptyVars.length === 0
        };
    }

    /**
     * Validate JSON configuration against a schema
     * @param config - The configuration object to validate
     * @param schema - JSON schema to validate against
     * @returns Whether the configuration is valid
     */
    static validateJsonSchema(config: any, schema: any): boolean {
        try {
            // Basic JSON schema validation
            return this.validateObjectAgainstSchema(config, schema);
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate an object against a simple JSON schema
     * @param obj - The object to validate
     * @param schema - The schema to validate against
     * @returns Whether the object is valid
     */
    private static validateObjectAgainstSchema(obj: any, schema: any): boolean {
        if (!schema || typeof schema !== 'object') {
            return true;
        }

        // Check type
        if (schema.type) {
            if (!this.validateType(obj, schema.type)) {
                return false;
            }
        }

        // Check required properties
        if (schema.required && Array.isArray(schema.required)) {
            for (const prop of schema.required) {
                if (!(prop in obj)) {
                    return false;
                }
            }
        }

        // Check properties
        if (schema.properties && typeof schema.properties === 'object') {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (key in obj) {
                    if (!this.validateObjectAgainstSchema(obj[key], propSchema)) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Validate the type of a value
     * @param value - The value to validate
     * @param expectedType - The expected type
     * @returns Whether the value matches the expected type
     */
    private static validateType(value: any, expectedType: string): boolean {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number';
            case 'boolean':
                return typeof value === 'boolean';
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            case 'array':
                return Array.isArray(value);
            case 'null':
                return value === null;
            default:
                return true;
        }
    }

    /**
     * Validate environment variable format
     * @param key - Environment variable key
     * @param value - Environment variable value
     * @returns Whether the key and value are valid
     */
    static validateEnvVariable(key: string, value: string): boolean {
        // Key validation: should be uppercase, alphanumeric with underscores
        const keyPattern = /^[A-Z_][A-Z0-9_]*$/;
        if (!keyPattern.test(key)) {
            return false;
        }

        // Value validation: should not contain newlines or null bytes
        if (value.includes('\n') || value.includes('\0')) {
            return false;
        }

        return true;
    }

    /**
     * Validate URL format
     * @param url - URL to validate
     * @returns Whether the URL is valid
     */
    static validateUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate email format
     * @param email - Email to validate
     * @returns Whether the email is valid
     */
    static validateEmail(email: string): boolean {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    /**
     * Validate port number
     * @param port - Port number to validate
     * @returns Whether the port is valid
     */
    static validatePort(port: string | number): boolean {
        const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
        return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
    }

    /**
     * Validate configuration file path
     * @param filePath - File path to validate
     * @returns Whether the file path is valid
     */
    static validateConfigFilePath(filePath: string): boolean {
        // Check for common configuration file extensions
        const validExtensions = ['.json', '.yaml', '.yml', '.env', '.config', '.conf'];
        const hasValidExtension = validExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
        
        // Check for invalid characters
        const invalidChars = /[<>:"|?*]/;
        const hasInvalidChars = invalidChars.test(filePath);
        
        return hasValidExtension && !hasInvalidChars && filePath.length > 0;
    }

    /**
     * Sanitize configuration value
     * @param value - Value to sanitize
     * @returns Sanitized value
     */
    static sanitizeValue(value: string): string {
        // Remove control characters and normalize whitespace
        return value.replace(/[\x00-\x1F\x7F]/g, '').trim();
    }
}