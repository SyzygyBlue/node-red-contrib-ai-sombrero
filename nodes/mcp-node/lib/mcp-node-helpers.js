/**
 * MCP Node Helper Functions
 * 
 * Provides utility functions for the MCP node, including:
 * - Message processing and enhancement
 * - Rule evaluation helpers
 * - AI prompt preparation
 * - Decision logging
 */

const { createPromptEnhancer } = require('../../../shared/prompt-enhancer');

/**
 * Process and enhance a message based on configuration
 * @param {Object} msg - The message to process
 * @param {Object} config - Node configuration
 * @param {Object} RED - Node-RED runtime
 * @returns {Object} The processed message
 */
function processMessage(msg, config, RED) {
    // Clone the message to avoid modifying the original
    const processedMsg = RED.util.cloneMessage(msg);
    
    // Apply message transformations if configured
    if (config.transformations && Array.isArray(config.transformations)) {
        config.transformations.forEach(transform => {
            try {
                if (transform.type === 'set') {
                    // Set a property
                    RED.util.setMessageProperty(
                        processedMsg, 
                        transform.property, 
                        transform.value, 
                        transform.createMissing || true
                    );
                } else if (transform.type === 'delete') {
                    // Delete a property
                    RED.util.deleteMessageProperty(processedMsg, transform.property);
                } else if (transform.type === 'move') {
                    // Move a property
                    const value = RED.util.getMessageProperty(processedMsg, transform.from);
                    if (value !== undefined) {
                        RED.util.setMessageProperty(
                            processedMsg, 
                            transform.to, 
                            value, 
                            transform.createMissing || true
                        );
                        RED.util.deleteMessageProperty(processedMsg, transform.from);
                    }
                }
            } catch (error) {
                // Log error but continue with other transformations
                console.error(`Error applying transformation: ${error.message}`);
            }
        });
    }
    
    // Add context enrichment if configured
    if (config.contextEnrichment) {
        processedMsg._context = processedMsg._context || {};
        
        // Add timestamp if not already present
        if (!processedMsg._context.timestamp) {
            processedMsg._context.timestamp = new Date().toISOString();
        }
        
        // Add node info
        processedMsg._context.node = {
            id: config.id,
            name: config.name,
            type: 'mcp-node'
        };
        
        // Add custom context fields
        if (config.contextFields && Array.isArray(config.contextFields)) {
            config.contextFields.forEach(field => {
                try {
                    if (field.name && field.value) {
                        processedMsg._context[field.name] = field.value;
                    }
                } catch (error) {
                    console.error(`Error adding context field: ${error.message}`);
                }
            });
        }
    }
    
    return processedMsg;
}

/**
 * Evaluate rules against a message
 * @param {Object} msg - The message to evaluate
 * @param {Array} rules - Array of rules to evaluate
 * @param {Object} RED - Node-RED runtime
 * @param {Object} node - Node instance
 * @returns {Array} Array of matched rule indices
 */
function evaluateRules(msg, rules, RED, node) {
    const matchedRules = [];
    
    if (!Array.isArray(rules) || rules.length === 0) {
        return matchedRules;
    }
    
    rules.forEach((rule, index) => {
        try {
            let matched = false;
            
            // Skip disabled rules
            if (rule.disabled) {
                return;
            }
            
            if (rule.type === 'jsonata') {
                // JSONata expression
                const expression = RED.util.prepareJSONataExpression(rule.expression, node);
                matched = RED.util.evaluateJSONataExpression(expression, msg);
            } else if (rule.type === 'javascript') {
                // JavaScript function
                const sandbox = {
                    msg: RED.util.cloneMessage(msg),
                    result: false
                };
                
                const vmContext = RED.util.createContext(sandbox);
                RED.util.evaluateNodeProperty(rule.function, 'javascript', node, msg, vmContext);
                matched = sandbox.result === true;
            } else if (rule.type === 'simple') {
                // Simple property comparison
                const property = RED.util.getMessageProperty(msg, rule.property);
                
                switch (rule.operator) {
                    case 'eq': matched = property == rule.value; break;
                    case 'neq': matched = property != rule.value; break;
                    case 'lt': matched = property < rule.value; break;
                    case 'lte': matched = property <= rule.value; break;
                    case 'gt': matched = property > rule.value; break;
                    case 'gte': matched = property >= rule.value; break;
                    case 'contains': matched = String(property).includes(rule.value); break;
                    case 'regex': matched = new RegExp(rule.value).test(String(property)); break;
                    default: matched = false;
                }
            }
            
            if (matched) {
                matchedRules.push({
                    index,
                    output: rule.output,
                    priority: rule.priority || 0
                });
            }
        } catch (error) {
            console.error(`Error evaluating rule ${index}: ${error.message}`);
        }
    });
    
    return matchedRules;
}

/**
 * Prepare an AI prompt for routing decisions
 * @param {Object} msg - The message to route
 * @param {Object} config - Node configuration
 * @param {Array} outputLabels - Array of output labels
 * @returns {String} The prepared prompt
 */
function prepareAIPrompt(msg, config, outputLabels) {
    let prompt = config.aiPromptTemplate || '';
    
    // If no template is provided, use a default one
    if (!prompt) {
        prompt = `You are a message router that decides where to send incoming messages.
        
Available outputs:
{{outputs}}

Message content:
{{message}}

Your task is to analyze the message and decide which output(s) it should be sent to.
Respond with a JSON object that contains an "outputs" array with the indices of the selected outputs.
Example: { "outputs": [0, 2] }`;
    }
    
    // Replace template variables
    const outputsText = outputLabels.map((label, i) => `${i}: ${label || `Output ${i}`}`).join('\n');
    const messageText = JSON.stringify(msg, null, 2);
    
    prompt = prompt
        .replace(/{{outputs}}/g, outputsText)
        .replace(/{{message}}/g, messageText);
    
    return prompt;
}

/**
 * Enhance an AI prompt using the prompt enhancer
 * @param {String} prompt - The original prompt
 * @param {Object} llmConfig - LLM configuration node
 * @param {String} instructions - Enhancement instructions
 * @returns {Promise<String>} The enhanced prompt
 */
async function enhancePrompt(prompt, llmConfig, instructions = "Optimize this routing prompt") {
    if (!llmConfig) {
        return prompt;
    }
    
    try {
        const enhancer = createPromptEnhancer({
            llmProvider: async (params) => {
                const result = await llmConfig.sendMessage(params.prompt, {
                    maxTokens: params.maxTokens || 500,
                    temperature: params.temperature || 0.3
                });
                return { text: result.text || result };
            },
            context: 'mcpNode',
            defaults: {
                maxTokens: 500,
                temperature: 0.3
            }
        });
        
        return await enhancer.enhance(prompt, instructions);
    } catch (error) {
        console.error(`Error enhancing prompt: ${error.message}`);
        return prompt; // Return original prompt on error
    }
}

/**
 * Log a routing decision
 * @param {Object} node - Node instance for logging
 * @param {Object} decision - Decision data
 * @param {Array} outputs - Routing outputs
 * @param {Number} executionTime - Execution time in ms
 */
function logDecision(node, decision, outputs, executionTime) {
    try {
        node.log(`Routing decision: mode=${decision.mode}, rule=${decision.rule}`);
    } catch (error) {
        console.error(`Error logging decision: ${error.message}`);
    }
}

module.exports = {
    processMessage,
    evaluateRules,
    prepareAIPrompt,
    enhancePrompt,
    logDecision
};
