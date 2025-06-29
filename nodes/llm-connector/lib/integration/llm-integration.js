/**
 * LLM Integration Module
 * Handles communication with the LLM-Config node and manages LLM requests
 */

const { LLMError, ERROR_CODES } = require('../validation/error-types');
const { handleLLMError } = require('../utils/error-handler');
// Mockable audit logger that works in both test and production
let auditLogger = { log: () => {} };
try {
  // This will be mocked in tests
  const auditService = require('../../services/audit-service');
  if (auditService && auditService.auditLogger) {
    auditLogger = auditService.auditLogger;
  }
} catch (e) {
  // Use the default mock logger if the module can't be loaded
}
const { validateLLMConfig, createLLMClient } = require('./config-manager');

class LLMIntegration {
  /**
   * Create a new LLM Integration instance
   * @param {Object} config - The LLM configuration
   * @param {Object} node - The Node-RED node instance (for status updates)
   */
  constructor(config, node) {
    this.config = config;
    this.node = node;
    this.llmClient = null;
    this.initialized = false;
  }

  /**
   * Initialize the LLM integration
   * @throws {LLMError} If initialization fails
   */
  async initialize() {
    try {
      // Validate the configuration
      const { valid, error } = validateLLMConfig(this.config);
      if (!valid) {
        throw error;
      }

      // Create the LLM client
      this.llmClient = await createLLMClient(this.config);
      this.initialized = true;
      
      // Update node status
      this.node.status({ fill: 'green', shape: 'dot', text: 'Ready' });
      
      return true;
    } catch (error) {
      const llmError = handleLLMError(error, {
        context: 'LLM Integration Initialization',
        config: { ...this.config, apiKey: '***' } // Redact sensitive data
      });
      
      // Update node status with error
      this.node.status({ fill: 'red', shape: 'ring', text: 'Error' });
      
      throw llmError;
    }
  }

  /**
   * Execute an LLM request
   * @param {Object} params - The request parameters
   * @param {string} params.prompt - The prompt to send to the LLM
   * @param {Object} [params.options] - Additional options for the LLM request
   * @returns {Promise<Object>} The LLM response
   */
  async executeRequest({ prompt, options = {} }) {
    if (!this.initialized || !this.llmClient) {
      throw new LLMError(
        'LLM integration not initialized',
        ERROR_CODES.NOT_INITIALIZED
      );
    }

    try {
      // Update node status to indicate processing
      this.node.status({ fill: 'blue', shape: 'dot', text: 'Processing...' });

      // Prepare the request
      const request = {
        prompt,
        max_tokens: options.maxTokens || this.config.maxTokens || 1000,
        temperature: options.temperature || this.config.temperature || 0.7,
        stop: options.stop || this.config.stop || [],
        ...options
      };

      // Log the request
      auditLogger.log({
        event: 'llm_request_started',
        nodeId: this.node.id,
        provider: this.config.provider,
        model: this.config.model,
        request: {
          ...request,
          prompt: request.prompt.substring(0, 100) + (request.prompt.length > 100 ? '...' : '')
        }
      });

      // Execute the request
      const startTime = Date.now();
      const response = await this.llmClient.complete(request);
      const endTime = Date.now();

      // Log the response
      auditLogger.log({
        event: 'llm_request_completed',
        nodeId: this.node.id,
        provider: this.config.provider,
        model: this.config.model,
        duration: endTime - startTime,
        response: {
          ...response,
          text: response.text ? response.text.substring(0, 200) + (response.text.length > 200 ? '...' : '') : ''
        }
      });

      // Update node status
      this.node.status({ fill: 'green', shape: 'dot', text: 'Ready' });

      return response;
    } catch (error) {
      // Log the error
      auditLogger.log({
        event: 'llm_request_failed',
        nodeId: this.node.id,
        provider: this.config.provider,
        model: this.config.model,
        error: error.message
      });

      // Update node status with error
      this.node.status({ fill: 'red', shape: 'ring', text: 'Error' });

      // Handle and rethrow the error
      throw handleLLMError(error, {
        context: 'LLM Request Execution',
        request: { prompt, ...options }
      });
    }
  }

  /**
   * Close the LLM integration and clean up resources
   */
  async close() {
    if (this.llmClient && typeof this.llmClient.close === 'function') {
      await this.llmClient.close();
    }
    this.initialized = false;
    this.llmClient = null;
    this.node.status({});
  }
}

module.exports = LLMIntegration;
