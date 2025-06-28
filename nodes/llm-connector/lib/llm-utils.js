/**
 * LLM Utility Functions
 * Common operations for working with LLM Connector nodes
 */

const { LLMError, ERROR_CODES } = require('./error-handler');
const { auditLogger } = require('../../../services/audit-service');

/**
 * Validates LLM configuration
 * @param {Object} config - The LLM configuration to validate
 * @returns {Object} - Validation result { valid: boolean, message?: string }
 */
function validateLLMConfig(config) {
  if (!config) {
    return { valid: false, message: 'LLM configuration is required' };
  }

  if (!config.provider) {
    return { valid: false, message: 'LLM provider is required' };
  }

  if (!config.model) {
    return { valid: false, message: 'Model is required' };
  }

  // Provider-specific validation
  switch (config.provider) {
    case 'openai':
      if (!config.apiKey) {
        return { valid: false, message: 'API key is required for OpenAI' };
      }
      break;
    case 'anthropic':
      if (!config.apiKey) {
        return { valid: false, message: 'API key is required for Anthropic' };
      }
      break;
    case 'azure':
      if (!config.apiKey || !config.endpoint || !config.deploymentName) {
        return { 
          valid: false, 
          message: 'API key, endpoint, and deployment name are required for Azure' 
        };
      }
      break;
    case 'custom':
      if (!config.endpoint) {
        return { valid: false, message: 'Endpoint is required for custom provider' };
      }
      break;
    default:
      return { valid: false, message: `Unsupported provider: ${config.provider}` };
  }

  return { valid: true };
}

/**
 * Formats messages for the LLM API
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} roleTemplate - Optional role template to prepend to messages
 * @returns {Array} - Formatted messages array
 */
function formatMessages(messages = [], roleTemplate = null) {
  const formattedMessages = [];
  
  // Add system message from role template if provided
  if (roleTemplate?.systemMessage) {
    formattedMessages.push({
      role: 'system',
      content: roleTemplate.systemMessage
    });
  }

  // Add user/assistant messages
  messages.forEach(msg => {
    if (msg.role && msg.content) {
      formattedMessages.push({
        role: msg.role,
        content: String(msg.content)
      });
    }
  });

  return formattedMessages;
}

/**
 * Processes the LLM response
 * @param {Object} response - Raw response from the LLM API
 * @param {Object} options - Processing options
 * @param {boolean} options.validateSchema - Whether to validate against a response schema
 * @param {Object} options.schema - Optional JSON schema to validate against
 * @returns {Object} - Processed response
 */
function processLLMResponse(response, { validateSchema = false, schema = null } = {}) {
  if (!response) {
    throw new LLMError('No response from LLM', ERROR_CODES.API_ERROR);
  }

  const result = {
    text: response.text || '',
    model: response.model,
    usage: response.usage || {},
    finishReason: response.finish_reason,
    raw: response
  };

  // Parse JSON if the response appears to be JSON
  if (typeof result.text === 'string' && 
      (result.text.startsWith('{') || result.text.startsWith('['))) {
    try {
      result.json = JSON.parse(result.text);
      
      // Validate against schema if provided
      if (validateSchema && schema) {
        const { valid, errors } = validateAgainstSchema(result.json, schema);
        if (!valid) {
          throw new LLMError(
            'Response validation failed', 
            ERROR_CODES.VALIDATION_ERROR,
            { errors }
          );
        }
      }
    } catch (error) {
      // If we expected JSON but couldn't parse it, that's an error
      if (validateSchema) {
        throw new LLMError(
          'Failed to parse JSON response', 
          ERROR_CODES.PARSE_ERROR,
          { originalError: error }
        );
      }
      // Otherwise, we'll just return the text as-is
    }
  }

  return result;
}

/**
 * Validates data against a JSON schema
 * @private
 * @param {*} data - Data to validate
 * @param {Object} schema - JSON schema to validate against
 * @returns {{valid: boolean, errors: Array}} - Validation result
 */
function validateAgainstSchema(data, schema) {
  // In a real implementation, this would use a JSON Schema validator like AJV
  // This is a simplified version for demonstration
  const errors = [];
  
  if (schema.required) {
    for (const field of schema.required) {
      if (data[field] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }
  
  if (schema.properties) {
    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      if (data[field] === undefined) continue;
      
      if (fieldSchema.type && typeof data[field] !== fieldSchema.type) {
        errors.push(`Field '${field}' must be of type '${fieldSchema.type}'`);
      }
      
      if (fieldSchema.enum && !fieldSchema.enum.includes(data[field])) {
        errors.push(
          `Field '${field}' must be one of: ${fieldSchema.enum.join(', ')}`
        );
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : null
  };
}

/**
 * Handles errors from LLM API calls
 * @param {Error} error - The error that occurred
 * @param {Object} context - Additional context about the error
 * @returns {LLMError} - A standardized LLMError
 */
function handleLLMError(error, context = {}) {
  let code = ERROR_CODES.API_ERROR;
  let message = error.message || 'An unknown error occurred';
  let details = { ...context, originalError: error };

  // Handle rate limiting
  if (error.status === 429) {
    code = ERROR_CODES.RATE_LIMIT;
    message = 'Rate limit exceeded';
    details.retryAfter = error.response?.headers?.['retry-after'];
  }
  
  // Handle authentication errors
  else if (error.status === 401 || error.status === 403) {
    code = ERROR_CODES.AUTH_ERROR;
    message = 'Authentication failed';
  }
  
  // Handle model-specific errors
  else if (error.code) {
    switch (error.code) {
      case 'model_not_found':
        code = ERROR_CODES.MODEL_UNAVAILABLE;
        message = 'The requested model is not available';
        break;
      case 'context_length_exceeded':
        code = ERROR_CODES.CONTEXT_LIMIT;
        message = 'Context length exceeded';
        break;
    }
  }

  // Log the error
  auditLogger.error({
    event: 'llm_error',
    code,
    message,
    ...details
  });

  return new LLMError(message, code, details);
}

module.exports = {
  validateLLMConfig,
  formatMessages,
  processLLMResponse,
  handleLLMError,
  // Export for testing
  _validateAgainstSchema: validateAgainstSchema
};
