/**
 * Prompt Module
 * Exports all prompt-related functionality
 */

const { RoleManager } = require('./role-manager');
const PromptBuilder = require('./prompt-builder');
const MessageFormatter = require('./message-formatter');
const {
  validateTemplate,
  renderTemplate,
  extractVariables
} = require('./template-utils');

// Create default instances
const defaultRoleManager = new RoleManager();
const defaultPromptBuilder = new PromptBuilder(defaultRoleManager);

// Re-export constructors and utilities
module.exports = {
  // Core classes
  RoleManager,
  PromptBuilder,
  MessageFormatter,
  
  // Template utilities
  template: {
    validate: validateTemplate,
    render: renderTemplate,
    extractVariables
  },
  
  // Default instances
  defaultRoleManager,
  defaultPromptBuilder,
  
  // Convenience methods using default instances
  buildPrompt: (message, options) => defaultPromptBuilder.buildPrompt(message, options),
  validatePrompt: (prompt) => defaultPromptBuilder.validatePrompt(prompt),
  estimateTokenCount: (prompt) => defaultPromptBuilder.estimateTokenCount(prompt)
};
