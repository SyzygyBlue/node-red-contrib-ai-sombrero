/**
 * Output Processor
 * Handles normalization and processing of LLM outputs
 */

const { auditLogger } = require('../../../services/audit-service');
const { validateSchema, normalizeSchemaErrors } = require('./schema-validator');

/**
 * Normalizes LLM output based on specified format
 * @param {*} raw - Raw LLM output
 * @param {string} format - Expected format ('json', 'text', 'markdown')
 * @returns {Object} - Normalized output { content: any, format: string, metadata: Object }
 */
function normalizeLLMOutput(raw, format = 'text') {
  try {
    // Handle undefined or null input
    if (raw === undefined || raw === null) {
      return {
        content: '',
        format: 'text',
        metadata: { normalized: false, error: 'Empty output' }
      };
    }

    // Handle string input
    if (typeof raw === 'string') {
      // Try to parse as JSON if format is json or content looks like JSON
      if (format === 'json' || (raw.trim().startsWith('{') && raw.trim().endsWith('}'))) {
        try {
          const parsed = JSON.parse(raw);
          return {
            content: parsed,
            format: 'json',
            metadata: { normalized: true, originalFormat: 'string' }
          };
        } catch (e) {
          // If JSON parsing fails but format was specified as JSON, return error
          if (format === 'json') {
            throw new Error(`Failed to parse JSON output: ${e.message}`);
          }
          // Otherwise, treat as text
          return {
            content: raw,
            format: 'text',
            metadata: { normalized: true }
          };
        }
      }
      
      // Handle markdown
      if (format === 'markdown' || raw.includes('\n') || raw.includes('`') || raw.includes('#')) {
        return {
          content: raw,
          format: 'markdown',
          metadata: { normalized: true }
        };
      }

      // Default to text
      return {
        content: raw,
        format: 'text',
        metadata: { normalized: true }
      };
    }

    // Handle object input
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return {
        content: raw,
        format: 'json',
        metadata: { normalized: true }
      };
    }

    // Handle array input
    if (Array.isArray(raw)) {
      return {
        content: raw,
        format: 'array',
        metadata: { normalized: true }
      };
    }

    // For any other type, convert to string
    return {
      content: String(raw),
      format: 'text',
      metadata: { normalized: true, originalType: typeof raw }
    };
  } catch (error) {
    auditLogger.error({
      event: 'output_normalization_error',
      error: error.message,
      stack: error.stack,
      inputType: typeof raw,
      format
    });
    
    // Return a safe default in case of error
    return {
      content: String(raw || ''),
      format: 'text',
      metadata: { 
        normalized: false, 
        error: error.message,
        errorDetails: error.stack
      }
    };
  }
}

/**
 * Validates output against a schema if provided
 * @param {Object} output - Normalized output from normalizeLLMOutput
 * @param {Object} [schema] - Optional JSON schema to validate against
 * @returns {Object} - Validation result { valid: boolean, errors: Array, data: any }
 */
function validateOutput(output, schema) {
  if (!schema || output.format !== 'json') {
    return {
      valid: true,
      errors: [],
      data: output.content
    };
  }

  const result = validateSchema(output.content, schema);
  
  return {
    valid: result.valid,
    errors: normalizeSchemaErrors(result.errors),
    data: result.valid ? output.content : null
  };
}

module.exports = {
  normalizeLLMOutput,
  validateOutput
};
