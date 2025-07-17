import { EncryptionResult } from '../types/ConfigurationTypes';
export declare class ConfigEncryption {
    private static readonly DEFAULT_ALGORITHM;
    private static readonly DEFAULT_OUTPUT_FORMAT;
    private static readonly SALT_LENGTH;
    private static readonly IV_LENGTH;
    private static readonly TAG_LENGTH;
    private static readonly PBKDF2_ITERATIONS;
    /**
     * Encrypt a secret value using AES-256-GCM
     * @param secretValue - The value to encrypt
     * @param encryptionKey - The encryption key or passphrase
     * @param algorithm - The encryption algorithm to use
     * @param outputFormat - The output format (base64 or hex)
     * @returns Encryption result with encrypted value, IV, and auth tag
     */
    static encryptSecret(secretValue: string, encryptionKey: string, algorithm?: string, outputFormat?: 'base64' | 'hex'): EncryptionResult;
    /**
     * Decrypt a secret value using AES-256-GCM
     * @param encryptedData - The encrypted data
     * @param encryptionKey - The encryption key or passphrase
     * @param algorithm - The encryption algorithm used
     * @param outputFormat - The format of the encrypted data
     * @returns Decrypted secret value
     */
    static decryptSecret(encryptedData: string, encryptionKey: string, algorithm?: string, outputFormat?: 'base64' | 'hex'): string;
    /**
     * Validate encryption key strength
     * @param encryptionKey - The encryption key to validate
     * @returns Whether the key is strong enough
     */
    static validateKeyStrength(encryptionKey: string): boolean;
    /**
     * Generate a secure random key for encryption
     * @param length - The length of the key to generate
     * @returns A secure random key
     */
    static generateSecureKey(length?: number): string;
    /**
     * Hash a configuration value for comparison
     * @param value - The value to hash
     * @returns SHA-256 hash of the value
     */
    static hashValue(value: string): string;
    /**
     * Mask sensitive data for logging
     * @param value - The value to mask
     * @returns Masked value for safe logging
     */
    static maskSensitiveData(value: string): string;
}
//# sourceMappingURL=ConfigEncryption.d.ts.map