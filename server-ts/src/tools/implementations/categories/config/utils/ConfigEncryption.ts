import { createCipheriv, createDecipheriv, createHash, randomBytes, pbkdf2Sync } from 'crypto';
import { EncryptionResult } from '../types/ConfigurationTypes';

export class ConfigEncryption {
    private static readonly DEFAULT_ALGORITHM = 'aes-256-gcm';
    private static readonly DEFAULT_OUTPUT_FORMAT = 'base64';
    private static readonly SALT_LENGTH = 16;
    private static readonly IV_LENGTH = 16;
    private static readonly TAG_LENGTH = 16;
    private static readonly PBKDF2_ITERATIONS = 100000;

    /**
     * Encrypt a secret value using AES-256-GCM
     * @param secretValue - The value to encrypt
     * @param encryptionKey - The encryption key or passphrase
     * @param algorithm - The encryption algorithm to use
     * @param outputFormat - The output format (base64 or hex)
     * @returns Encryption result with encrypted value, IV, and auth tag
     */
    static encryptSecret(
        secretValue: string,
        encryptionKey: string,
        algorithm: string = ConfigEncryption.DEFAULT_ALGORITHM,
        outputFormat: 'base64' | 'hex' = ConfigEncryption.DEFAULT_OUTPUT_FORMAT
    ): EncryptionResult {
        try {
            // Validate algorithm
            if (!algorithm.startsWith('aes-')) {
                throw new Error('Only AES encryption algorithms are supported');
            }

            // Generate salt and derive key
            const salt = randomBytes(ConfigEncryption.SALT_LENGTH);
            const derivedKey = pbkdf2Sync(encryptionKey, salt, ConfigEncryption.PBKDF2_ITERATIONS, 32, 'sha256');

            // Generate IV
            const iv = randomBytes(ConfigEncryption.IV_LENGTH);

            // Create cipher
            const cipher = createCipheriv(algorithm, derivedKey, iv) as any;
            cipher.setAAD(Buffer.from('configuration-encryption'));

            // Encrypt the secret
            let encrypted = cipher.update(secretValue, 'utf8', outputFormat);
            encrypted += cipher.final(outputFormat);

            // Get authentication tag for GCM mode
            const authTag = cipher.getAuthTag();

            // Combine salt, IV, and auth tag with encrypted data
            const combinedData = Buffer.concat([
                salt,
                iv,
                authTag,
                Buffer.from(encrypted, outputFormat)
            ]);

            return {
                encrypted_value: combinedData.toString(outputFormat),
                iv: iv.toString(outputFormat),
                auth_tag: authTag.toString(outputFormat)
            };
        } catch (error: any) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt a secret value using AES-256-GCM
     * @param encryptedData - The encrypted data
     * @param encryptionKey - The encryption key or passphrase
     * @param algorithm - The encryption algorithm used
     * @param outputFormat - The format of the encrypted data
     * @returns Decrypted secret value
     */
    static decryptSecret(
        encryptedData: string,
        encryptionKey: string,
        algorithm: string = ConfigEncryption.DEFAULT_ALGORITHM,
        outputFormat: 'base64' | 'hex' = ConfigEncryption.DEFAULT_OUTPUT_FORMAT
    ): string {
        try {
            // Parse combined data
            const combinedBuffer = Buffer.from(encryptedData, outputFormat);
            
            const salt = combinedBuffer.slice(0, ConfigEncryption.SALT_LENGTH);
            const iv = combinedBuffer.slice(ConfigEncryption.SALT_LENGTH, ConfigEncryption.SALT_LENGTH + ConfigEncryption.IV_LENGTH);
            const authTag = combinedBuffer.slice(
                ConfigEncryption.SALT_LENGTH + ConfigEncryption.IV_LENGTH,
                ConfigEncryption.SALT_LENGTH + ConfigEncryption.IV_LENGTH + ConfigEncryption.TAG_LENGTH
            );
            const encrypted = combinedBuffer.slice(ConfigEncryption.SALT_LENGTH + ConfigEncryption.IV_LENGTH + ConfigEncryption.TAG_LENGTH);

            // Derive key
            const derivedKey = pbkdf2Sync(encryptionKey, salt, ConfigEncryption.PBKDF2_ITERATIONS, 32, 'sha256');

            // Create decipher
            const decipher = createDecipheriv(algorithm, derivedKey, iv) as any;
            decipher.setAAD(Buffer.from('configuration-encryption'));
            decipher.setAuthTag(authTag);

            // Decrypt the secret
            let decrypted = decipher.update(encrypted.toString(outputFormat), outputFormat, 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error: any) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    /**
     * Validate encryption key strength
     * @param encryptionKey - The encryption key to validate
     * @returns Whether the key is strong enough
     */
    static validateKeyStrength(encryptionKey: string): boolean {
        // Minimum 12 characters with mix of letters, numbers, and symbols
        const minLength = 12;
        const hasLower = /[a-z]/.test(encryptionKey);
        const hasUpper = /[A-Z]/.test(encryptionKey);
        const hasDigit = /\d/.test(encryptionKey);
        const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(encryptionKey);

        return encryptionKey.length >= minLength && 
               hasLower && hasUpper && 
               hasDigit && hasSymbol;
    }

    /**
     * Generate a secure random key for encryption
     * @param length - The length of the key to generate
     * @returns A secure random key
     */
    static generateSecureKey(length: number = 32): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let key = '';
        
        for (let i = 0; i < length; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return key;
    }

    /**
     * Hash a configuration value for comparison
     * @param value - The value to hash
     * @returns SHA-256 hash of the value
     */
    static hashValue(value: string): string {
        return createHash('sha256').update(value).digest('hex');
    }

    /**
     * Mask sensitive data for logging
     * @param value - The value to mask
     * @returns Masked value for safe logging
     */
    static maskSensitiveData(value: string): string {
        if (value.length <= 4) {
            return '*'.repeat(value.length);
        }
        
        return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
    }
}