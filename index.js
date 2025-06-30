/**
 * Main entry point for the node-red-contrib-ai-sombrero module
 */

module.exports = function(RED) {
    // Load the individual nodes
    require('./nodes/llm-config/llm-config.js')(RED);
    require('./nodes/llm-connector/llm-connector.js')(RED);
    require('./nodes/mcp-node/mcp-node.js')(RED);
    require('./nodes/dbconfig-node/dbconfig.js')(RED);
};
