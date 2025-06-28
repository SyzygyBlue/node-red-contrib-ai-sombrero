/**
 * Schema Validator
 * Handles JSON Schema validation for LLM responses
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { auditLogger } = require('../../../services/audit-service');

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  useDefaults: true,
  coerceTypes: true
});

// Add common formats
addFormats(ajv);

/**
 * Validates data against a JSON Schema
 * @param {Object} data - The data to validate
 * @param {Object} schema - The JSON Schema to validate against
 * @returns {Object} - Validation result { valid: boolean, errors: Array, data: any }
 */
function validateSchema(data, schema) {
  try {
    // Compile schema for better performance with repeated validations
    const validate = ajv.compile(schema);
    const valid = validate(data);
    
    return {
      valid,
      errors: validate.errors || [],
      data: valid ? data : null
    };
  } catch (error) {
    auditLogger.error({
      event: 'schema_validation_error',
      error: error.message,
      stack: error.stack
    });
    
    return {
      valid: false,
      errors: [{
        message: error.message,
        stack: error.stack
      }],
      data: null
    };
  }
}

/**
 * Normalizes schema validation errors to a consistent format
 * @param {Array} errors - AJV validation errors
 * @returns {Array} - Normalized error objects
 */
function normalizeSchemaErrors(errors = []) {
  return errors.map(error => ({
    path: error.instancePath || '/',
    message: error.message || 'Validation error',
    params: error.params || {},
    schemaPath: error.schemaPath || ''
  }));
}

module.exports = {
  validateSchema,
  normalizeSchemaErrors
};
