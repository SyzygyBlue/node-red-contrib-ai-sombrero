/**
 * Role Manager
 * Handles role-based prompt templates and role management
 */

const { LLMError, ERROR_CODES } = require('../validation/error-types');
const { handleLLMError } = require('../utils/error-handler');
const { validateTemplate } = require('./template-utils');

// Default role templates
const DEFAULT_ROLES = {
  system: {
    description: 'System instructions and context',
    template: 'You are a helpful AI assistant.',
    inherits: null,
    variables: {}
  },
  user: {
    description: 'User input or query',
    template: '{{content}}',
    inherits: null,
    variables: {}
  },
  assistant: {
    description: 'AI assistant response',
    template: '{{content}}',
    inherits: null,
    variables: {}
  },
  // Example of a more complex role
  summarizer: {
    description: 'Summarizes text',
    template: 'Please summarize the following text:\n\n{{content}}\n\nSummary:',
    inherits: 'system',
    variables: {
      tone: 'concise',
      length: 'brief'
    }
  }
};

class RoleManager {
  constructor(roles = {}) {
    this.roles = JSON.parse(JSON.stringify(DEFAULT_ROLES)); // Deep clone
    
    // Add or update with provided roles
    Object.entries(roles).forEach(([name, role]) => {
      this.addRole(name, role);
    });
  }

  /**
   * Get a role template by name with inheritance resolved
   * @param {string} roleName - Name of the role
   * @param {Set} [visited] - Tracks visited roles to detect circular inheritance
   * @returns {Object} Resolved role template object
   */
  getRole(roleName, visited = new Set()) {
    if (visited.has(roleName)) {
      throw new LLMError(
        `Circular role inheritance detected for role '${roleName}'`,
        ERROR_CODES.INVALID_CONFIG
      );
    }
    
    const role = this.roles[roleName];
    if (!role) {
      throw new LLMError(
        `Role '${roleName}' not found`,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    // If no inheritance, return a copy of the role
    if (!role.inherits) {
      return { ...role };
    }
    
    // Resolve inheritance chain
    visited.add(roleName);
    const parentRole = this.getRole(role.inherits, visited);
    
    // Merge with parent role (child properties take precedence)
    return {
      ...parentRole,
      ...role,
      variables: {
        ...(parentRole.variables || {}),
        ...(role.variables || {})
      }
    };
  }

  /**
   * Add or update a role with validation
   * @param {string} roleName - Name of the role
   * @param {Object} role - Role definition
   * @throws {LLMError} If role is invalid
   */
  addRole(roleName, role) {
    if (typeof roleName !== 'string' || !roleName.trim()) {
      throw new LLMError('Role name must be a non-empty string', ERROR_CODES.INVALID_INPUT);
    }
    
    // Validate role properties
    if (role.inherits && typeof role.inherits !== 'string') {
      throw new LLMError('Role inheritance must be a string', ERROR_CODES.INVALID_INPUT);
    }
    
    if (role.variables && (typeof role.variables !== 'object' || Array.isArray(role.variables))) {
      throw new LLMError('Role variables must be an object', ERROR_CODES.INVALID_INPUT);
    }
    
    // Set default values
    const newRole = {
      description: '',
      template: '{{content}}',
      inherits: null,
      variables: {},
      ...role
    };
    
    // Validate template syntax
    validateTemplate(newRole.template);
    
    this.roles[roleName] = newRole;
  }

  /**
   * Set a role
   * @param {string} roleName - Name of the role
   * @param {Object} role - Role definition
   */
  setRole(roleName, role) {
    if (!roleName || typeof roleName !== 'string') {
      throw new LLMError('Role name must be a string', ERROR_CODES.INVALID_INPUT);
    }
    
    if (!role || typeof role !== 'object') {
      throw new LLMError('Role must be an object', ERROR_CODES.INVALID_INPUT);
    }
    
    this.roles[roleName] = {
      ...this.roles[roleName], // Preserve existing role if it exists
      ...role
    };
  }

  /**
   * Render a role template with the provided context
   * @param {string} roleName - Name of the role
   * @param {Object} context - Template context
   * @returns {string} Rendered template
   */
  renderTemplate(roleName, context = {}) {
    try {
      const role = this.getRole(roleName);
      return Mustache.render(role.template, context);
    } catch (error) {
      const { error: llmError } = handleLLMError(error, {
        event: 'template_render_error',
        role: roleName,
        contextKeys: Object.keys(context)
      });
      
      throw llmError;
    }
  }

  /**
   * Process a message according to its role
   * @param {Object} message - Message to process
   * @returns {Object} Processed message
   */
  processMessage(message) {
    try {
      if (!message || typeof message !== 'object') {
        throw new LLMError('Message must be an object', ERROR_CODES.INVALID_INPUT);
      }

      const { role = 'user', content = '' } = message;
      const processed = { ...message };
      
      // Get the role template
      const roleTemplate = this.getRole(role);
      
      // Render the template with the message content
      processed.content = this.renderTemplate(role, { content });
      
      // Add role metadata if not present
      if (!processed.role) {
        processed.role = role;
      }
      
      return processed;
    } catch (error) {
      const { error: llmError } = handleLLMError(error, {
        event: 'message_processing_error',
        role: message?.role
      });
      
      throw llmError;
    }
  }

  /**
   * Get all registered roles
   * @returns {Object} Map of role names to role definitions
   */
  getAllRoles() {
    return { ...this.roles };
  }
}

// Create a default instance
const defaultRoleManager = new RoleManager();

module.exports = {
  RoleManager,
  defaultRoleManager
};
