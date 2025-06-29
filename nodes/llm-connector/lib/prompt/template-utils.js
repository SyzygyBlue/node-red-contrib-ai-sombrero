/**
 * Template Utilities
 * Handles template processing, variable interpolation, and validation
 */

const { LLMError, ERROR_CODES } = require('../validation/error-types');
const Mustache = require('mustache');

/**
 * Validates a template string
 * @param {string} template - The template string to validate
 * @throws {LLMError} If template is invalid
 */
function validateTemplate(template) {
  if (typeof template !== 'string') {
    throw new LLMError('Template must be a string', ERROR_CODES.INVALID_INPUT);
  }
  
  try {
    Mustache.parse(template);
    return true;
  } catch (error) {
    throw new LLMError(
      `Invalid template: ${error.message}`,
      ERROR_CODES.INVALID_INPUT
    );
  }
}

/**
 * Renders a template with the provided context
 * @param {string} template - The template string
 * @param {Object} context - Variables for template interpolation
 * @returns {string} Rendered template
 */
function renderTemplate(template, context = {}) {
  try {
    return Mustache.render(template, context);
  } catch (error) {
    throw new LLMError(
      `Failed to render template: ${error.message}`,
      ERROR_CODES.TEMPLATE_ERROR
    );
  }
}
/**
 * Extracts all variable names from a template
 * @param {string} template - The template string
 * @returns {Set<string>} Set of variable names used in the template
 */
function extractVariables(template) {
  const variables = new Set();
  const tokens = Mustache.parse(template);
  
  tokens.forEach(token => {
    const [type, key] = token;
    if (type === 'name' || type === '&') {
      variables.add(key);
    }
  });
  
  return variables;
}

module.exports = {
  validateTemplate,
  renderTemplate,
  extractVariables
};
