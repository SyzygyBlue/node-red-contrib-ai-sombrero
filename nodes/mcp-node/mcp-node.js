/**
 * MCP (Multi-Component Processing) Node for Node-RED
 * 
 * This node provides dynamic routing capabilities with both AI-powered and rule-based
 * decision making. It can route messages to different outputs based on content analysis,
 * rule evaluation, or a combination of both.
 */

module.exports = function(RED) {
    "use strict";
    
    const auditLogger = require('services/audit-service');
    const { createRoutingService } = require('./lib/routing-service');
    const { processMessage, evaluateRules, prepareAIPrompt } = require('./lib/mcp-node-helpers');
    const uiHandler = require('./lib/ui-handler')(RED);
    
    /**
     * MCP Node Constructor
     * Creates a new instance of the MCP node
     */
    function MCPNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Decision history storage
        let decisionHistory = [];
        const MAX_HISTORY_SIZE = 50;
        
        // Initialize node configuration
        node.name = config.name || "MCP Node";
        node.routingMode = config.routingMode || "rule"; // "rule", "ai", "hybrid"
        node.rules = config.rules || [];
        node.aiPromptTemplate = config.aiPromptTemplate || "";
        node.outputLabels = config.outputLabels || [];
        node.debugMode = config.debugMode || false;
        
        // Get LLM config if AI routing is enabled
        if (node.routingMode === "ai" || node.routingMode === "hybrid") {
            node.llmConfig = RED.nodes.getNode(config.llmConfig);
            if (!node.llmConfig) {
                node.error("LLM Config node not found. AI routing will not function.");
                node.status({fill:"red", shape:"dot", text:"Missing LLM config"});
            }
        }
        
        // Initialize routing service
        const routingService = createRoutingService({
            node,
            RED,
            rules: node.rules,
            outputLabels: node.outputLabels,
            llmConfig: node.llmConfig,
            aiPromptTemplate: node.aiPromptTemplate,
            debugMode: node.debugMode
        });
        
        // Handle incoming messages
        node.on("input", async function(msg, send, done) {
            // Ensure backwards compatibility with Node-RED < 1.0
            send = send || function() { node.send.apply(node, arguments); };
            done = done || function(err) { if (err) { node.error(err, msg); } };
            
            try {
                node.status({fill:"blue", shape:"dot", text:"processing"});
                
                // Audit the incoming message
                if (node.debugMode) {
                    auditLogger.log('mcp-node', 'input', { 
                        nodeId: node.id, 
                        msg: msg,
                        config: {
                            routingMode: node.routingMode,
                            ruleCount: node.rules.length,
                            outputCount: node.outputLabels.length
                        }
                    });
                }
                
                // Process the message through the routing service
                const result = await routingService.route(msg);
                
                // Send the message to the appropriate output(s)
                if (result.outputs && result.outputs.length > 0) {
                    // Create an array with empty slots for each output
                    const outputMessages = new Array(node.outputLabels.length).fill(null);
                    
                    // Place messages in their designated outputs
                    result.outputs.forEach(output => {
                        if (output.index >= 0 && output.index < outputMessages.length) {
                            outputMessages[output.index] = output.msg;
                        }
                    });
                    
                    // Send all outputs
                    send(outputMessages);
                    
                    // Update status with routing decision
                    const routeNames = result.outputs.map(o => node.outputLabels[o.index] || `#${o.index}`).join(", ");
                    node.status({fill:"green", shape:"dot", text:`routed to: ${routeNames}`});
                } else {
                    // No outputs were selected
                    node.status({fill:"yellow", shape:"ring", text:"no route selected"});
                }
                
                // Log the decision if debug mode is enabled
                if (node.debugMode) {
                    msg._debug = msg._debug || {};
                    msg._debug.mcp = result.debug;
                    
                    // Record decision in history
                    const decisionRecord = {
                        timestamp: new Date(),
                        mode: node.routingMode,
                        decision: result.decision,
                        outputs: result.outputs.map(o => ({
                            index: o.index,
                            label: node.outputLabels[o.index] || `Output ${o.index}`
                        })),
                        executionTime: result.executionTime
                    };
                    
                    // Add to history and maintain max size
                    decisionHistory.unshift(decisionRecord);
                    if (decisionHistory.length > MAX_HISTORY_SIZE) {
                        decisionHistory = decisionHistory.slice(0, MAX_HISTORY_SIZE);
                    }
                    
                    auditLogger.log('mcp-node', 'decision', decisionRecord);
                }
                
                done();
            } catch (error) {
                // Handle errors
                node.status({fill:"red", shape:"dot", text:"error"});
                auditLogger.error('mcp-node', 'processing-error', { 
                    nodeId: node.id,
                    error: error.message,
                    stack: error.stack
                });
                done(error);
            }
        });
        
        // Clean up on node close
        node.on('close', function() {
            node.status({});
        });
        
        // Methods for decision history management
        node.getDecisionHistory = function() {
            return decisionHistory;
        };
        
        node.clearDecisionHistory = function() {
            decisionHistory = [];
            return true;
        };
    }
    
    // Register node type
    RED.nodes.registerType("mcp-node", MCPNode);
    
    // Register UI endpoints
    uiHandler.registerUIEndpoints();
    
    // Register HTTP endpoints for the node
    RED.httpAdmin.get("/mcp-node/:cmd/:id", RED.auth.needsPermission("mcp-node.read"), function(req, res) {
        const nodeId = req.params.id;
        const cmd = req.params.cmd;
        
        if (cmd === "getdecisionhistory") {
            // Implementation for retrieving decision history
            // This would typically query the audit service
            res.json({ history: [] }); // Placeholder
        } else {
            res.status(404).send("Command not found");
        }
    });
};
