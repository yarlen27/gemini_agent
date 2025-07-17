import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import {
    SetEnvironmentVariableParams,
    ReadConfigValueParams,
    EncryptSecretParams,
    ValidateRequiredEnvVarsParams,
    MergeConfigFilesParams
} from './types/ConfigurationTypes';
import { EnvFileParser } from './utils/EnvFileParser';
import { ConfigEncryption } from './utils/ConfigEncryption';
import { ConfigValidator } from './utils/ConfigValidator';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export class SetEnvironmentVariableInDotenvTool implements ITool {
    readonly name = 'set_environment_variable_in_dotenv';

    async execute(params: SetEnvironmentVariableParams, context?: ToolContext): Promise<ToolResult> {
        try {
            const {
                env_file_path,
                key,
                value,
                overwrite = true,
                create_if_missing = true
            } = params;

            // Validate parameters
            if (!key || !value) {
                return {
                    success: false,
                    error: 'Both key and value are required'
                };
            }

            // Validate environment variable format
            if (!ConfigValidator.validateEnvVariable(key, value)) {
                return {
                    success: false,
                    error: 'Invalid environment variable format'
                };
            }

            // Get resolved file path
            const filePath = EnvFileParser.getEnvFilePath(env_file_path, context?.workingDirectory);

            // Set the environment variable
            await EnvFileParser.setEnvVariable(filePath, key, value, overwrite, create_if_missing);

            return {
                success: true,
                data: {
                    message: `Environment variable ${key} set successfully in ${filePath}`,
                    file_path: filePath,
                    key,
                    value: ConfigEncryption.maskSensitiveData(value)
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `set_environment_variable_in_dotenv: ${error.message}`
            };
        }
    }
}

export class ReadConfigValueFromJsonTool implements ITool {
    readonly name = 'read_config_value_from_json';

    async execute(params: ReadConfigValueParams, context?: ToolContext): Promise<ToolResult> {
        try {
            const { config_file, key_path, default_value, validate_schema } = params;

            // Validate parameters
            if (!config_file || !key_path) {
                return {
                    success: false,
                    error: 'Both config_file and key_path are required'
                };
            }

            // Validate config file path
            if (!ConfigValidator.validateConfigFilePath(config_file)) {
                return {
                    success: false,
                    error: 'Invalid configuration file path'
                };
            }

            // Resolve file path
            const filePath = context?.workingDirectory ? join(context.workingDirectory, config_file) : config_file;

            // Read and parse JSON config
            const content = await readFile(filePath, 'utf-8');
            const config = JSON.parse(content);

            // Validate schema if provided
            if (validate_schema && !ConfigValidator.validateJsonSchema(config, validate_schema)) {
                return {
                    success: false,
                    error: 'Configuration does not match provided schema'
                };
            }

            // Navigate to the specified key path
            const value = this.getValueByPath(config, key_path, default_value);

            return {
                success: true,
                data: {
                    value,
                    key_path,
                    config_file: filePath,
                    found: value !== default_value
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `read_config_value_from_json: ${error.message}`
            };
        }
    }

    private getValueByPath(obj: any, path: string, defaultValue: any): any {
        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === null || current === undefined || !(key in current)) {
                return defaultValue;
            }
            current = current[key];
        }

        return current;
    }
}

export class EncryptSecretWithKeyTool implements ITool {
    readonly name = 'encrypt_secret_with_key';

    async execute(params: EncryptSecretParams, context?: ToolContext): Promise<ToolResult> {
        try {
            const {
                secret_value,
                encryption_key,
                algorithm = 'aes-256-gcm',
                output_format = 'base64'
            } = params;

            // Validate parameters
            if (!secret_value || !encryption_key) {
                return {
                    success: false,
                    error: 'Both secret_value and encryption_key are required'
                };
            }

            // Validate key strength
            if (!ConfigEncryption.validateKeyStrength(encryption_key)) {
                return {
                    success: false,
                    error: 'Encryption key is too weak. Must be at least 12 characters with mix of letters, numbers, and symbols'
                };
            }

            // Encrypt the secret
            const encryptionResult = ConfigEncryption.encryptSecret(
                secret_value,
                encryption_key,
                algorithm,
                output_format
            );

            return {
                success: true,
                data: {
                    encrypted_value: encryptionResult.encrypted_value,
                    iv: encryptionResult.iv,
                    auth_tag: encryptionResult.auth_tag,
                    algorithm,
                    output_format,
                    original_length: secret_value.length
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `encrypt_secret_with_key: ${error.message}`
            };
        }
    }
}

export class ValidateRequiredEnvVariablesTool implements ITool {
    readonly name = 'validate_required_env_variables';

    async execute(params: ValidateRequiredEnvVarsParams, context?: ToolContext): Promise<ToolResult> {
        try {
            const {
                required_vars,
                env_file,
                fail_on_missing = false,
                check_empty = false
            } = params;

            // Validate parameters
            if (!required_vars || !Array.isArray(required_vars) || required_vars.length === 0) {
                return {
                    success: false,
                    error: 'required_vars must be a non-empty array'
                };
            }

            // Validate each variable name
            for (const varName of required_vars) {
                if (!varName || typeof varName !== 'string') {
                    return {
                        success: false,
                        error: 'All variable names must be non-empty strings'
                    };
                }
            }

            // Validate environment variables
            const validationResult = await ConfigValidator.validateRequiredEnvVars(
                required_vars,
                env_file,
                check_empty,
                context?.workingDirectory
            );

            // Handle fail_on_missing option
            if (fail_on_missing && (!validationResult.all_valid)) {
                const errorMessages = [];
                if (validationResult.missing_vars.length > 0) {
                    errorMessages.push(`Missing variables: ${validationResult.missing_vars.join(', ')}`);
                }
                if (validationResult.empty_vars.length > 0) {
                    errorMessages.push(`Empty variables: ${validationResult.empty_vars.join(', ')}`);
                }
                
                return {
                    success: false,
                    error: errorMessages.join('; ')
                };
            }

            return {
                success: true,
                data: {
                    all_valid: validationResult.all_valid,
                    missing_vars: validationResult.missing_vars,
                    empty_vars: validationResult.empty_vars,
                    total_checked: required_vars.length,
                    env_file: env_file || 'process.env'
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `validate_required_env_variables: ${error.message}`
            };
        }
    }
}

export class MergeConfigFilesTool implements ITool {
    readonly name = 'merge_config_files';

    async execute(params: MergeConfigFilesParams, context?: ToolContext): Promise<ToolResult> {
        try {
            const {
                base_config,
                override_configs,
                output_file,
                merge_arrays = 'replace',
                validate_result = false
            } = params;

            // Validate parameters
            if (!base_config || !override_configs || !output_file) {
                return {
                    success: false,
                    error: 'base_config, override_configs, and output_file are required'
                };
            }

            if (!Array.isArray(override_configs) || override_configs.length === 0) {
                return {
                    success: false,
                    error: 'override_configs must be a non-empty array'
                };
            }

            // Resolve file paths
            const resolveFilePath = (filePath: string) => 
                context?.workingDirectory ? join(context.workingDirectory, filePath) : filePath;

            const baseConfigPath = resolveFilePath(base_config);
            const overrideConfigPaths = override_configs.map(resolveFilePath);
            const outputFilePath = resolveFilePath(output_file);

            // Read and parse base configuration
            const baseContent = await readFile(baseConfigPath, 'utf-8');
            let mergedConfig = JSON.parse(baseContent);

            // Read and merge override configurations
            for (const overridePath of overrideConfigPaths) {
                const overrideContent = await readFile(overridePath, 'utf-8');
                const overrideConfig = JSON.parse(overrideContent);
                
                mergedConfig = this.deepMerge(mergedConfig, overrideConfig, merge_arrays);
            }

            // Validate result if requested
            if (validate_result) {
                // Basic validation - ensure it's a valid JSON object
                if (typeof mergedConfig !== 'object' || mergedConfig === null) {
                    return {
                        success: false,
                        error: 'Merged configuration is not a valid object'
                    };
                }
            }

            // Write merged configuration
            await writeFile(outputFilePath, JSON.stringify(mergedConfig, null, 2), 'utf-8');

            return {
                success: true,
                data: {
                    message: 'Configuration files merged successfully',
                    base_config: baseConfigPath,
                    override_configs: overrideConfigPaths,
                    output_file: outputFilePath,
                    merge_strategy: merge_arrays,
                    config_size: JSON.stringify(mergedConfig).length
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `merge_config_files: ${error.message}`
            };
        }
    }

    private deepMerge(target: any, source: any, mergeArrays: 'replace' | 'concat'): any {
        const result = { ...target };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (Array.isArray(source[key])) {
                    if (Array.isArray(result[key])) {
                        result[key] = mergeArrays === 'concat' 
                            ? [...result[key], ...source[key]]
                            : source[key];
                    } else {
                        result[key] = source[key];
                    }
                } else if (typeof source[key] === 'object' && source[key] !== null) {
                    if (typeof result[key] === 'object' && result[key] !== null) {
                        result[key] = this.deepMerge(result[key], source[key], mergeArrays);
                    } else {
                        result[key] = source[key];
                    }
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }
}