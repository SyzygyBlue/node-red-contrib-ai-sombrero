/**
 * LLM Connector Node for Node-RED
 * Provides a standardized interface to interact with various LLM providers
 */

module.exports = function (RED) {
  const { auditLogger } = require('../../services/audit-service');
  const { validateMessage, normalizeMessage, processMessage } = require('./llm-connector-helpers');
  const roleHelper = require('./llm-connector-role-based-helper');
  const roleApi = require('./role-api')(RED);
  const dbConfigUtils = require('../shared/db-config-utils')(RED);
  const { handleJob } = require('./llm-connector-job-helper')(RED);

  function LLMConnectorNode(config) {
    RED.nodes.createNode(this, config);

    // Debug logging for incoming config
    this.log(`LLM Connector node created with config: ${JSON.stringify({
      id: this.id,
      name: config.name,
      llmConfig: config.llmConfig,
      dbConfig: config.dbConfig,
      roleIdentity: config.roleIdentity
    })}`);

    // Get configuration
    this.name = config.name || 'LLM Connector';
    this.llmConfig = RED.nodes.getNode(config.llmConfig);
    this.dbConfig = RED.nodes.getNode(config.dbConfig);
    
    // Debug logging for resolved nodes
    this.log(`LLM Connector node resolved config nodes: ${JSON.stringify({
      llmConfigResolved: this.llmConfig ? this.llmConfig.id : 'null',
      dbConfigResolved: this.dbConfig ? this.dbConfig.id : 'null'
    })}`);
    
    this.roleIdentity = config.roleIdentity || '';
    this.roleIdentityDisplay = config.roleIdentityDisplay || '';
    this.role = config.role || 'assistant';
    this.debug = config.debug === true;
    this.options = config.options || {};

    // Available roles for the UI
    this.availableRoles = Object.keys(roleHelper._testExports?.roleTemplates || {});

    // Validate configuration
    if (!this.llmConfig) {
      this.status({ fill: 'red', shape: 'ring', text: 'Error: No LLM Config' });
      this.error('LLM Config is required');
      return;
    }

    // Initialize status
    this.status({ fill: 'green', shape: 'dot', text: 'Ready' });

    // Handle incoming messages
    this.on('input', async (msg, send, done) => {
      // Fallbacks for Node-RED versions <1.0
      const _send = send || this.send.bind(this);
      const _done = typeof done === 'function' ? done : () => {};

      try {
        // Validate and normalize the message
        const normalizedMsg = await normalizeMessage(msg, this);

        // Process the message through the LLM
        const result = await processMessage(normalizedMsg, this);

        // Persist job/unit data and enrich envelope
        const finalResult = await handleJob(this, msg, result);

        // Send the result to the first output
        _send([finalResult, null]);

        // Update status
        this.status({ fill: 'green', shape: 'dot', text: 'Success' });

        // Log the successful operation
        auditLogger.log({
          event: 'llm_request_success',
          nodeId: this.id,
          role: this.role,
          config: this.llmConfig?.id,
          debug: this.debug
        });

        _done();
      } catch (error) {
        // Handle errors
        this.status({ fill: 'red', shape: 'ring', text: 'Error' });
        this.error(`LLM Connector error: ${error.message}`, msg);

        // Log the error
        auditLogger.error({
          event: 'llm_request_error',
          nodeId: this.id,
          error: error.message,
          stack: error.stack
        });

        // Use this.error for proper Node-RED error handling
        this.error(error, msg);
        _done(error);
      }
    });

    // Handle node close
    this.on('close', function (done) {
      this.status({});
      done();
    });

    // Initialize prompt enhancer UI if available
    if (typeof PromptEnhancerUI === 'function') {
      try {
        // Get the container for the prompt enhancer
        const container = document.getElementById('node-prompt-enhancer-container');
        
        if (container) {
          // Create a function to call the LLM for enhancement
          const callLLM = async (params) => {
            try {
              // Get the LLM config node
              const llmConfig = RED.nodes.node($('#node-config-input-llmConfig').val());
              if (!llmConfig) {
                throw new Error('LLM Config is required');
              }
              
              // Call the LLM through the config node
              const response = await llmConfig.callLLM({
                prompt: params.prompt,
                max_tokens: params.max_tokens,
                temperature: params.temperature || 0.7,
                stop: params.stop || ['"""']
              });
              
              return {
                text: response.choices?.[0]?.text || response.text || '',
                usage: response.usage || {}
              };
            } catch (error) {
              console.error('Error calling LLM for prompt enhancement:', error);
              throw error;
            }
          };
          
          // Initialize the prompt enhancer UI
          const enhancerUI = new PromptEnhancerUI({
            containerId: 'node-prompt-enhancer-container',
            onEnhance: async (original, instructions) => {
              try {
                // Call the LLM to enhance the prompt
                const enhanced = await callLLM({
                  prompt: `Enhance the following prompt based on these instructions:\n\nOriginal: ${original}\n\nInstructions: ${instructions}\n\nEnhanced:`,
                  max_tokens: 500,
                  temperature: 0.7
                });
                
                return enhanced.text || original;
              } catch (error) {
                console.error('Error enhancing prompt:', error);
                return original; // Return original on error
              }
            },
            styles: {
              // Customize styles to match Node-RED theme
              dialog: {
                backgroundColor: '#f3f3f3',
                borderRadius: '4px',
                padding: '15px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              },
              button: {
                backgroundColor: '#4e8cff',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '3px',
                cursor: 'pointer'
              }
            }
          });
          
          // Handle the enhance button click
          $('#node-config-enhance-prompt').on('click', function() {
            const currentPrompt = $('#node-config-input-prompt').val() || '';
            enhancerUI.open(currentPrompt);
          });
          
          // Clean up when the dialog is closed
          $(document).on('dialogclosed', function() {
            // Any cleanup if needed
          });
        }
      } catch (error) {
        console.error('Error initializing prompt enhancer UI:', error);
      }
    } else if (typeof $ !== 'undefined' && $('#node-config-enhance-prompt').length) {
      // Hide the enhance button if the UI component is not available
      // Only if jQuery is available and the element exists
      $('#node-config-enhance-prompt').hide();
    }
  }

  // Register the node
  RED.nodes.registerType('llm-connector', LLMConnectorNode);
  
  // Initialize the role API
  roleApi.initRoleApi();

  // Add dynamic configuration options
  RED.httpAdmin.get('/llm-roles', RED.auth.needsPermission('llm-connector.read'), (req, res) => {
    // TODO: Load roles from configuration or database
    const roles = [
      { id: 'assistant', name: 'Assistant' },
      { id: 'summarizer', name: 'Text Summarizer' },
      { id: 'classifier', name: 'Text Classifier' },
      { id: 'translator', name: 'Translator' },
      { id: 'custom', name: 'Custom Role' }
    ];
    res.json(roles);
  });
};
