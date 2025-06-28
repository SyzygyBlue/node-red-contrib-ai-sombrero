/**
 * Prompt Builder
 * Handles the construction and formatting of prompts for LLM requests
 */

const { LLMError, ERROR_CODES } = require('../validation/error-types');
const { handleLLMError } = require('../utils/error-handler');

/**
 * Builds a prompt from a message object
 * @param {Object} message - The message object containing prompt information
 * @param {Object} options - Additional options for prompt building
 * @returns {string} The formatted prompt
 * @throws {LLMError} If prompt building fails
 */
function buildPrompt(message, options = {}) {
  try {
    if (!message || typeof message !== 'object') {
      throw new LLMError('Invalid message: expected an object', ERROR_CODES.INVALID_INPUT);
    }

    const { role, content, messages } = message._llm || {};
    
    // If we have a messages array, use that to build the prompt
    if (Array.isArray(messages) && messages.length > 0) {
      return messages
        .map(msg => {
          // Handle different message formats
          if (typeof msg === 'string') {
            return msg;
          } else if (msg.content) {
            return `${msg.role || 'user'}: ${msg.content}`;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n\n');
    }
    
    // Fall back to simple role/content format
    if (content) {
      return `${role || 'user'}: ${content}`;
    }
    
    // If we have a payload, use that as the prompt
    if (message.payload !== undefined) {
      return String(message.payload);
    }
    
    throw new LLMError(
      'Could not build prompt: no valid content found in message',
      ERROR_CODES.INVALID_INPUT
    );
  } catch (error) {
    const { error: llmError } = handleLLMError(error, {
      event: 'prompt_build_error',
      nodeId: message?._llm?.nodeId,
      role: message?.role
    });
    
    throw llmError;
  }
}

/**
 * Validates a prompt before sending to the LLM
 * @param {string} prompt - The prompt to validate
 * @returns {Object} Validation result
 */
function validatePrompt(prompt) {
  if (typeof prompt !== 'string') {
    return {
      valid: false,
      error: new LLMError('Prompt must be a string', ERROR_CODES.INVALID_INPUT)
    };
  }
  
  if (!prompt.trim()) {
    return {
      valid: false,
      error: new LLMError('Prompt cannot be empty', ERROR_CODES.INVALID_INPUT)
    };
  }
  
  // Add any additional validation rules here
  
  return { valid: true };
}

module.exports = {
  buildPrompt,
  validatePrompt
};
