const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { auditLogger } = require('../../../../services/audit-service');

class SchemaValidator {
  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      useDefaults: true,
      coerceTypes: true
    });
    
    // Add common formats
    addFormats(this.ajv);
  }

  /**
   * Validates data against a JSON Schema
   * @param {Object} data - The data to validate
   * @param {Object} schema - The JSON Schema to validate against
   * @returns {Object} - Validation result { valid: boolean, errors: Array, data: any }
   */
  validate(data, schema) {
    try {
      const validate = this.ajv.compile(schema);
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
   * Adds a custom format validator
   * @param {string} name - Format name
   * @param {Function|RegExp} validator - Validation function or regex
   */
  addFormat(name, validator) {
    this.ajv.addFormat(name, validator);
  }

  /**
   * Adds a schema to the validator
   * @param {Object} schema - Schema to add
   * @param {string} [key] - Optional schema key
   */
  addSchema(schema, key) {
    this.ajv.addSchema(schema, key);
  }
}

// Export a singleton instance
module.exports = new SchemaValidator();
