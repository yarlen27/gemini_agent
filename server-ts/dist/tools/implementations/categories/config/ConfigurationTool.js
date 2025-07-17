"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MergeConfigFilesTool = exports.ValidateRequiredEnvVariablesTool = exports.EncryptSecretWithKeyTool = exports.ReadConfigValueFromJsonTool = exports.SetEnvironmentVariableInDotenvTool = void 0;
const EnvFileParser_1 = require("./utils/EnvFileParser");
const ConfigEncryption_1 = require("./utils/ConfigEncryption");
const ConfigValidator_1 = require("./utils/ConfigValidator");
const promises_1 = require("fs/promises");
const path_1 = require("path");
class SetEnvironmentVariableInDotenvTool {
    constructor() {
        this.name = 'set_environment_variable_in_dotenv';
    }
    async execute(params, context) {
        try {
            const { env_file_path, key, value, overwrite = true, create_if_missing = true } = params;
            // Validate parameters
            if (!key || !value) {
                return {
                    success: false,
                    error: 'Both key and value are required'
                };
            }
            // Validate environment variable format
            if (!ConfigValidator_1.ConfigValidator.validateEnvVariable(key, value)) {
                return {
                    success: false,
                    error: 'Invalid environment variable format'
                };
            }
            // Get resolved file path
            const filePath = EnvFileParser_1.EnvFileParser.getEnvFilePath(env_file_path, context?.workingDirectory);
            // Set the environment variable
            await EnvFileParser_1.EnvFileParser.setEnvVariable(filePath, key, value, overwrite, create_if_missing);
            return {
                success: true,
                data: {
                    message: `Environment variable ${key} set successfully in ${filePath}`,
                    file_path: filePath,
                    key,
                    value: ConfigEncryption_1.ConfigEncryption.maskSensitiveData(value)
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `set_environment_variable_in_dotenv: ${error.message}`
            };
        }
    }
}
exports.SetEnvironmentVariableInDotenvTool = SetEnvironmentVariableInDotenvTool;
class ReadConfigValueFromJsonTool {
    constructor() {
        this.name = 'read_config_value_from_json';
    }
    async execute(params, context) {
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
            if (!ConfigValidator_1.ConfigValidator.validateConfigFilePath(config_file)) {
                return {
                    success: false,
                    error: 'Invalid configuration file path'
                };
            }
            // Resolve file path
            const filePath = context?.workingDirectory ? (0, path_1.join)(context.workingDirectory, config_file) : config_file;
            // Read and parse JSON config
            const content = await (0, promises_1.readFile)(filePath, 'utf-8');
            const config = JSON.parse(content);
            // Validate schema if provided
            if (validate_schema && !ConfigValidator_1.ConfigValidator.validateJsonSchema(config, validate_schema)) {
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
        }
        catch (error) {
            return {
                success: false,
                error: `read_config_value_from_json: ${error.message}`
            };
        }
    }
    getValueByPath(obj, path, defaultValue) {
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
exports.ReadConfigValueFromJsonTool = ReadConfigValueFromJsonTool;
class EncryptSecretWithKeyTool {
    constructor() {
        this.name = 'encrypt_secret_with_key';
    }
    async execute(params, context) {
        try {
            const { secret_value, encryption_key, algorithm = 'aes-256-gcm', output_format = 'base64' } = params;
            // Validate parameters
            if (!secret_value || !encryption_key) {
                return {
                    success: false,
                    error: 'Both secret_value and encryption_key are required'
                };
            }
            // Validate key strength
            if (!ConfigEncryption_1.ConfigEncryption.validateKeyStrength(encryption_key)) {
                return {
                    success: false,
                    error: 'Encryption key is too weak. Must be at least 12 characters with mix of letters, numbers, and symbols'
                };
            }
            // Encrypt the secret
            const encryptionResult = ConfigEncryption_1.ConfigEncryption.encryptSecret(secret_value, encryption_key, algorithm, output_format);
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
        }
        catch (error) {
            return {
                success: false,
                error: `encrypt_secret_with_key: ${error.message}`
            };
        }
    }
}
exports.EncryptSecretWithKeyTool = EncryptSecretWithKeyTool;
class ValidateRequiredEnvVariablesTool {
    constructor() {
        this.name = 'validate_required_env_variables';
    }
    async execute(params, context) {
        try {
            const { required_vars, env_file, fail_on_missing = false, check_empty = false } = params;
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
            const validationResult = await ConfigValidator_1.ConfigValidator.validateRequiredEnvVars(required_vars, env_file, check_empty, context?.workingDirectory);
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
        }
        catch (error) {
            return {
                success: false,
                error: `validate_required_env_variables: ${error.message}`
            };
        }
    }
}
exports.ValidateRequiredEnvVariablesTool = ValidateRequiredEnvVariablesTool;
class MergeConfigFilesTool {
    constructor() {
        this.name = 'merge_config_files';
    }
    async execute(params, context) {
        try {
            const { base_config, override_configs, output_file, merge_arrays = 'replace', validate_result = false } = params;
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
            const resolveFilePath = (filePath) => context?.workingDirectory ? (0, path_1.join)(context.workingDirectory, filePath) : filePath;
            const baseConfigPath = resolveFilePath(base_config);
            const overrideConfigPaths = override_configs.map(resolveFilePath);
            const outputFilePath = resolveFilePath(output_file);
            // Read and parse base configuration
            const baseContent = await (0, promises_1.readFile)(baseConfigPath, 'utf-8');
            let mergedConfig = JSON.parse(baseContent);
            // Read and merge override configurations
            for (const overridePath of overrideConfigPaths) {
                const overrideContent = await (0, promises_1.readFile)(overridePath, 'utf-8');
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
            await (0, promises_1.writeFile)(outputFilePath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
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
        }
        catch (error) {
            return {
                success: false,
                error: `merge_config_files: ${error.message}`
            };
        }
    }
    deepMerge(target, source, mergeArrays) {
        const result = { ...target };
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (Array.isArray(source[key])) {
                    if (Array.isArray(result[key])) {
                        result[key] = mergeArrays === 'concat'
                            ? [...result[key], ...source[key]]
                            : source[key];
                    }
                    else {
                        result[key] = source[key];
                    }
                }
                else if (typeof source[key] === 'object' && source[key] !== null) {
                    if (typeof result[key] === 'object' && result[key] !== null) {
                        result[key] = this.deepMerge(result[key], source[key], mergeArrays);
                    }
                    else {
                        result[key] = source[key];
                    }
                }
                else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }
}
exports.MergeConfigFilesTool = MergeConfigFilesTool;
//# sourceMappingURL=ConfigurationTool.js.map