/**
 * Message Formatter
 * Handles formatting messages according to role templates
 */

const { LLMError, ERROR_CODES } = require('../validation/error-types');
const { renderTemplate } = require('./template-utils');

class MessageFormatter {
  /**
   * Create a new MessageFormatter
   * @param {Object} roleManager - Instance of RoleManager
   */
  constructor(roleManager) {
    if (!roleManager || typeof roleManager.getRole !== 'function') {
      throw new LLMError(
        'RoleManager instance is required',
        ERROR_CODES.INVALID_INPUT
      );
    }
    this.roleManager = roleManager;
  }

  /**
   * Format a message using the specified role template
   * @param {Object} message - The message to format
   * @param {string} roleName - Name of the role to use for formatting
   * @param {Object} [context={}] - Additional context for template rendering
   * @returns {string} Formatted message
   */
  formatMessage(message, roleName, context = {}) {
    try {
      // Get the role with inheritance resolved
      const role = this.roleManager.getRole(roleName);
      
      // Prepare the context for template rendering
      const renderContext = {
        // Role variables first (can be overridden by message or context)
        ...role.variables,
        // Then message properties (can override role variables)
        ...message,
        // Then explicit context (highest precedence)
        ...context,
        // Ensure content is always available
        content: message.content || message.payload || ''
      };

      // Render the template with the context
      return renderTemplate(role.template, renderContext);
    } catch (error) {
      // Enhance the error with more context
      if (error.code === ERROR_CODES.INVALID_INPUT) {
        throw new LLMError(
          `Failed to format message with role '${roleName}': ${error.message}`,
          ERROR_CODES.INVALID_INPUT,
          { originalError: error }
        );
      }
      throw error;
    }
  }

  /**
   * Format a conversation with multiple messages
   * @param {Array} messages - Array of message objects
   * @param {Object} [options={}] - Formatting options
   * @returns {string} Formatted conversation
   */
  formatConversation(messages = [], options = {}) {
    if (!Array.isArray(messages)) {
      throw new LLMError(
        'Messages must be an array',
        ERROR_CODES.INVALID_INPUT
      );
    }

    return messages
      .map(msg => {
        const role = msg.role || 'user';
        return this.formatMessage(msg, role, options);
      })
      .join('\n\n');
  }
}

module.exports = MessageFormatter;
