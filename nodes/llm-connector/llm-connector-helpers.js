/**
 * LLM Connector Helpers
 * Core business logic for the LLM Connector node
 * 
 * This module serves as the main entry point for LLM operations,
 * delegating to specialized modules for specific functionality.
 * 
 * Note: This file is now a thin wrapper around the modular implementation
 * in the lib/ directory. New functionality should be added there.
 */

// Import the core functionality from our modular implementation
const {
  // Core message processing
  validateMessage,
  normalizeMessage,
  processMessage,
  
  // Prompt building
  buildPrompt,
  
  // Role management
  RoleManager,
  defaultRoleManager,
  
  // Error handling and debugging
  handleLLMError,
  createError,
  createDebugLogger,
  createDebugContext,
  
  // Error types
  LLMError,
  ERROR_CODES
} = require('./lib');

// For backward compatibility
const roleHelper = defaultRoleManager;

// Export all public API functions
module.exports = {
  // Core message processing
  validateMessage,
  normalizeMessage,
  processMessage,
  
  // Prompt building
  buildPrompt,
  
  // Role management
  RoleManager,
  defaultRoleManager,
  
  // Error handling and debugging
  handleLLMError,
  createError,
  createDebugLogger,
  createDebugContext,
  
  // Constants and types
  LLMError,
  ERROR_CODES,
  
  // Backward compatibility
  roleHelper,
  
  // For backward compatibility with existing code
  processTask: (task, node) => {
    console.warn('processTask is deprecated. Use processMessage instead.');
    return processMessage(task, node);
  },
  
  validateTask: (task, node) => {
    console.warn('validateTask is deprecated. Use validateMessage instead.');
    return validateMessage(task, node);
  }
};
