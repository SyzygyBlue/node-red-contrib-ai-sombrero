/**
 * MCP Node UI Handler
 * Provides HTTP endpoints for serving UI components and handling UI requests
 */

const path = require('path');
const fs = require('fs');

module.exports = function(RED) {
    // Register HTTP endpoints for UI components
    function registerUIEndpoints() {
        // Serve UI files (templates, scripts, styles)
        RED.httpAdmin.get('/mcp-node/ui/:type/:filename', function(req, res) {
            const type = req.params.type;
            const filename = req.params.filename;
            
            // Validate type and filename to prevent directory traversal
            if (!['templates', 'scripts', 'styles'].includes(type) || 
                filename.includes('..') || 
                !filename.match(/^[a-zA-Z0-9_\-\.]+$/)) {
                return res.status(400).send('Invalid request');
            }
            
            const filePath = path.join(__dirname, 'ui', type, filename);
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).send('File not found');
            }
            
            // Set appropriate content type
            let contentType = 'text/plain';
            if (type === 'scripts' || filename.endsWith('.js')) {
                contentType = 'application/javascript';
            } else if (type === 'styles' || filename.endsWith('.css')) {
                contentType = 'text/css';
            } else if (type === 'templates' || filename.endsWith('.html')) {
                contentType = 'text/html';
            }
            
            res.setHeader('Content-Type', contentType);
            fs.createReadStream(filePath).pipe(res);
        });
        
        // Serve the main editor script
        RED.httpAdmin.get('/mcp-node/ui/editor.js', function(req, res) {
            const filePath = path.join(__dirname, 'ui', 'scripts', 'editor.js');
            res.setHeader('Content-Type', 'application/javascript');
            fs.createReadStream(filePath).pipe(res);
        });
        
        // Get decision history endpoint
        RED.httpAdmin.get('/mcp-node/getdecisionhistory/:nodeId', RED.auth.needsPermission('mcp-node.read'), function(req, res) {
            const nodeId = req.params.nodeId;
            const node = RED.nodes.getNode(nodeId);
            
            if (!node || node.type !== 'mcp-node') {
                return res.status(404).json({ error: 'Node not found' });
            }
            
            // Get decision history from node
            const history = node.getDecisionHistory ? node.getDecisionHistory() : [];
            
            res.json({ history });
        });
        
        // Clear decision history endpoint
        RED.httpAdmin.post('/mcp-node/cleardecisionhistory/:nodeId', RED.auth.needsPermission('mcp-node.write'), function(req, res) {
            const nodeId = req.params.nodeId;
            const node = RED.nodes.getNode(nodeId);
            
            if (!node || node.type !== 'mcp-node') {
                return res.status(404).json({ error: 'Node not found' });
            }
            
            // Clear decision history
            if (node.clearDecisionHistory) {
                node.clearDecisionHistory();
                return res.status(200).json({ success: true });
            }
            
            res.status(500).json({ error: 'Failed to clear history' });
        });
        
        // Prompt enhancer endpoint
        RED.httpAdmin.post('/prompt-enhancer/enhance', RED.auth.needsPermission('mcp-node.write'), async function(req, res) {
            try {
                const { prompt, instructions, context, llmConfigId } = req.body;
                
                if (!prompt || !llmConfigId) {
                    return res.status(400).json({ error: 'Missing required parameters' });
                }
                
                // Get LLM config node
                const llmConfigNode = RED.nodes.getNode(llmConfigId);
                if (!llmConfigNode) {
                    return res.status(404).json({ error: 'LLM config node not found' });
                }
                
                // Load prompt enhancer
                const promptEnhancer = require('../../../shared/prompt-enhancer');
                
                // Create LLM provider function using the LLM config node
                const llmProvider = async ({ prompt, ...options }) => {
                    return new Promise((resolve, reject) => {
                        llmConfigNode.sendPrompt(prompt, options, (err, response) => {
                            if (err) return reject(err);
                            resolve({ text: response.text });
                        });
                    });
                };
                
                // Create enhancer with the LLM provider
                const enhancer = promptEnhancer.createPromptEnhancer(llmProvider);
                
                // Add context if provided
                const enhancerWithContext = context ? 
                    enhancer.withContext(context) : 
                    enhancer;
                
                // Enhance the prompt
                const enhancedPrompt = await enhancerWithContext.enhance(prompt, instructions);
                
                res.json({ enhancedPrompt });
            } catch (error) {
                console.error('Error enhancing prompt:', error);
                res.status(500).json({ error: 'Failed to enhance prompt' });
            }
        });
    }
    
    return {
        registerUIEndpoints
    };
};
