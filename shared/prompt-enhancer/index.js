/**
 * @typedef {Object} PromptEnhancerOptions
 * @property {Function} llmProvider - Function that calls the LLM service. Expected to return { text: enhancedPrompt }.
 * @property {string} [context='general'] - Context for enhancement ('llmConnector', 'mcpNode', 'general').
 * @property {Object} [defaults={}] - Default parameters for LLM calls.
 */

/**
 * Creates a new PromptEnhancer instance.
 * @param {PromptEnhancerOptions} options - Configuration options for the enhancer.
 * @returns {Object} A PromptEnhancer instance.
 */
const Handlebars = require('handlebars');
const path = require('path');

const templates = {};

/**
 * Loads a template based on the given context.
 * @param {string} context - The context for which to load the template.
 * @returns {Object} The loaded template object.
 * @throws {Error} If the template for the given context is not found.
 */
function loadTemplate(context) {
    if (!templates[context]) {
        try {
            // Dynamically require the template file
            const templatePath = path.join(__dirname, 'templates', `${context}.js`);
            templates[context] = require(templatePath);
        } catch (error) {
            throw new Error(`Template not found for context: ${context}. Error: ${error.message}`);
        }
    }
    return templates[context];
}

/**
 * Creates a new PromptEnhancer instance.
 * @param {PromptEnhancerOptions} options - Configuration options for the enhancer.
 * @returns {Object} A PromptEnhancer instance.
 */
function createPromptEnhancer(options = {}) {
    const { llmProvider, context = 'general', defaults = {} } = options;

    if (typeof llmProvider !== 'function') {
        throw new Error('llmProvider function is required.');
    }

    /**
     * Enhances the original prompt based on instructions and context.
     * @param {string} original - The original prompt string.
     * @param {string} instructions - Instructions for enhancement (e.g., 'Make it more detailed').
     * @param {Object} [llmOptions={}] - Additional options for the LLM call.
     * @returns {Promise<string>} A promise that resolves to the enhanced prompt string.
     */
    async function enhance(original, instructions, llmOptions = {}) {
        const mergedOptions = { ...defaults, ...llmOptions };
        
        try {
            const templateObj = loadTemplate(context);
            const compiledTemplate = Handlebars.compile(templateObj.template);
            
            const prompt = compiledTemplate({
                original,
                instructions,
                context,
                // Add any other variables needed by the template
            });

            console.log('Calling llmProvider with:', { prompt, ...mergedOptions });
            const response = await llmProvider({
                prompt,
                ...mergedOptions
            });
            return response.text; // Assuming llmProvider returns { text: enhancedPrompt }
        } catch (error) {
            console.error('Prompt enhancement failed:', error.message, error.stack);
            return original; // Graceful degradation: return original prompt on error
        }
    }

    /**
     * Creates a new PromptEnhancer instance with a different context.
     * @param {string} newContext - The new context for the enhancer.
     * @returns {Object} A new PromptEnhancer instance with the specified context.
     */
    function withContext(newContext) {
        return createPromptEnhancer({ llmProvider, context: newContext, defaults });
    }

    return {
        enhance,
        withContext,
        context, // Expose context
        defaults, // Expose defaults
        llmProvider // Expose llmProvider for testing purposes if needed
    };
}

module.exports = { createPromptEnhancer };
