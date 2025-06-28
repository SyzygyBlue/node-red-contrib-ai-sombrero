/**
 * LLM Config Node for Node-RED
 * Manages LLM provider configurations and credentials
 */

module.exports = function (RED) {
  'use strict';

  const helpers = require('./llm-config-helpers');
  const { auditLogger } = require('../../services/audit-service');

  function LLMConfigNode(config) {
    RED.nodes.createNode(this, config);
    
    // Get credentials
    this.credentials = this.credentials || {};
    
    // Store configuration
    this.name = config.name || 'LLM Config';
    this.provider = config.provider || '';
    this.config = normalizeConfig(config);

    // Validate configuration
    try {
      validateConfig(this.config, this.credentials);
      this.status({ fill: 'green', shape: 'dot', text: 'Ready' });
    } catch (error) {
      this.status({ fill: 'red', shape: 'ring', text: 'Error' });
      this.error(`Invalid configuration: ${error.message}`);
    }

    // Log configuration changes
    auditLogger.log({
      event: 'llm_config_created',
      nodeId: this.id,
      provider: this.provider,
      config: { ...this.config, apiKey: '***' } // Redact sensitive data
    });

    // Handle node close
    this.on('close', function (done) {
      auditLogger.log({
        event: 'llm_config_removed',
        nodeId: this.id
      });
      done();
    });
  }

  // Add callLLM method to the node prototype
  LLMConfigNode.prototype.callLLM = async function(params) {
    try {
      const { prompt, max_tokens, temperature, stop } = params;
      
      // Validate required parameters
      if (!prompt) {
        throw new Error('Prompt is required');
      }
      
      // Call the LLM
      const response = await helpers.callLLM(
        this.provider,
        this.config,
        this.credentials,
        {
          prompt,
          max_tokens: max_tokens || 1000,
          temperature: temperature || 0.7,
          stop: stop || null
        }
      );
      
      // Log the successful call
      auditLogger.log({
        event: 'llm_call_success',
        nodeId: this.id,
        provider: this.provider,
        model: response.model,
        usage: response.usage || {}
      });
      
      return response;
      
    } catch (error) {
      // Log the error
      auditLogger.error({
        event: 'llm_call_failed',
        nodeId: this.id,
        provider: this.provider,
        error: error.message,
        params: { ...params, prompt: params.prompt?.substring(0, 100) + '...' }
      });
      
      // Update node status
      this.status({ fill: 'red', shape: 'ring', text: 'Call failed' });
      
      // Re-throw the error for the caller to handle
      throw error;
    }
  };

  // Register the node
  RED.nodes.registerType('llm-config', LLMConfigNode, {
    credentials: {
      apiKey: { type: 'password' },
      apiSecret: { type: 'password' },
      // Additional credentials will be added dynamically based on provider
    }
  });

  // Add dynamic provider configuration endpoints
  RED.httpAdmin.get('/llm-providers', (req, res) => {
    try {
      const providers = require('../../config/providers.json');
      res.json(providers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load provider configurations' });
    }
  });
};
