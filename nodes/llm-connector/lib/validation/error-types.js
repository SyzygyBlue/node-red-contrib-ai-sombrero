/**
 * Error Types and Constants
 * Defines standard error types and codes for the LLM Connector
 */

/**
 * Standard error codes for LLM operations
 */
const ERROR_CODES = {
  // Input validation errors (1xx)
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_TYPE: 'INVALID_TYPE',
  
  // Configuration errors (2xx)
  INVALID_CONFIG: 'INVALID_CONFIG',
  MISSING_CONFIG: 'MISSING_CONFIG',
  
  // Processing errors (3xx)
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  TEMPLATE_ERROR: 'TEMPLATE_ERROR',
  SCHEMA_VALIDATION_ERROR: 'SCHEMA_VALIDATION_ERROR',
  
  // Provider/API errors (4xx)
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  API_ERROR: 'API_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Authentication/Authorization errors (5xx)
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  
  // System/Unknown errors (9xx)
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED'
};

/**
 * Custom error class for LLM-related errors
 */
class LLMError extends Error {
  /**
   * Create a new LLMError
   * @param {string} message - Error message
   * @param {string} code - Error code from ERROR_CODES
   * @param {Object} [details] - Additional error details
   */
  constructor(message, code = ERROR_CODES.UNKNOWN_ERROR, details = {}) {
    super(message);
    this.name = 'LLMError';
    this.code = code;
    this.details = details;
    
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LLMError);
    }
  }
  
  /**
   * Convert the error to a plain object
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack
    };
  }
}

module.exports = {
  LLMError,
  ERROR_CODES
};
