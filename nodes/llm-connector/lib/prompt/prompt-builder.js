/**
 * Prompt Builder
 * Handles the construction and formatting of prompts for LLM requests
 */

const { LLMError, ERROR_CODES } = require('../validation/error-types');
const { handleLLMError } = require('../utils/error-handler');
const MessageFormatter = require('./message-formatter');
const RoleManager = require('./role-manager');

class PromptBuilder {
  /**
   * Create a new PromptBuilder
   * @param {Object} roleManager - Instance of RoleManager
   */
  constructor(roleManager) {
    this.formatter = new MessageFormatter(roleManager);
  }

  /**
   * Builds a prompt from a message object
   * @param {Object} message - The message object containing prompt information
   * @param {Object} options - Additional options for prompt building
   * @returns {string} The formatted prompt
   * @throws {LLMError} If prompt building fails
   */
  buildPrompt(message, options = {}) {
    try {
      if (!message || typeof message !== 'object') {
        throw new LLMError('Invalid message: expected an object', ERROR_CODES.INVALID_INPUT);
      }

      const { role = 'user', messages } = message._llm || {};
      
      // If we have a messages array, format the conversation
      if (Array.isArray(messages) && messages.length > 0) {
        return this.formatter.formatConversation(messages, options);
      }
      
      // Single message with role
      if (message.content || message.payload) {
        return this.formatter.formatMessage(message, role, options);
      }
      
      throw new LLMError(
        'Could not build prompt: message must contain _llm.messages, content, or payload',
        ERROR_CODES.INVALID_INPUT
      );
    } catch (error) {
      handleLLMError(error, 'Failed to build prompt');
      throw error;
    }
  }

  /**
   * Validates a prompt before sending to the LLM
   * @param {string|Object} prompt - The prompt to validate (string or message object)
   * @returns {Object} Validation result
   */
  validatePrompt(prompt) {
    try {
      // If it's a message object, build the prompt first
      const promptString = typeof prompt === 'string' 
        ? prompt 
        : this.buildPrompt(prompt);

      if (!promptString.trim()) {
        return {
          valid: false,
          error: 'Prompt cannot be empty',
          code: ERROR_CODES.VALIDATION_ERROR
        };
      }

      // Add more validation rules as needed

      return { 
        valid: true,
        length: promptString.length,
        estimatedTokens: Math.ceil(promptString.length / 4) // Rough estimate
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        code: error.code || ERROR_CODES.VALIDATION_ERROR,
        details: error.details
      };
    }
  }

  /**
   * Get the estimated token count for a prompt
   * @param {string|Object} prompt - The prompt to analyze
   * @returns {number} Estimated token count
   */
  estimateTokenCount(prompt) {
    const result = this.validatePrompt(prompt);
    if (!result.valid) {
      throw new LLMError(
        `Cannot estimate tokens for invalid prompt: ${result.error}`,
        result.code
      );
    }
    return result.estimatedTokens;
  }
}

module.exports = PromptBuilder;
