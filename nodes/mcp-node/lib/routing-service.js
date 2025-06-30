/**
 * Routing Service for MCP Node
 * 
 * Provides the core routing logic for the MCP node, including:
 * - Rule-based routing
 * - AI-powered routing
 * - Hybrid routing (combining rules and AI)
 * - Fallback mechanisms
 */

const { createPromptEnhancer } = require('../../../shared/prompt-enhancer');

/**
 * Creates a routing service instance
 * @param {Object} options - Configuration options
 * @param {Object} options.node - The Node-RED node instance
 * @param {Object} options.RED - The Node-RED runtime
 * @param {Array} options.rules - Array of routing rules
 * @param {Array} options.outputLabels - Labels for output ports
 * @param {Object} options.llmConfig - LLM configuration node (optional)
 * @param {String} options.aiPromptTemplate - Template for AI routing prompts
 * @param {Boolean} options.debugMode - Whether debug mode is enabled
 * @returns {Object} The routing service instance
 */
function createRoutingService(options) {
    const {
        node,
        RED,
        rules = [],
        outputLabels = [],
        llmConfig,
        aiPromptTemplate = "",
        debugMode = false
    } = options;

    // Initialize prompt enhancer if AI routing is enabled
    let promptEnhancer = null;
    if (llmConfig) {
        promptEnhancer = createPromptEnhancer({
            llmProvider: async (params) => {
                // Use the LLM config node to make the actual call
                const result = await llmConfig.sendMessage(params.prompt, {
                    maxTokens: params.maxTokens || 500,
                    temperature: params.temperature || 0.3,
                    // Add other parameters as needed
                });
                return { text: result.text || result };
            },
            context: 'mcpNode', // Use MCP-specific templates
            defaults: {
                maxTokens: 500,
                temperature: 0.3
            }
        });
    }

    /**
     * Evaluates rule-based routing
     * @param {Object} msg - The message to route
     * @returns {Array} Array of selected output indices
     */
    async function evaluateRules(msg) {
        const startTime = Date.now();
        const selectedOutputs = [];
        const debugInfo = {
            ruleEvaluations: [],
            executionTime: 0
        };

        // Process each rule
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            let ruleMatched = false;

            try {
                // Evaluate the rule condition
                if (rule.type === "jsonata") {
                    // JSONata expression evaluation
                    const expression = RED.util.prepareJSONataExpression(rule.condition, node);
                    ruleMatched = RED.util.evaluateJSONataExpression(expression, msg);
                } else if (rule.type === "javascript") {
                    // JavaScript function evaluation (with sandbox)
                    const sandbox = {
                        msg: RED.util.cloneMessage(msg),
                        result: false,
                        node: {
                            id: node.id,
                            name: node.name
                        },
                        RED: {
                            util: RED.util
                        }
                    };
                    
                    // Create and run the function in a sandbox
                    const vmContext = RED.util.createContext(sandbox);
                    try {
                        RED.util.evaluateNodeProperty(rule.condition, "javascript", node, msg, vmContext);
                        ruleMatched = sandbox.result === true;
                    } catch (err) {
                        node.warn(`Error evaluating rule ${i+1}: ${err.message}`);
                        ruleMatched = false;
                    }
                } else if (rule.type === "simple") {
                    // Simple property comparison
                    const property = RED.util.getMessageProperty(msg, rule.property);
                    const value = rule.value;
                    
                    switch (rule.operator) {
                        case "eq": ruleMatched = property == value; break;
                        case "neq": ruleMatched = property != value; break;
                        case "lt": ruleMatched = property < value; break;
                        case "lte": ruleMatched = property <= value; break;
                        case "gt": ruleMatched = property > value; break;
                        case "gte": ruleMatched = property >= value; break;
                        case "contains": ruleMatched = String(property).includes(value); break;
                        case "regex": ruleMatched = new RegExp(value).test(String(property)); break;
                        default: ruleMatched = false;
                    }
                }

                // If rule matched and has a valid output, add it to selected outputs
                if (ruleMatched && rule.output >= 0 && rule.output < outputLabels.length) {
                    selectedOutputs.push({
                        index: rule.output,
                        msg: RED.util.cloneMessage(msg),
                        rule: i,
                        priority: rule.priority || 0
                    });
                }

                // Add debug info if enabled
                if (debugMode) {
                    debugInfo.ruleEvaluations.push({
                        ruleIndex: i,
                        ruleType: rule.type,
                        condition: rule.condition,
                        matched: ruleMatched,
                        output: rule.output,
                        outputLabel: outputLabels[rule.output] || `Output ${rule.output}`
                    });
                }
            } catch (error) {
                node.warn(`Error in rule ${i+1}: ${error.message}`);
                
                if (debugMode) {
                    debugInfo.ruleEvaluations.push({
                        ruleIndex: i,
                        error: error.message,
                        matched: false
                    });
                }
            }
        }

        debugInfo.executionTime = Date.now() - startTime;
        
        return {
            outputs: selectedOutputs,
            debug: debugInfo
        };
    }

    /**
     * Performs AI-based routing
     * @param {Object} msg - The message to route
     * @returns {Array} Array of selected output indices
     */
    async function performAIRouting(msg) {
        const startTime = Date.now();
        const debugInfo = {
            prompt: "",
            response: "",
            parsedOutputs: [],
            executionTime: 0
        };

        try {
            if (!llmConfig) {
                throw new Error("LLM Config not available for AI routing");
            }

            // Prepare the prompt for the AI
            let prompt = aiPromptTemplate;
            
            // If the prompt is empty, use a default template
            if (!prompt || prompt.trim() === "") {
                prompt = `You are a message router that decides where to send incoming messages.
                
Available outputs: {{outputs}}

Message content:
{{message}}

Your task is to analyze the message and decide which output(s) it should be sent to.
Respond with a JSON object that contains an "outputs" array with the indices of the selected outputs.
Example: { "outputs": [0, 2] }`;
            }
            
            // Replace variables in the prompt
            prompt = prompt
                .replace(/{{outputs}}/g, outputLabels.map((label, i) => `${i}: ${label}`).join("\n"))
                .replace(/{{message}}/g, JSON.stringify(msg, null, 2));
            
            // Use prompt enhancer if available
            if (promptEnhancer) {
                prompt = await promptEnhancer.enhance(prompt, "Optimize this routing prompt for clarity and precision");
            }
            
            if (debugMode) {
                debugInfo.prompt = prompt;
            }
            
            // Send the prompt to the LLM
            const response = await llmConfig.sendMessage(prompt, {
                temperature: 0.3,
                maxTokens: 500,
                responseFormat: { type: "json_object" }
            });
            
            if (debugMode) {
                debugInfo.response = response;
            }
            
            // Parse the response to get the selected outputs
            let selectedOutputs = [];
            let parsedResponse;
            
            try {
                // Try to parse as JSON
                if (typeof response === 'string') {
                    parsedResponse = JSON.parse(response);
                } else if (typeof response === 'object') {
                    parsedResponse = response;
                }
                
                // Extract outputs array
                if (parsedResponse && Array.isArray(parsedResponse.outputs)) {
                    selectedOutputs = parsedResponse.outputs
                        .filter(output => Number.isInteger(output) && output >= 0 && output < outputLabels.length)
                        .map(output => ({
                            index: output,
                            msg: RED.util.cloneMessage(msg),
                            source: 'ai',
                            priority: 10 // AI decisions get higher priority by default
                        }));
                    
                    if (debugMode) {
                        debugInfo.parsedOutputs = selectedOutputs.map(o => ({
                            index: o.index,
                            label: outputLabels[o.index] || `Output ${o.index}`
                        }));
                    }
                } else {
                    throw new Error("Invalid response format from LLM");
                }
            } catch (parseError) {
                node.warn(`Failed to parse AI routing response: ${parseError.message}`);
                if (debugMode) {
                    debugInfo.parseError = parseError.message;
                }
            }
            
            debugInfo.executionTime = Date.now() - startTime;
            
            return {
                outputs: selectedOutputs,
                debug: debugInfo
            };
        } catch (error) {
            node.error(`AI routing error: ${error.message}`);
            
            debugInfo.error = error.message;
            debugInfo.executionTime = Date.now() - startTime;
            
            return {
                outputs: [],
                debug: debugInfo,
                error: error.message
            };
        }
    }

    /**
     * Routes a message based on configured routing mode
     * @param {Object} msg - The message to route
     * @returns {Object} Routing result with outputs and debug info
     */
    async function route(msg) {
        const startTime = Date.now();
        let result = {
            outputs: [],
            debug: {},
            decision: {
                mode: options.routingMode,
                timestamp: new Date().toISOString()
            },
            executionTime: 0
        };

        try {
            if (options.routingMode === "rule") {
                // Rule-based routing only
                const ruleResult = await evaluateRules(msg);
                result.outputs = ruleResult.outputs;
                result.debug.rules = ruleResult.debug;
                result.decision.source = "rules";
            } 
            else if (options.routingMode === "ai") {
                // AI-based routing only
                const aiResult = await performAIRouting(msg);
                result.outputs = aiResult.outputs;
                result.debug.ai = aiResult.debug;
                result.decision.source = "ai";
            }
            else if (options.routingMode === "hybrid") {
                // Hybrid routing (both rule and AI)
                const [ruleResult, aiResult] = await Promise.all([
                    evaluateRules(msg),
                    performAIRouting(msg)
                ]);
                
                // Combine outputs, prioritizing based on priority field
                result.outputs = [...ruleResult.outputs, ...aiResult.outputs]
                    .sort((a, b) => b.priority - a.priority);
                
                result.debug = {
                    rules: ruleResult.debug,
                    ai: aiResult.debug
                };
                
                result.decision.source = "hybrid";
            }
            
            // Apply fallback if no outputs were selected
            if (result.outputs.length === 0 && options.fallbackOutput !== undefined) {
                result.outputs.push({
                    index: options.fallbackOutput,
                    msg: RED.util.cloneMessage(msg),
                    source: 'fallback'
                });
                result.decision.fallbackUsed = true;
            }
            
            // Deduplicate outputs (keep highest priority for each output index)
            const outputMap = new Map();
            result.outputs.forEach(output => {
                const existingOutput = outputMap.get(output.index);
                if (!existingOutput || output.priority > existingOutput.priority) {
                    outputMap.set(output.index, output);
                }
            });
            
            result.outputs = Array.from(outputMap.values());
            result.executionTime = Date.now() - startTime;
            
            return result;
        } catch (error) {
            node.error(`Routing error: ${error.message}`);
            result.error = error.message;
            result.executionTime = Date.now() - startTime;
            return result;
        }
    }

    // Return the public API
    return {
        route,
        evaluateRules,
        performAIRouting
    };
}

module.exports = { createRoutingService };
