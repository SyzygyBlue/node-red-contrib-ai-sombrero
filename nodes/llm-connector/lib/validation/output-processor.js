/**
 * Output Processor
 * Handles processing and normalizing LLM outputs
 */

const { LLMError, ERROR_CODES } = require('./error-types');
const { handleLLMError } = require('../utils/error-handler');

/**
 * Normalizes LLM output to a standard format
 * @param {*} rawOutput - Raw output from the LLM
 * @param {Object} options - Processing options
 * @returns {Object} Normalized output
 * @throws {LLMError} If output cannot be normalized
 */
function normalizeLLMOutput(rawOutput, options = {}) {
  try {
    // Handle different types of outputs
    if (rawOutput === undefined || rawOutput === null) {
      throw new LLMError('LLM returned no output', ERROR_CODES.PROCESSING_ERROR);
    }

    // If it's already an object, return a copy
    if (typeof rawOutput === 'object' && rawOutput !== null) {
      return { ...rawOutput };
    }

    // If it's a string, try to parse it as JSON
    if (typeof rawOutput === 'string') {
      try {
        // Try to parse as JSON first
        return JSON.parse(rawOutput);
      } catch (e) {
        // If not JSON, return as a message
        return { message: rawOutput };
      }
    }

    // For any other type, convert to string
    return { value: String(rawOutput) };
  } catch (error) {
    const { error: llmError } = handleLLMError(error, {
      event: 'output_normalization_error',
      outputType: rawOutput ? typeof rawOutput : 'undefined'
    });
    
    throw llmError;
  }
}

/**
 * Validates the output against a schema
 * @param {Object} output - The output to validate
 * @param {Object} schema - The schema to validate against
 * @returns {Object} Validation result
 */
function validateOutput(output, schema) {
  // If no schema is provided, consider it valid
  if (!schema) {
    return { valid: true };
  }

  try {
    // Use the schema validator from our validation module
    const { validateSchema } = require('./schema-validator');
    return validateSchema(output, schema);
  } catch (error) {
    return {
      valid: false,
      error: new LLMError(
        'Schema validation failed',
        ERROR_CODES.SCHEMA_VALIDATION_ERROR,
        { originalError: error }
      )
    };
  }
}

/**
 * Processes the LLM output with optional validation
 * @param {*} rawOutput - Raw output from the LLM
 * @param {Object} options - Processing options
 * @returns {Object} Processed output
 * @throws {LLMError} If processing fails
 */
function processLLMOutput(rawOutput, options = {}) {
  try {
    const { schema, validate = true } = options;
    
    // Normalize the output
    const normalized = normalizeLLMOutput(rawOutput, options);
    
    // Validate against schema if provided
    if (validate && schema) {
      const { valid, error } = validateOutput(normalized, schema);
      if (!valid) {
        throw error || new LLMError(
          'Output validation failed',
          ERROR_CODES.SCHEMA_VALIDATION_ERROR
        );
      }
    }
    
    return normalized;
  } catch (error) {
    const { error: llmError } = handleLLMError(error, {
      event: 'output_processing_error',
      hasSchema: !!options.schema
    });
    
    throw llmError;
  }
}

module.exports = {
  normalizeLLMOutput,
  validateOutput,
  processLLMOutput
};
