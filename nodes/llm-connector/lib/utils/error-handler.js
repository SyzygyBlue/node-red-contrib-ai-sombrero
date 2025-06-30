/**
 * Error Handler Utility
 * Provides consistent error handling across the LLM Connector
 */

const path = require('path');
const { auditLogger } = require('../../../../services/audit-service');
const { LLMError, ERROR_CODES } = require('../validation/error-types');

/**
 * Handles LLM-related errors consistently
 * @param {Error} error - The error to handle
 * @param {Object} context - Additional context for the error
 * @returns {Object} Object containing the processed error and any additional handling results
 */
function handleLLMError(error, context = {}) {
  // Default context values
  const defaultContext = {
    event: 'llm_error',
    nodeId: 'unknown',
    timestamp: new Date().toISOString(),
    ...context
  };

  // Create a standardized error object
  let llmError;
  
  if (error instanceof LLMError) {
    // Already an LLMError, just use it
    llmError = error;
  } else {
    // Wrap the error in an LLMError
    llmError = new LLMError(
      error.message || 'An unknown error occurred',
      error.code || ERROR_CODES.UNKNOWN_ERROR,
      {
        originalError: error,
        ...(error.details || {})
      }
    );
  }

  // Log the error to the audit log
  try {
    auditLogger.error({
      ...defaultContext,
      error: {
        name: error.name,
        message: error.message,
        code: llmError.code,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        ...llmError.details
      }
    });
  } catch (logError) {
    // If audit logging fails, log to console as fallback
    console.error('Failed to log error to audit log:', logError);
    console.error('Original error:', error);
  }

  // Return the processed error and any additional context
  return {
    error: llmError,
    context: defaultContext,
    handled: true
  };
}

/**
 * Creates a new LLMError with the specified code and message
 * @param {string} message - Error message
 * @param {string} code - Error code (from ERROR_CODES)
 * @param {Object} details - Additional error details
 * @returns {LLMError} The created error
 */
function createError(message, code = ERROR_CODES.UNKNOWN_ERROR, details = {}) {
  return new LLMError(message, code, details);
}

module.exports = {
  handleLLMError,
  createError,
  LLMError,
  ERROR_CODES
};
