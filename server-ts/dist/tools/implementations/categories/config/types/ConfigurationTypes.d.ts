export interface SetEnvironmentVariableParams {
    env_file_path?: string;
    key: string;
    value: string;
    overwrite?: boolean;
    create_if_missing?: boolean;
}
export interface ReadConfigValueParams {
    config_file: string;
    key_path: string;
    default_value?: any;
    validate_schema?: object;
}
export interface EncryptSecretParams {
    secret_value: string;
    encryption_key: string;
    algorithm?: string;
    output_format?: 'base64' | 'hex';
}
export interface ValidateRequiredEnvVarsParams {
    required_vars: string[];
    env_file?: string;
    fail_on_missing?: boolean;
    check_empty?: boolean;
}
export interface MergeConfigFilesParams {
    base_config: string;
    override_configs: string[];
    output_file: string;
    merge_arrays?: 'replace' | 'concat';
    validate_result?: boolean;
}
export interface EncryptionResult {
    encrypted_value: string;
    iv: string;
    auth_tag?: string;
}
export interface ValidationResult {
    missing_vars: string[];
    empty_vars: string[];
    all_valid: boolean;
}
//# sourceMappingURL=ConfigurationTypes.d.ts.map