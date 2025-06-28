/**
 * Prompt Enhancer Utility
 * 
 * A shared utility for enhancing prompts with context-specific instructions.
 * This can be used by any node that needs to enhance user prompts.
 */

const { auditLogger } = require('../../../services/audit-service');
const { LLMError, ERROR_CODES } = require('../../llm-connector/lib/error-handler');

class PromptEnhancer {
  /**
   * Create a new PromptEnhancer instance
   * @param {Object} options - Configuration options
   * @param {Function} options.llmProvider - Function to call the LLM
   * @param {string} [options.context='general'] - Context for the enhancement
   * @param {Object} [options.defaults={}] - Default enhancement parameters
   */
  constructor({ llmProvider, context = 'general', defaults = {} } = {}) {
    if (!llmProvider || typeof llmProvider !== 'function') {
      throw new LLMError(
        'LLM provider function is required',
        ERROR_CODES.INVALID_CONFIG
      );
    }
    
    this.llmProvider = llmProvider;
    this.context = context;
    this.defaults = {
      maxTokens: 500,
      temperature: 0.7,
      ...defaults
    };
    
    // Context-specific templates
    this.templates = {
      llmConnector: {
        systemPrompt: `You are a helpful assistant that enhances prompts for LLM processing.
Consider the following guidelines for enhancement:
1. Clarify ambiguous terms
2. Add relevant context if missing
3. Ensure the intent is clear
4. Maintain the original tone and style
5. Keep it concise and to the point

Original prompt: """
{originalPrompt}
"""

Enhancement instructions: """
{instructions}
"""

Enhanced prompt:"""`,
        stopSequences: ['"""']
      },
      mcpNode: {
        systemPrompt: `You are a helpful assistant that enhances prompts for MCP (Multi-Component Processing) tasks.
Consider the following guidelines for enhancement:
1. Ensure the prompt clearly specifies the desired output format
2. Include any necessary context about the data being processed
3. Make the instructions explicit and unambiguous
4. Consider edge cases and error conditions
5. Keep it concise and to the point

Original prompt: """
{originalPrompt}
"""

Enhancement instructions: """
{instructions}
"""

Enhanced prompt:"""`,
        stopSequences: ['"""']
      },
      general: {
        systemPrompt: `You are a helpful assistant that enhances prompts to make them more effective.
Consider the following guidelines:
1. Clarify the intent
2. Add necessary context
3. Make instructions explicit
4. Maintain the original style
5. Keep it concise

Original prompt: """
{originalPrompt}
"""

Enhancement instructions: """
{instructions}
"""

Enhanced prompt:"""`,
        stopSequences: ['"""']
      }
    };
  }

  /**
   * Enhance a prompt based on instructions
   * @param {string} originalPrompt - The original user prompt
   * @param {string} instructions - Instructions for enhancement
   * @param {Object} [options] - Additional options
   * @returns {Promise<string>} - The enhanced prompt
   */
  async enhance(originalPrompt, instructions, options = {}) {
    if (!originalPrompt || typeof originalPrompt !== 'string') {
      throw new LLMError(
        'Original prompt must be a non-empty string',
        ERROR_CODES.INVALID_INPUT
      );
    }

    if (!instructions || typeof instructions !== 'string') {
      throw new LLMError(
        'Enhancement instructions must be a non-empty string',
        ERROR_CODES.INVALID_INPUT
      );
    }

    try {
      const template = this.templates[this.context] || this.templates.general;
      const systemPrompt = template.systemPrompt
        .replace('{originalPrompt}', originalPrompt)
        .replace('{instructions}', instructions);

      const result = await this.llmProvider({
        prompt: systemPrompt,
        max_tokens: options.maxTokens || this.defaults.maxTokens,
        temperature: options.temperature || this.defaults.temperature,
        stop: options.stop || template.stopSequences
      });

      const enhancedPrompt = result.text.trim();
      
      // Log the enhancement
      auditLogger.debug({
        event: 'prompt_enhanced',
        context: this.context,
        originalLength: originalPrompt.length,
        enhancedLength: enhancedPrompt.length,
        instructionLength: instructions.length
      });

      return enhancedPrompt;
    } catch (error) {
      auditLogger.error({
        event: 'prompt_enhancement_failed',
        context: this.context,
        error: error.message,
        originalPromptLength: originalPrompt?.length || 0,
        instructionLength: instructions?.length || 0
      });
      
      // If enhancement fails, return the original prompt
      return originalPrompt;
    }
  }

  /**
   * Create a new instance with a different context
   * @param {string} context - The new context
   * @returns {PromptEnhancer} - A new PromptEnhancer instance
   */
  withContext(context) {
    return new PromptEnhancer({
      llmProvider: this.llmProvider,
      context,
      defaults: this.defaults
    });
  }
}

// Factory function for creating enhancers
function createPromptEnhancer(options) {
  return new PromptEnhancer(options);
}

module.exports = {
  PromptEnhancer,
  createPromptEnhancer
};
