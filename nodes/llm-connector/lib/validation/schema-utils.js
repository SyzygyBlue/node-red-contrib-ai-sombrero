/**
 * Schema Utilities
 * Helper functions for working with JSON Schemas
 */

const { auditLogger } = require('../../../../services/audit-service');

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
    schemaPath: error.schemaPath || '',
    keyword: error.keyword || '',
    data: error.data
  }));
}

/**
 * Creates a simple schema for a required string field
 * @param {string} description - Field description
 * @param {number} [minLength=1] - Minimum length
 * @param {number} [maxLength] - Maximum length
 * @returns {Object} - JSON Schema object
 */
function requiredString(description, minLength = 1, maxLength) {
  return {
    type: 'string',
    description,
    minLength,
    ...(maxLength && { maxLength })
  };
}

/**
 * Creates a schema for an optional string field
 * @param {string} description - Field description
 * @param {number} [minLength=0] - Minimum length
 * @param {number} [maxLength] - Maximum length
 * @returns {Object} - JSON Schema object
 */
function optionalString(description, minLength = 0, maxLength) {
  return {
    type: ['string', 'null'],
    description,
    minLength,
    ...(maxLength && { maxLength })
  };
}

/**
 * Creates a schema for a required number field
 * @param {string} description - Field description
 * @param {number} [minimum] - Minimum value
 * @param {number} [maximum] - Maximum value
 * @returns {Object} - JSON Schema object
 */
function requiredNumber(description, minimum, maximum) {
  return {
    type: 'number',
    description,
    ...(minimum !== undefined && { minimum }),
    ...(maximum !== undefined && { maximum })
  };
}

/**
 * Creates a schema for an enum field
 * @param {string} description - Field description
 * @param {Array} values - Allowed values
 * @param {boolean} [required=true] - Whether the field is required
 * @returns {Object} - JSON Schema object
 */
function enumField(description, values, required = true) {
  return {
    type: required ? 'string' : ['string', 'null'],
    enum: values,
    description
  };
}

/**
 * Merges multiple schemas into one
 * @param {...Object} schemas - Schemas to merge
 * @returns {Object} - Merged schema
 */
function mergeSchemas(...schemas) {
  return schemas.reduce((merged, schema) => {
    // Handle allOf, anyOf, oneOf
    if (schema.allOf || schema.anyOf || schema.oneOf) {
      return {
        ...merged,
        ...schema
      };
    }
    
    // Handle properties
    if (schema.properties) {
      return {
        ...merged,
        type: 'object',
        properties: {
          ...(merged.properties || {}),
          ...schema.properties
        },
        required: [
          ...(merged.required || []),
          ...(schema.required || [])
        ].filter((item, index, arr) => arr.indexOf(item) === index) // Remove duplicates
      };
    }
    
    // Handle simple merge
    return { ...merged, ...schema };
  }, {});
}

module.exports = {
  normalizeSchemaErrors,
  requiredString,
  optionalString,
  requiredNumber,
  enumField,
  mergeSchemas
};
