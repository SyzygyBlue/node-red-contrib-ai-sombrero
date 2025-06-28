/**
 * Validation Module
 * 
 * Exports the public API for schema validation and utilities.
 */

const validator = require('./schema-validator');
const {
  normalizeSchemaErrors,
  requiredString,
  optionalString,
  requiredNumber,
  enumField,
  mergeSchemas
} = require('./schema-utils');

// Re-export the validator instance and utilities
module.exports = {
  // Core validation
  validateSchema: (data, schema) => validator.validate(data, schema),
  addFormat: (name, validatorFn) => validator.addFormat(name, validatorFn),
  addSchema: (schema, key) => validator.addSchema(schema, key),
  
  // Schema utilities
  normalizeSchemaErrors,
  requiredString,
  optionalString,
  requiredNumber,
  enumField,
  mergeSchemas
};
