/**
 * Mock LLM Connector Node for testing
 */

module.exports = function(RED) {
  // Mock the LLM Connector node
  function LLMConnectorNode(config) {
    RED.nodes.createNode(this, config);
    
    // Mock node properties
    this.id = config.id || 'test-node';
    this.name = config.name || 'Test LLM Connector';
    this.llmConfig = config.llmConfig || null;
    this.role = config.role || 'assistant';
    this.debug = config.debug || false;
    this.options = config.options || {};
    
    // Mock methods
    this.status = jest.fn();
    this.error = jest.fn();
    this.send = jest.fn();
    this.on = jest.fn((event, callback) => {
      if (event === 'input') {
        this.inputHandler = callback;
      }
    });
    
    // Mock the input handler for testing
    this.triggerInput = async (msg) => {
      if (this.inputHandler) {
        const send = (outputs) => {
          this.lastOutput = outputs;
          return outputs;
        };
        
        const done = (error) => {
          if (error) {
            this.error(error.message || error, msg);
          }
        };
        
        try {
          await this.inputHandler(msg, send, done);
        } catch (error) {
          done(error);
        }
      }
    };
  }
  
  // Register the node type
  RED.nodes.registerType('llm-connector', LLMConnectorNode);
  
  // Add HTTP admin endpoints for roles
  if (RED.httpAdmin) {
    RED.httpAdmin.get('/llm-connector/roles', (req, res) => {
      res.json([
        { id: 'assistant', name: 'Assistant', description: 'Helpful assistant' },
        { id: 'summarizer', name: 'Summarizer', description: 'Text summarization' },
        { id: 'translator', name: 'Translator', description: 'Language translation' }
      ]);
    });
    
    RED.httpAdmin.get('/llm-connector/role/:id', (req, res) => {
      const roles = {
        assistant: {
          id: 'assistant',
          name: 'Assistant',
          description: 'Helpful assistant',
          systemMessage: 'You are a helpful assistant.'
        },
        summarizer: {
          id: 'summarizer',
          name: 'Summarizer',
          description: 'Text summarization',
          systemMessage: 'You are a text summarization assistant.'
        },
        translator: {
          id: 'translator',
          name: 'Translator',
          description: 'Language translation',
          systemMessage: 'You are a language translator.'
        }
      };
      
      const role = roles[req.params.id];
      if (role) {
        res.json(role);
      } else {
        res.status(404).json({ error: 'Role not found' });
      }
    });
  }
  
  // Mock the node registration
  return LLMConnectorNode;
};
