/**
 * Message Normalizer
 * Handles normalization of incoming messages for LLM processing
 */

const { LLMError, ERROR_CODES } = require('./error-types');
const { handleLLMError } = require('../utils/error-handler');

/**
 * Normalizes the message structure for LLM processing
 * @param {Object} msg - The message to normalize
 * @param {Object} node - The node instance
 * @returns {Promise<Object>} The normalized message
 * @throws {LLMError} If normalization fails
 */
async function normalizeMessage(msg, node = {}) {
  try {
    // Create a deep copy of the message to avoid modifying the original
    const normalizedMsg = JSON.parse(JSON.stringify(msg));
    
    // Ensure _llm object exists
    if (!normalizedMsg._llm) {
      normalizedMsg._llm = {};
    }

    // Preserve existing _llm data if it exists
    const existingLLM = msg._llm || {};
    
    // Set default values
    normalizedMsg._llm = {
      // Preserve existing data
      ...existingLLM,
      
      // Set/override with node values
      nodeId: node.id || existingLLM.nodeId || 'unknown',
      role: node.role || existingLLM.role || 'user',
      
      // Ensure messages array exists
      messages: Array.isArray(existingLLM.messages) 
        ? [...existingLLM.messages] 
        : [],
      
      // Add timestamp if not present
      timestamp: existingLLM.timestamp || new Date().toISOString(),
      

    };

    // Handle payload
    if (normalizedMsg.payload === undefined || normalizedMsg.payload === null) {
      normalizedMsg.payload = ''; // Convert to empty string
    } else if (typeof normalizedMsg.payload === 'object' || Array.isArray(normalizedMsg.payload)) {
      try {
        normalizedMsg.payload = JSON.stringify(normalizedMsg.payload);
      } catch (error) {
        throw new LLMError(
          'Failed to stringify message payload',
          ERROR_CODES.INVALID_INPUT,
          { originalError: error }
        );
      }
    } else if (typeof normalizedMsg.payload !== 'string') {
      normalizedMsg.payload = String(normalizedMsg.payload);
    }

    // Ensure messages array has at least one message if payload exists
    if (normalizedMsg.payload && normalizedMsg._llm.messages.length === 0) {
      normalizedMsg._llm.messages = [
        {
          role: normalizedMsg._llm.role,
          content: normalizedMsg.payload
        }
      ];
    }

    // Add debug info if enabled at the top level
    if (node.debug) {
      normalizedMsg._debug = {
        nodeId: node.id,
        nodeName: node.name,
        timestamp: new Date().toISOString()
      };
    }

    return normalizedMsg;
  } catch (error) {
    // Use our error handler to ensure consistent error format
    const { error: llmError } = handleLLMError(error, {
      event: 'message_normalization_error',
      nodeId: node?.id,
      role: msg?.role,
      payloadType: typeof msg?.payload
    });
    
    throw llmError;
  }
}

module.exports = {
  normalizeMessage
};
