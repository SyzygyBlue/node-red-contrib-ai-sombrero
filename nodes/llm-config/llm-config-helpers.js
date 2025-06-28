/**
 * LLM Config Node Helpers
 * Contains business logic for the LLM Config node
 */

const crypto = require('crypto');
const { auditLogger } = require('../../services/audit-service');

// Encryption key for additional security (should be stored securely in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key';
const IV_LENGTH = 16;

/**
 * Validates the LLM configuration
 * @param {Object} config - The configuration object
 * @param {Object} credentials - The credentials object
 * @throws {Error} If validation fails
 */
function validateConfig(config, credentials) {
  if (!config.provider) {
    throw new Error('Provider is required');
  }

  // Provider-specific validation
  switch (config.provider) {
    case 'openai':
      if (!credentials.apiKey) {
        throw new Error('API Key is required for OpenAI');
      }
      break;
    case 'anthropic':
      if (!credentials.apiKey) {
        throw new Error('API Key is required for Anthropic');
      }
      break;
    case 'azure':
      if (!credentials.apiKey || !config.endpoint) {
        throw new Error('API Key and Endpoint are required for Azure OpenAI');
      }
      break;
    case 'custom':
      if (!config.endpoint) {
        throw new Error('Endpoint is required for custom provider');
      }
      break;
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

/**
 * Normalizes the configuration object
 * @param {Object} config - The configuration object
 * @returns {Object} Normalized configuration
 */
function normalizeConfig(config) {
  const normalized = { ...config };
  
  // Ensure required fields exist
  normalized.provider = normalized.provider || '';
  normalized.name = normalized.name || `LLM Config (${normalized.provider})`;
  
  // Normalize endpoint URLs
  if (normalized.endpoint) {
    normalized.endpoint = normalized.endpoint.replace(/\/$/, '');
  }
  
  return normalized;
}

/**
 * Encrypts sensitive data
 * @param {string} text - The text to encrypt
 * @returns {string} Encrypted text
 */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts sensitive data
 * @param {string} text - The text to decrypt
 * @returns {string} Decrypted text
 */
function decrypt(text) {
  try {
    const [ivHex, encryptedText] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedText, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY),
      iv
    );
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString();
  } catch (error) {
    auditLogger.log({
      event: 'decryption_error',
      error: error.message
    });
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Tests connection to the LLM provider
 * @param {string} provider - The provider name
 * @param {Object} config - The configuration object
 * @param {Object} credentials - The credentials object
 * @returns {Promise<boolean>} True if connection is successful
 */
async function testConnection(provider, config, credentials) {
  try {
    // Implement provider-specific connection testing
    switch (provider) {
      case 'openai':
        return testOpenAIConnection(credentials.apiKey);
      case 'anthropic':
        return testAnthropicConnection(credentials.apiKey);
      case 'azure':
        return testAzureConnection(config.endpoint, credentials.apiKey);
      case 'custom':
        return testCustomConnection(config.endpoint, credentials);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    auditLogger.log({
      event: 'connection_test_failed',
      provider,
      error: error.message
    });
    throw error;
  }
}

// Provider-specific test functions
async function testOpenAIConnection(apiKey) {
  // Implementation for testing OpenAI connection
  return true; // Placeholder
}

async function testAnthropicConnection(apiKey) {
  // Implementation for testing Anthropic connection
  return true; // Placeholder
}

async function testAzureConnection(endpoint, apiKey) {
  // Implementation for testing Azure OpenAI connection
  return true; // Placeholder
}

async function testCustomConnection(endpoint, credentials) {
  // Implementation for testing custom endpoint connection
  return true; // Placeholder
}

module.exports = {
  validateConfig,
  normalizeConfig,
  encrypt,
  decrypt,
  testConnection
};
