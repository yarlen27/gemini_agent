"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
class HttpClient {
    constructor(config) {
        this.defaultRetryPolicy = {
            max_retries: 3,
            backoff_factor: 2,
            max_delay: 30000
        };
        this.axiosInstance = axios_1.default.create({
            timeout: 30000,
            ...config,
            // Add request interceptor to measure response time
            transformRequest: [(data, headers) => {
                    headers['X-Request-Start'] = Date.now().toString();
                    return data;
                }]
        });
        // Response interceptor to calculate response time
        this.axiosInstance.interceptors.response.use((response) => {
            const requestStart = parseInt(response.config.headers['X-Request-Start']);
            response.data = {
                ...response.data,
                responseTime: Date.now() - requestStart
            };
            return response;
        }, (error) => {
            const requestStart = parseInt(error.config?.headers?.['X-Request-Start']);
            if (requestStart) {
                error.responseTime = Date.now() - requestStart;
            }
            return Promise.reject(error);
        });
    }
    /**
     * Make HTTP request with retry logic
     */
    async request(config, retryPolicy) {
        const policy = retryPolicy || this.defaultRetryPolicy;
        let lastError;
        for (let attempt = 0; attempt <= policy.max_retries; attempt++) {
            try {
                const startTime = Date.now();
                const response = await this.axiosInstance.request(config);
                const responseTime = Date.now() - startTime;
                return {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    data: response.data,
                    responseTime
                };
            }
            catch (error) {
                lastError = error;
                // Don't retry on client errors (4xx) or if it's the last attempt
                if (lastError.response?.status && lastError.response.status < 500 || attempt === policy.max_retries) {
                    break;
                }
                // Calculate delay for next attempt
                const delay = Math.min(policy.backoff_factor ** attempt * 1000, policy.max_delay);
                await this.sleep(delay);
            }
        }
        // If we get here, all retries failed
        throw lastError;
    }
    /**
     * Add authentication to request config
     */
    addAuthentication(config, auth) {
        config.headers = config.headers || {};
        switch (auth.type) {
            case 'bearer':
                config.headers.Authorization = `Bearer ${auth.token}`;
                break;
            case 'basic':
                const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                config.headers.Authorization = `Basic ${credentials}`;
                break;
            case 'apikey':
                if (auth.apikey_location === 'header') {
                    config.headers[auth.apikey_name || 'X-API-Key'] = auth.apikey;
                }
                else {
                    config.params = config.params || {};
                    config.params[auth.apikey_name || 'api_key'] = auth.apikey;
                }
                break;
        }
        return config;
    }
    /**
     * Generate webhook signature
     */
    generateWebhookSignature(payload, secret, algorithm = 'sha256') {
        const hmac = (0, crypto_1.createHmac)(algorithm, secret);
        hmac.update(payload);
        return `${algorithm}=${hmac.digest('hex')}`;
    }
    /**
     * Validate response against JSON schema
     */
    validateResponse(response, schema) {
        // Simple validation - in production, you'd use a proper JSON schema validator
        // For now, just check if it's an object and has expected properties
        try {
            if (typeof response !== 'object' || response === null) {
                return false;
            }
            // Basic schema validation (would need ajv or similar for full validation)
            const schemaProps = schema.properties || {};
            const required = schema.required || [];
            for (const prop of required) {
                if (!(prop in response)) {
                    return false;
                }
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Calculate file checksum
     */
    calculateChecksum(data, algorithm = 'sha256') {
        const hash = (0, crypto_1.createHash)(algorithm);
        hash.update(data);
        return hash.digest('hex');
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=HttpClient.js.map