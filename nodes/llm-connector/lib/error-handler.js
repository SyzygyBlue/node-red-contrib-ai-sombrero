/**
 * Error Handler
 * Centralized error handling for LLM operations
 */

const { auditLogger } = require('../../../services/audit-service');

/**
 * Standard error codes for LLM operations
 */
const ERROR_CODES = {
  // Configuration errors (1xx)
  INVALID_CONFIG: 'E100',
  MISSING_CREDENTIALS: 'E101',
  INVALID_ROLE: 'E102',
  
  // Validation errors (2xx)
  VALIDATION_ERROR: 'E200',
  SCHEMA_VALIDATION: 'E201',
  INVALID_INPUT: 'E202',
  
  // LLM API errors (3xx)
  API_ERROR: 'E300',
  PROVIDER_ERROR: 'E301',
  RATE_LIMIT: 'E302',
  QUOTA_EXCEEDED: 'E303',
  MODEL_UNAVAILABLE: 'E304',
  
  // Processing errors (4xx)
  PROCESSING_ERROR: 'E400',
  TIMEOUT: 'E401',
  PARSE_ERROR: 'E402',
  
  // System errors (5xx)
  INTERNAL_ERROR: 'E500',
  NETWORK_ERROR: 'E501'
};

/**
 * Custom error class for LLM operations
 */
class LLMError extends Error {
  constructor(message, code = ERROR_CODES.INTERNAL_ERROR, details = {}) {
    super(message);
    this.name = 'LLMError';
    this.code = code;
    this.details = details;
    this.isLLMError = true;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Creates a standardized error response
   */
  toResponse() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...this.details
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Handles LLM-related errors consistently
 * @param {Error} error - The error to handle
 * @param {Object} context - Additional context about where the error occurred
 * @returns {Object} - Standardized error response
 */
function handleLLMError(error, context = {}) {
  // Default error details
  const errorDetails = {
    nodeId: context.nodeId,
    message: error.message,
    stack: error.stack,
    ...context
  };

  // Handle known error types
  let statusCode = 500;
  let errorCode = ERROR_CODES.INTERNAL_ERROR;
  
  if (error.isLLMError) {
    // Already an LLMError
    errorCode = error.code;
    Object.assign(errorDetails, error.details);
  } else if (error.name === 'ValidationError' || error.name === 'SchemaValidationError') {
    errorCode = ERROR_CODES.SCHEMA_VALIDATION;
  } else if (error.name === 'TimeoutError') {
    errorCode = ERROR_CODES.TIMEOUT;
    statusCode = 408; // Request Timeout
  } else if (error.code === 'ECONNABORTED') {
    errorCode = ERROR_CODES.TIMEOUT;
    statusCode = 408;
  } else if (error.response?.status === 429) {
    errorCode = ERROR_CODES.RATE_LIMIT;
    statusCode = 429;
  } else if (error.response?.status === 401 || error.response?.status === 403) {
    errorCode = ERROR_CODES.MISSING_CREDENTIALS;
    statusCode = error.response.status;
  } else if (error.response?.status === 404) {
    errorCode = ERROR_CODES.MODEL_UNAVAILABLE;
    statusCode = 404;
  }

  // Log the error
  auditLogger.error({
    event: 'llm_error',
    errorCode,
    statusCode,
    ...errorDetails,
    // Don't log the entire stack trace in production
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // Return a safe error response
  const response = {
    success: false,
    error: {
      code: errorCode,
      message: error.message || 'An unknown error occurred',
      ...(process.env.NODE_ENV === 'development' ? { details: errorDetails } : {})
    }
  };

  return {
    statusCode,
    response,
    error: new LLMError(error.message, errorCode, errorDetails)
  };
}

/**
 * Creates a standardized success response
 */
function createSuccessResponse(data, metadata = {}) {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

module.exports = {
  LLMError,
  ERROR_CODES,
  handleLLMError,
  createSuccessResponse
};
