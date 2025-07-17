import {
    SetEnvironmentVariableInDotenvTool,
    ReadConfigValueFromJsonTool,
    EncryptSecretWithKeyTool,
    ValidateRequiredEnvVariablesTool,
    MergeConfigFilesTool
} from '../../../../src/tools/implementations/categories/config/ConfigurationTool';
import { ToolResult } from '../../../../src/models/ToolResult';
import { writeFileSync, unlinkSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('Configuration Management Tools', () => {
    const testDir = join(__dirname, 'test-config-files');
    const testEnvFile = join(testDir, '.env');
    const testConfigFile = join(testDir, 'config.json');
    const testOutputFile = join(testDir, 'output.json');

    beforeEach(() => {
        // Clean up before each test
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
        mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
        // Clean up after each test
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('SetEnvironmentVariableInDotenvTool', () => {
        let tool: SetEnvironmentVariableInDotenvTool;

        beforeEach(() => {
            tool = new SetEnvironmentVariableInDotenvTool();
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('set_environment_variable_in_dotenv');
        });

        test('should create .env file and set variable', async () => {
            const params = {
                env_file_path: testEnvFile,
                key: 'TEST_VAR',
                value: 'test_value',
                create_if_missing: true
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data?.message).toContain('Environment variable TEST_VAR set successfully');
            expect(existsSync(testEnvFile)).toBe(true);
        });

        test('should update existing variable when overwrite is true', async () => {
            // Create initial .env file
            writeFileSync(testEnvFile, 'TEST_VAR=old_value\n');

            const params = {
                env_file_path: testEnvFile,
                key: 'TEST_VAR',
                value: 'new_value',
                overwrite: true
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data?.value).toBe('ne*****ue'); // Masked for security
        });

        test('should fail when key is empty', async () => {
            const params = {
                env_file_path: testEnvFile,
                key: '',
                value: 'test_value'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Both key and value are required');
        });

        test('should fail with invalid environment variable format', async () => {
            const params = {
                env_file_path: testEnvFile,
                key: 'invalid-key',
                value: 'test_value'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid environment variable format');
        });

        test('should work with working directory context', async () => {
            const params = {
                key: 'TEST_VAR',
                value: 'test_value'
            };

            const context = { workingDirectory: testDir };
            const result: ToolResult = await tool.execute(params, context);

            expect(result.success).toBe(true);
            expect(existsSync(join(testDir, '.env'))).toBe(true);
        });
    });

    describe('ReadConfigValueFromJsonTool', () => {
        let tool: ReadConfigValueFromJsonTool;

        beforeEach(() => {
            tool = new ReadConfigValueFromJsonTool();
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('read_config_value_from_json');
        });

        test('should read simple config value', async () => {
            const config = {
                database: {
                    host: 'localhost',
                    port: 5432
                }
            };
            writeFileSync(testConfigFile, JSON.stringify(config));

            const params = {
                config_file: testConfigFile,
                key_path: 'database.host'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data?.value).toBe('localhost');
            expect(result.data?.found).toBe(true);
        });

        test('should return default value when key not found', async () => {
            const config = { existing: 'value' };
            writeFileSync(testConfigFile, JSON.stringify(config));

            const params = {
                config_file: testConfigFile,
                key_path: 'nonexistent.key',
                default_value: 'default'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data?.value).toBe('default');
            expect(result.data?.found).toBe(false);
        });

        test('should fail with invalid JSON', async () => {
            writeFileSync(testConfigFile, 'invalid json');

            const params = {
                config_file: testConfigFile,
                key_path: 'key'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('read_config_value_from_json');
        });

        test('should fail when config_file is empty', async () => {
            const params = {
                config_file: '',
                key_path: 'key'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Both config_file and key_path are required');
        });

        test('should work with working directory context', async () => {
            const config = { test: 'value' };
            writeFileSync(testConfigFile, JSON.stringify(config));

            const params = {
                config_file: 'config.json',
                key_path: 'test'
            };

            const context = { workingDirectory: testDir };
            const result: ToolResult = await tool.execute(params, context);

            expect(result.success).toBe(true);
            expect(result.data?.value).toBe('value');
        });
    });

    describe('EncryptSecretWithKeyTool', () => {
        let tool: EncryptSecretWithKeyTool;

        beforeEach(() => {
            tool = new EncryptSecretWithKeyTool();
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('encrypt_secret_with_key');
        });

        test('should encrypt secret successfully', async () => {
            const params = {
                secret_value: 'my-secret-password',
                encryption_key: 'StrongKey123!@#'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data?.encrypted_value).toBeDefined();
            expect(result.data?.iv).toBeDefined();
            expect(result.data?.auth_tag).toBeDefined();
            expect(result.data?.algorithm).toBe('aes-256-gcm');
            expect(result.data?.output_format).toBe('base64');
        });

        test('should fail with weak encryption key', async () => {
            const params = {
                secret_value: 'my-secret',
                encryption_key: 'weak'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Encryption key is too weak');
        });

        test('should fail when secret_value is empty', async () => {
            const params = {
                secret_value: '',
                encryption_key: 'StrongKey123!@#'
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Both secret_value and encryption_key are required');
        });

        test('should work with different output formats', async () => {
            const params = {
                secret_value: 'my-secret-password',
                encryption_key: 'StrongKey123!@#',
                output_format: 'hex' as const
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data?.output_format).toBe('hex');
        });
    });

    describe('ValidateRequiredEnvVariablesTool', () => {
        let tool: ValidateRequiredEnvVariablesTool;

        beforeEach(() => {
            tool = new ValidateRequiredEnvVariablesTool();
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('validate_required_env_variables');
        });

        test('should validate existing environment variables', async () => {
            // Set test environment variables
            process.env.TEST_VAR1 = 'value1';
            process.env.TEST_VAR2 = 'value2';

            const params = {
                required_vars: ['TEST_VAR1', 'TEST_VAR2']
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data?.all_valid).toBe(true);
            expect(result.data?.missing_vars).toEqual([]);
            expect(result.data?.empty_vars).toEqual([]);

            // Clean up
            delete process.env.TEST_VAR1;
            delete process.env.TEST_VAR2;
        });

        test('should detect missing variables', async () => {
            const params = {
                required_vars: ['MISSING_VAR1', 'MISSING_VAR2']
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data?.all_valid).toBe(false);
            expect(result.data?.missing_vars).toContain('MISSING_VAR1');
            expect(result.data?.missing_vars).toContain('MISSING_VAR2');
        });

        test('should fail when fail_on_missing is true and variables are missing', async () => {
            const params = {
                required_vars: ['MISSING_VAR'],
                fail_on_missing: true
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing variables: MISSING_VAR');
        });

        test('should validate from .env file', async () => {
            writeFileSync(testEnvFile, 'TEST_VAR=test_value\n');

            const params = {
                required_vars: ['TEST_VAR'],
                env_file: testEnvFile
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data?.all_valid).toBe(true);
        });

        test('should fail with empty required_vars array', async () => {
            const params = {
                required_vars: []
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('required_vars must be a non-empty array');
        });

        test('should detect empty variables when check_empty is true', async () => {
            process.env.EMPTY_VAR = '';

            const params = {
                required_vars: ['EMPTY_VAR'],
                check_empty: true
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data?.all_valid).toBe(false);
            expect(result.data?.empty_vars).toContain('EMPTY_VAR');

            // Clean up
            delete process.env.EMPTY_VAR;
        });
    });

    describe('MergeConfigFilesTool', () => {
        let tool: MergeConfigFilesTool;

        beforeEach(() => {
            tool = new MergeConfigFilesTool();
        });

        test('should have correct name', () => {
            expect(tool.name).toBe('merge_config_files');
        });

        test('should merge configuration files successfully', async () => {
            const baseConfig = {
                database: { host: 'localhost', port: 5432 },
                api: { version: 'v1' }
            };

            const overrideConfig = {
                database: { host: 'production.db.com' },
                api: { timeout: 30000 }
            };

            const baseFile = join(testDir, 'base.json');
            const overrideFile = join(testDir, 'override.json');

            writeFileSync(baseFile, JSON.stringify(baseConfig));
            writeFileSync(overrideFile, JSON.stringify(overrideConfig));

            const params = {
                base_config: baseFile,
                override_configs: [overrideFile],
                output_file: testOutputFile
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);
            expect(result.data?.message).toContain('Configuration files merged successfully');
            expect(existsSync(testOutputFile)).toBe(true);

            // Verify merged content
            const mergedContent = JSON.parse(require('fs').readFileSync(testOutputFile, 'utf-8'));
            expect(mergedContent.database.host).toBe('production.db.com');
            expect(mergedContent.database.port).toBe(5432);
            expect(mergedContent.api.version).toBe('v1');
            expect(mergedContent.api.timeout).toBe(30000);
        });

        test('should handle array merging with replace strategy', async () => {
            const baseConfig = { items: ['item1', 'item2'] };
            const overrideConfig = { items: ['item3', 'item4'] };

            const baseFile = join(testDir, 'base.json');
            const overrideFile = join(testDir, 'override.json');

            writeFileSync(baseFile, JSON.stringify(baseConfig));
            writeFileSync(overrideFile, JSON.stringify(overrideConfig));

            const params = {
                base_config: baseFile,
                override_configs: [overrideFile],
                output_file: testOutputFile,
                merge_arrays: 'replace' as const
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);

            const mergedContent = JSON.parse(require('fs').readFileSync(testOutputFile, 'utf-8'));
            expect(mergedContent.items).toEqual(['item3', 'item4']);
        });

        test('should handle array merging with concat strategy', async () => {
            const baseConfig = { items: ['item1', 'item2'] };
            const overrideConfig = { items: ['item3', 'item4'] };

            const baseFile = join(testDir, 'base.json');
            const overrideFile = join(testDir, 'override.json');

            writeFileSync(baseFile, JSON.stringify(baseConfig));
            writeFileSync(overrideFile, JSON.stringify(overrideConfig));

            const params = {
                base_config: baseFile,
                override_configs: [overrideFile],
                output_file: testOutputFile,
                merge_arrays: 'concat' as const
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(true);

            const mergedContent = JSON.parse(require('fs').readFileSync(testOutputFile, 'utf-8'));
            expect(mergedContent.items).toEqual(['item1', 'item2', 'item3', 'item4']);
        });

        test('should fail when base_config is empty', async () => {
            const params = {
                base_config: '',
                override_configs: ['override.json'],
                output_file: testOutputFile
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('base_config, override_configs, and output_file are required');
        });

        test('should fail when override_configs is empty array', async () => {
            const params = {
                base_config: 'base.json',
                override_configs: [],
                output_file: testOutputFile
            };

            const result: ToolResult = await tool.execute(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('override_configs must be a non-empty array');
        });

        test('should work with working directory context', async () => {
            const baseConfig = { test: 'value' };
            const overrideConfig = { test: 'overridden' };

            writeFileSync(join(testDir, 'base.json'), JSON.stringify(baseConfig));
            writeFileSync(join(testDir, 'override.json'), JSON.stringify(overrideConfig));

            const params = {
                base_config: 'base.json',
                override_configs: ['override.json'],
                output_file: 'output.json'
            };

            const context = { workingDirectory: testDir };
            const result: ToolResult = await tool.execute(params, context);

            expect(result.success).toBe(true);
            expect(existsSync(join(testDir, 'output.json'))).toBe(true);
        });
    });
});