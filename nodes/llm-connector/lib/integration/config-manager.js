/**
 * Configuration Manager
 * Handles loading and validating LLM configurations
 */

const { LLMError, ERROR_CODES } = require('../validation/error-types');
const { handleLLMError } = require('../utils/error-handler');

/**
 * Validates an LLM configuration object
 * @param {Object} config - The configuration to validate
 * @returns {Object} Validation result
 */
function validateLLMConfig(config) {
  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      error: new LLMError(
        'Configuration must be an object',
        ERROR_CODES.INVALID_CONFIG
      )
    };
  }

  // Check for required fields
  const requiredFields = ['provider', 'model'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: new LLMError(
        `Missing required configuration fields: ${missingFields.join(', ')}`,
        ERROR_CODES.MISSING_CONFIG
      )
    };
  }

  // Validate provider-specific configuration
  const provider = config.provider.toLowerCase();
  const providerValidators = {
    openai: validateOpenAIConfig,
    anthropic: validateAnthropicConfig,
    // Add more providers as needed
  };

  const validator = providerValidators[provider] || validateGenericConfig;
  return validator(config);
}

/**
 * Validates OpenAI configuration
 * @private
 */
function validateOpenAIConfig(config) {
  const { apiKey } = config;
  
  if (!apiKey) {
    return {
      valid: false,
      error: new LLMError(
        'OpenAI configuration requires an API key',
        ERROR_CODES.INVALID_CONFIG
      )
    };
  }
  
  return { valid: true };
}

/**
 * Validates Anthropic configuration
 * @private
 */
function validateAnthropicConfig(config) {
  const { apiKey } = config;
  
  if (!apiKey) {
    return {
      valid: false,
      error: new LLMError(
        'Anthropic configuration requires an API key',
        ERROR_CODES.INVALID_CONFIG
      )
    };
  }
  
  return { valid: true };
}

/**
 * Validates generic LLM configuration
 * @private
 */
function validateGenericConfig(config) {
  // For providers without specific validation, just check for an API key
  if (!config.apiKey) {
    return {
      valid: false,
      error: new LLMError(
        `Configuration for provider '${config.provider}' requires an API key`,
        ERROR_CODES.INVALID_CONFIG
      )
    };
  }
  
  return { valid: true };
}

/**
 * Normalizes LLM configuration
 * @param {Object} config - The configuration to normalize
 * @returns {Object} Normalized configuration
 */
function normalizeLLMConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new LLMError(
      'Configuration must be an object',
      ERROR_CODES.INVALID_CONFIG
    );
  }

  // Create a normalized config with defaults
  const normalized = {
    provider: (config.provider || '').toLowerCase(),
    model: config.model || 'gpt-3.5-turbo',
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens || 1000,
    stopSequences: Array.isArray(config.stopSequences) 
      ? [...config.stopSequences] 
      : config.stopSequences ? [config.stopSequences] : [],
    ...config
  };

  // Validate the normalized config
  const { valid, error } = validateLLMConfig(normalized);
  if (!valid) {
    throw error || new LLMError(
      'Invalid LLM configuration',
      ERROR_CODES.INVALID_CONFIG
    );
  }

  return normalized;
}

/**
 * Creates an LLM client from a configuration
 * @param {Object} config - The LLM configuration
 * @returns {LLMClient} Configured LLM client
 */
function createLLMClient(config) {
  try {
    const normalizedConfig = normalizeLLMConfig(config);
    const { provider } = normalizedConfig;
    
    // Import the appropriate client based on the provider
    let LLMClient;
    
    try {
      // Try to load the provider-specific client
      // This would be in a separate package in a real implementation
      // e.g., @node-red/llm-provider-${provider}
      LLMClient = require(`./providers/${provider}-client`);
    } catch (error) {
      // Fall back to the generic client
      LLMClient = require('./llm-client');
    }
    
    return new LLMClient(normalizedConfig);
  } catch (error) {
    const { error: llmError } = handleLLMError(error, {
      event: 'llm_client_creation_failed',
      provider: config?.provider
    });
    
    throw llmError;
  }
}

module.exports = {
  validateLLMConfig,
  normalizeLLMConfig,
  createLLMClient
};
