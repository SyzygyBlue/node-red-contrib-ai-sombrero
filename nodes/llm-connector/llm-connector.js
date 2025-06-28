/**
 * LLM Connector Node for Node-RED
 * Provides a standardized interface to interact with various LLM providers
 */

module.exports = function (RED) {
  const { auditLogger } = require('../../services/audit-service');
  const { validateMessage, normalizeMessage, processMessage } = require('./llm-connector-helpers');
  const roleHelper = require('./llm-connector-role-based-helper');

  function LLMConnectorNode(config) {
    RED.nodes.createNode(this, config);

    // Get configuration
    this.name = config.name || 'LLM Connector';
    this.llmConfig = RED.nodes.getNode(config.llmConfig);
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
      try {
        // Validate and normalize the message
        const normalizedMsg = await normalizeMessage(msg, this);

        // Process the message through the LLM
        const result = await processMessage(normalizedMsg, this);

        // Send the result to the output
        send([result, null]);

        // Update status
        this.status({ fill: 'green', shape: 'dot', text: 'Success' });

        // Log the successful operation
        auditLogger.log({
          event: 'llm_request_success',
          nodeId: this.id,
          role: this.role,
          config: this.llmConfig.id,
          debug: this.debug
        });

        done();
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

        // Send error to the second output
        send([null, { ...msg, error: error.message }]);
        done();
      }
    });

    // Handle node close
    this.on('close', function (done) {
      this.status({});
      done();
    });
  }

  // Register the node
  RED.nodes.registerType('llm-connector', LLMConnectorNode);

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
