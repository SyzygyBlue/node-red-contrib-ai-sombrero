/**
 * LLM Connector Role-Based Helper
 * Handles role-based prompt generation and management
 */

const Handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const { auditLogger } = require('../../services/audit-service');

// Default roles configuration path
const ROLES_CONFIG_PATH = path.join(__dirname, '../../config/roles.json');

// Load role templates
let roleTemplates = {};

/**
 * Initialize role templates from config file
 */
function initializeRoleTemplates() {
  try {
    if (fs.existsSync(ROLES_CONFIG_PATH)) {
      roleTemplates = JSON.parse(fs.readFileSync(ROLES_CONFIG_PATH, 'utf8'));
    } else {
      // Default roles if config doesn't exist
      roleTemplates = getDefaultRoleTemplates();
      // Save default roles
      fs.mkdirSync(path.dirname(ROLES_CONFIG_PATH), { recursive: true });
      fs.writeFileSync(ROLES_CONFIG_PATH, JSON.stringify(roleTemplates, null, 2));
    }
  } catch (error) {
    auditLogger.error({
      event: 'role_loading_error',
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to load role templates: ${error.message}`);
  }
}

/**
 * Get default role templates
 * @returns {Object} Default role templates
 */
function getDefaultRoleTemplates() {
  return {
    'assistant': {
      system: 'You are a helpful assistant.',
      user: '{{message}}',
      responseSchema: {}
    },
    'summarizer': {
      system: 'You are a text summarization assistant. Provide a concise summary of the following text.',
      user: 'Text to summarize:\n{{message}}',
      responseSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          keyPoints: { type: 'array', items: { type: 'string' } }
        },
        required: ['summary']
      }
    },
    'classifier': {
      system: 'Classify the following text into one of the provided categories.',
      user: 'Text: {{message}}\nCategories: {{categories}}',
      responseSchema: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          explanation: { type: 'string' }
        },
        required: ['category']
      }
    }
  };
}

// Register custom Handlebars helpers
Handlebars.registerHelper('json', (context) => {
  return JSON.stringify(context);
});

/**
 * Get role configuration
 * @param {string} roleName - Name of the role
 * @returns {Object} Role configuration
 */
function getRoleConfig(roleName) {
  const role = roleTemplates[roleName];
  if (!role) {
    throw new Error(`Role '${roleName}' not found`);
  }
  return role;
}

/**
 * Generate prompt using role template
 * @param {string} role - Role name
 * @param {Object} context - Template context
 * @returns {Object} Formatted messages for the LLM
 */
function generatePrompt(role, context = {}) {
  try {
    const roleConfig = getRoleConfig(role);
    const messages = [];

    // Add system message if defined
    if (roleConfig.system) {
      const systemTemplate = Handlebars.compile(roleConfig.system);
      messages.push({
        role: 'system',
        content: systemTemplate(context)
      });
    }

    // Add user message
    if (roleConfig.user) {
      const userTemplate = Handlebars.compile(roleConfig.user);
      messages.push({
        role: 'user',
        content: userTemplate(context)
      });
    }

    return {
      messages,
      responseSchema: roleConfig.responseSchema
    };
  } catch (error) {
    auditLogger.error({
      event: 'prompt_generation_error',
      role,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Validate data against JSON Schema
 * @param {*} data - Data to validate
 * @param {Object} schema - JSON Schema
 * @returns {Object} Validation result
 */
function validateSchema(data, schema) {
  if (!schema) return { valid: true };
  
  // Simple validation for now - can be replaced with ajv or similar
  try {
    if (schema.type === 'object' && data && typeof data === 'object') {
      // Check required fields
      if (Array.isArray(schema.required)) {
        for (const field of schema.required) {
          if (data[field] === undefined) {
            return {
              valid: false,
              error: `Missing required field: ${field}`
            };
          }
        }
      }
      
      // Check property types
      if (schema.properties) {
        for (const [field, fieldSchema] of Object.entries(schema.properties)) {
          if (data[field] !== undefined) {
            if (fieldSchema.type && typeof data[field] !== fieldSchema.type) {
              return {
                valid: false,
                error: `Field '${field}' must be of type ${fieldSchema.type}`
              };
            }
          }
        }
      }
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error.message}`
    };
  }
}

// Initialize role templates on module load
initializeRoleTemplates();

module.exports = {
  // Role management
  getRoleConfig,
  generatePrompt,
  validateSchema,
  
  // Constants
  ROLES_CONFIG_PATH,
  
  // For testing
  _testExports: process.env.NODE_ENV === 'test' ? {
    roleTemplates,
    initializeRoleTemplates,
    getDefaultRoleTemplates
  } : undefined
};
