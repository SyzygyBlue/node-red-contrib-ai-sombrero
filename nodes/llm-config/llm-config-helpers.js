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

  // Common validation (Ollama does not require an API key)
  if (config.provider !== 'ollama' && config.provider !== 'magistral' && (!credentials || !credentials.apiKey)) {
    throw new Error('API Key is required');
  }

  if (!config.model) {
    throw new Error('Model is required');
  }

  // Provider-specific validation
  switch (config.provider) {
    case 'openai':
      // OpenAI validation is handled by common validation
      break;
    case 'anthropic':
      // Anthropic validation is handled by common validation
      break;
    case 'google':
      // Google validation is handled by common validation
      break;
    case 'azure':
      if (!config.baseUrl) {
        throw new Error('Endpoint is required for Azure OpenAI');
      }
      if (!config.version) {
        throw new Error('API Version is required for Azure OpenAI');
      }
      break;
    case 'deepseek':
      // Deepseek validation is handled by common validation
      break;
    case 'xai':
      // xAI validation is handled by common validation
      break;
    case 'magistral':
      // Magistral validation is handled by common validation
      break;
    case 'ollama':
      // xAI validation is handled by common validation
      break;
    case 'ollama':
      // Ollama validation is handled by common validation (no extra checks)
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
  normalized.provider = normalized.provider || 'openai';
  normalized.name = normalized.name || `LLM Config (${normalized.provider})`;
  normalized.model = normalized.model || '';
  normalized.options = normalized.options || {};
  
  // Provider-specific normalization
  switch (normalized.provider) {
    case 'openai':
      normalized.baseUrl = normalized.baseUrl || 'https://api.openai.com/v1';
      break;
    case 'azure':
      normalized.version = normalized.version || '2023-05-15';
      break;
    case 'ollama':
      normalized.baseUrl = normalized.baseUrl || 'http://localhost:11434';
      break;
    case 'anthropic':
      normalized.baseUrl = normalized.baseUrl || 'https://api.anthropic.com';
      break;
    case 'google':
      normalized.baseUrl = normalized.baseUrl || 'https://generativelanguage.googleapis.com';
      break;
  }
  
  // Normalize URLs by removing trailing slashes
  if (normalized.baseUrl) {
    normalized.baseUrl = normalized.baseUrl.replace(/\/$/, '');
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
      case 'ollama':
        return testOllamaConnection(config.baseUrl);
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

async function testOllamaConnection(baseUrl = 'http://localhost:11434') {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`);
    return res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Calls the LLM provider with the given parameters
 * @param {string} provider - The provider name
 * @param {Object} config - The configuration object
 * @param {Object} credentials - The credentials object
 * @param {Object} params - The parameters for the LLM call
 * @returns {Promise<Object>} The LLM response
 */
async function callLLM(provider, config, credentials, params) {
  const { prompt, max_tokens = 1000, temperature = 0.7, stop = null } = params;
  
  try {
    switch (provider) {
      case 'openai':
        return callOpenAI(credentials.apiKey, { prompt, max_tokens, temperature, stop });
      case 'anthropic':
        return callAnthropic(credentials.apiKey, { prompt, max_tokens, temperature, stop });
      case 'azure':
        return callAzure(config.endpoint, credentials.apiKey, { prompt, max_tokens, temperature, stop });
      case 'custom':
        return callCustomEndpoint(config.endpoint, credentials, { prompt, max_tokens, temperature, stop });
      case 'ollama':
        return callOllama(config.baseUrl, config.model || 'deepseek-r1', { prompt, max_tokens, temperature, stop });
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    auditLogger.error({
      event: 'llm_call_failed',
      provider,
      error: error.message,
      params: { ...params, prompt: params.prompt?.substring(0, 100) + '...' }
    });
    throw error;
  }
}

module.exports = {
  validateConfig,
  normalizeConfig,
  encrypt,
  decrypt,
  testConnection,
  callLLM
};

/**
 * Calls the OpenAI API
 */
async function callOpenAI(apiKey, { prompt, max_tokens, temperature, stop }) {
  const openai = require('openai');
  const client = new openai.OpenAI({ apiKey });
  
  const response = await client.completions.create({
    model: 'gpt-3.5-turbo-instruct',
    prompt,
    max_tokens,
    temperature,
    stop,
  });
  
  return {
    text: response.choices[0].text,
    usage: response.usage,
    model: response.model,
    created: response.created
  };
}

/**
 * Calls the Anthropic API
 */
async function callAnthropic(apiKey, { prompt, max_tokens, temperature, stop }) {
  const { Anthropic } = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  
  const response = await client.completions.create({
    model: 'claude-2',
    prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
    max_tokens_to_sample: max_tokens,
    temperature,
    stop_sequences: stop ? [stop] : undefined,
  });
  
  return {
    text: response.completion,
    model: response.model,
    stop_reason: response.stop_reason
  };
}

/**
 * Calls the Azure OpenAI API
 */
async function callAzure(endpoint, apiKey, { prompt, max_tokens, temperature, stop }) {
  const openai = require('openai');
  const client = new openai.OpenAI({
    apiKey,
    baseURL: `${endpoint}/openai/deployments/gpt-35-turbo/completions`,
    defaultQuery: { 'api-version': '2023-05-15' },
    defaultHeaders: { 'api-key': apiKey },
  });
  
  const response = await client.completions.create({
    model: 'gpt-35-turbo-instruct',
    prompt,
    max_tokens,
    temperature,
    stop,
  });
  
  return {
    text: response.choices[0].text,
    usage: response.usage,
    model: response.model
  };
}

/**
 * Calls a custom LLM endpoint
 */
async function callCustomEndpoint(endpoint, credentials, { prompt, max_tokens, temperature, stop }) {
  const axios = require('axios');
  
  const response = await axios.post(endpoint, {
    prompt,
    max_tokens,
    temperature,
    stop,
  }, {
    headers: {
      'Content-Type': 'application/json',
      ...(credentials.apiKey && { 'Authorization': `Bearer ${credentials.apiKey}` })
    },
    timeout: 30000 // 30 seconds timeout
  });
  
  return response.data;
}

/**
 * Calls a local Ollama daemon to generate completions.
 * @param {string} baseUrl - Base URL of the Ollama HTTP API (e.g. http://localhost:11434)
 * @param {string} model - Model name to use (e.g. deepseek-r1)
 * @param {Object} options - { prompt, max_tokens, temperature }
 * @returns {Promise<string>} The generated text
 */
async function callOllama(baseUrl = 'http://localhost:11434', model = 'deepseek-r1', { prompt, max_tokens, temperature }) {
  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/generate`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature,
        num_predict: max_tokens
      }
    })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Ollama request failed');
  }
  // Wrap to align with other provider responses
  return { text: data.response ?? data };
}

module.exports = {
  validateConfig,
  normalizeConfig,
  encrypt,
  decrypt,
  testConnection,
  callLLM
};
