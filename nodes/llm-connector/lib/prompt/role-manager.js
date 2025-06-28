/**
 * Role Manager
 * Handles role-based prompt templates and role management
 */

const { LLMError, ERROR_CODES } = require('../validation/error-types');
const { handleLLMError } = require('../utils/error-handler');
const Mustache = require('mustache');

// Default role templates
const DEFAULT_ROLES = {
  system: {
    description: 'System instructions and context',
    template: 'You are a helpful AI assistant.'
  },
  user: {
    description: 'User input or query',
    template: '{{content}}'
  },
  assistant: {
    description: 'AI assistant response',
    template: '{{content}}'
  }
};

class RoleManager {
  constructor(roles = {}) {
    this.roles = { ...DEFAULT_ROLES, ...roles };
  }

  /**
   * Get a role template by name
   * @param {string} roleName - Name of the role
   * @returns {Object} Role template object
   */
  getRole(roleName) {
    const role = this.roles[roleName];
    if (!role) {
      throw new LLMError(
        `Role '${roleName}' not found`,
        ERROR_CODES.INVALID_INPUT
      );
    }
    return { ...role };
  }

  /**
   * Add or update a role
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
export const defaultRoleManager = new RoleManager();

module.exports = {
  RoleManager,
  defaultRoleManager
};
