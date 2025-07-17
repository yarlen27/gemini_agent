import { ITool, ToolContext } from '../../../interfaces/ITool';
import { ToolResult } from '../../../../models/ToolResult';
import { SetEnvironmentVariableParams, ReadConfigValueParams, EncryptSecretParams, ValidateRequiredEnvVarsParams, MergeConfigFilesParams } from './types/ConfigurationTypes';
export declare class SetEnvironmentVariableInDotenvTool implements ITool {
    readonly name = "set_environment_variable_in_dotenv";
    execute(params: SetEnvironmentVariableParams, context?: ToolContext): Promise<ToolResult>;
}
export declare class ReadConfigValueFromJsonTool implements ITool {
    readonly name = "read_config_value_from_json";
    execute(params: ReadConfigValueParams, context?: ToolContext): Promise<ToolResult>;
    private getValueByPath;
}
export declare class EncryptSecretWithKeyTool implements ITool {
    readonly name = "encrypt_secret_with_key";
    execute(params: EncryptSecretParams, context?: ToolContext): Promise<ToolResult>;
}
export declare class ValidateRequiredEnvVariablesTool implements ITool {
    readonly name = "validate_required_env_variables";
    execute(params: ValidateRequiredEnvVarsParams, context?: ToolContext): Promise<ToolResult>;
}
export declare class MergeConfigFilesTool implements ITool {
    readonly name = "merge_config_files";
    execute(params: MergeConfigFilesParams, context?: ToolContext): Promise<ToolResult>;
    private deepMerge;
}
//# sourceMappingURL=ConfigurationTool.d.ts.map