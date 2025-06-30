/**
 * LLM Client
 * Handles communication with LLM providers
 */

const path = require('path');
const { LLMError, ERROR_CODES } = require('../validation/error-types');
const { handleLLMError } = require('../utils/error-handler');
const { auditLogger } = require('../../../../services/audit-service');

class LLMClient {
  /**
   * Create a new LLM Client
   * @param {Object} config - Configuration for the LLM client
   * @param {Function} config.callLLM - Function to call the LLM
   * @param {string} config.provider - Name of the provider (e.g., 'openai', 'anthropic')
   * @param {string} config.model - Model identifier
   */
  constructor(config = {}) {
    if (!config.callLLM || typeof config.callLLM !== 'function') {
      throw new LLMError(
        'LLM client requires a callLLM function',
        ERROR_CODES.INVALID_CONFIG
      );
    }

    this.callLLM = config.callLLM;
    this.provider = config.provider || 'unknown';
    this.model = config.model || 'unknown';
    this.config = { ...config };
  }

  /**
   * Call the LLM with the given prompt and options
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} The LLM response
   * @throws {LLMError} If the call fails
   */
  async generate(prompt, options = {}) {
    const startTime = Date.now();
    let response;

    try {
      // Validate input
      if (typeof prompt !== 'string' || !prompt.trim()) {
        throw new LLMError(
          'Prompt must be a non-empty string',
          ERROR_CODES.INVALID_INPUT
        );
      }

      // Prepare the request
      const request = {
        prompt,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature ?? 0.7,
        stop: options.stopSequences || null,
        ...options
      };

      // Log the request if debug is enabled
      if (options.debug) {
        auditLogger.debug({
          event: 'llm_request',
          provider: this.provider,
          model: this.model,
          request: {
            promptLength: prompt.length,
            maxTokens: request.max_tokens,
            temperature: request.temperature
          },
          timestamp: new Date().toISOString()
        });
      }

      // Make the request
      response = await this.callLLM(request);
      
      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Log the response if debug is enabled
      if (options.debug) {
        auditLogger.debug({
          event: 'llm_response',
          provider: this.provider,
          model: this.model,
          response: {
            responseTime: `${responseTime}ms`,
            ...(typeof response === 'string' 
              ? { text: response }
              : { ...response })
          },
          timestamp: new Date().toISOString()
        });
      }

      return response;
    } catch (error) {
      // Log the error
      const { error: llmError } = handleLLMError(error, {
        event: 'llm_request_failed',
        provider: this.provider,
        model: this.model,
        requestDuration: `${Date.now() - startTime}ms`
      });

      throw llmError;
    }
  }

  /**
   * Stream a response from the LLM
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} options - Additional options
   * @param {Function} onChunk - Callback for each chunk of the response
   * @returns {Promise<Object>} The complete response
   * @throws {LLMError} If the call fails
   */
  async stream(prompt, options = {}, onChunk = () => {}) {
    // Default implementation just calls generate
    // Override in subclasses for actual streaming support
    const response = await this.generate(prompt, options);
    
    // Simulate streaming by calling onChunk with the full response
    if (typeof onChunk === 'function') {
      onChunk(response);
    }
    
    return response;
  }
}

module.exports = LLMClient;
