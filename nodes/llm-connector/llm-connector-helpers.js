/**
 * LLM Connector Helpers
 * Core business logic for the LLM Connector node
 */

const { auditLogger } = require('../../services/audit-service');
const roleHelper = require('./llm-connector-role-based-helper');

/**
 * Validates the message structure and content
 * @param {Object} msg - The message to validate
 * @param {Object} node - The node instance
 * @returns {void}
 * @throws {Error} If validation fails
 */
function validateMessage(msg, node) {
  if (!msg || typeof msg !== 'object') {
    throw new Error('Invalid message: expected an object');
  }

  // Basic validation
  if (msg.payload === undefined && !msg._llm?.messages) {
    throw new Error('Message must have a payload or _llm.messages');
  }

  // Validate LLM config is available
  if (!node.llmConfig) {
    throw new Error('LLM configuration not found');
  }
}

/**
 * Validates the message structure and content
 * @param {Object} msg - The message to validate
 * @param {Object} node - The node instance
 * @returns {Object} The validated message
 * @throws {Error} If validation fails
 */
function validateMessage(msg, node) {
  if (!msg || typeof msg !== 'object') {
    throw new Error('Invalid message: expected an object');
  }

  // Ensure we have content to process
  if (!msg.payload && !msg.topic) {
    throw new Error('Message must contain either payload or topic');
  }

  return msg;
}

/**
 * Normalizes the message structure
 * @param {Object} msg - The message to normalize
 * @param {Object} node - The node instance
 * @returns {Promise<Object>} The normalized message
 */
async function normalizeMessage(msg, node) {
  const normalized = { ...msg };
  
  try {
    // If message already has LLM data, use it
    if (normalized._llm) {
      return normalized;
    }

    // Ensure payload is properly formatted
    if (normalized.payload === undefined) {
      normalized.payload = '';
    }

    // Get role configuration
    const role = normalized.role || node.role || 'assistant';
    
    // Generate prompt using role template
    const promptContext = {
      message: normalized.payload,
      ...(normalized.context || {})
    };
    
    const { messages, responseSchema } = roleHelper.generatePrompt(role, promptContext);
    
    // Store processed data in message
    normalized._llm = {
      role,
      messages,
      responseSchema,
      timestamp: new Date().toISOString()
    };
    
    // Add debug information if enabled
    if (node.debug) {
      normalized._debug = {
        ...(normalized._debug || {}),
        nodeId: node.id,
        config: node.llmConfig ? node.llmConfig.id : null,
        role,
        promptContext,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content.length > 100 
            ? m.content.substring(0, 100) + '...' 
            : m.content
        })),
        hasResponseSchema: !!responseSchema
      };
    }
    
    return normalized;
  } catch (error) {
    auditLogger.error({
      event: 'message_normalization_error',
      error: error.message,
      stack: error.stack,
      role: normalized.role,
      nodeId: node.id
    });
    throw new Error(`Failed to normalize message: ${error.message}`);
  }
}

/**
 * Processes the message through the LLM
 * @param {Object} msg - The message to process
 * @param {Object} node - The node instance
 * @returns {Promise<Object>} The processed message with LLM response
 */
async function processMessage(msg, node) {
  const startTime = Date.now();
  let response;

  try {
    // Get the LLM provider from the config node
    const provider = node.llmConfig;
    if (!provider || typeof provider.sendRequest !== 'function') {
      throw new Error('Invalid LLM provider configuration');
    }

    // Ensure message is normalized
    const normalizedMsg = msg._llm ? msg : await normalizeMessage(msg, node);
    
    if (!normalizedMsg._llm) {
      throw new Error('Message normalization failed: missing _llm data');
    }

    const { messages, responseSchema } = normalizedMsg._llm;

    // Log the request if debug is enabled
    if (node.debug) {
      auditLogger.log({
        event: 'llm_request_start',
        nodeId: node.id,
        role: normalizedMsg.role,
        request: {
          messages: messages.map(m => ({
            role: m.role,
            contentLength: m.content?.length || 0
          })),
          hasResponseSchema: !!responseSchema
        }
      });
    }

    // Send the request to the LLM provider
    const request = {
      messages,
      ...(responseSchema && { response_format: { type: 'json_object' } }),
      ...(node.options || {})
    };

    response = await provider.sendRequest(request);

    // Process the response
    const result = {
      ...normalizedMsg,
      payload: response.content,
      llmResponse: response,
      _llmMetadata: {
        ...(normalizedMsg._llmMetadata || {}),
        provider: provider.type,
        model: response.model,
        tokens: response.usage?.total_tokens,
        processingTime: Date.now() - startTime,
        role: normalizedMsg.role
      }
    };

    // Add debug information if enabled
    if (node.debug) {
      result._debug = {
        ...(normalizedMsg._debug || {}),
        processingTime: result._llmMetadata.processingTime,
        tokens: result._llmMetadata.tokens,
        response: {
          model: response.model,
          usage: response.usage
        }
      };
    }


    return result;
  } catch (error) {
    // Log the error with additional context
    auditLogger.error({
      event: 'llm_processing_error',
      nodeId: node.id,
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime,
      role: msg.role
    });

    // Re-throw the error with additional context
    error.message = `LLM processing failed: ${error.message}`;
    throw error;
  }
}

module.exports = {
  validateMessage,
  normalizeMessage,
  processMessage
};
