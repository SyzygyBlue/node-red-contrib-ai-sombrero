'use strict';

console.log('Starting LLM Connector test...');

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

// Override console methods to include timestamps
console.log = (...args) => {
  originalConsole.log(`[${new Date().toISOString()}] LOG:`, ...args);
};

console.error = (...args) => {
  originalConsole.error(`[${new Date().toISOString()}] ERROR:`, ...args);
};

console.warn = (...args) => {
  originalConsole.warn(`[${new Date().toISOString()}] WARN:`, ...args);
};

// Mock the LLM service
console.log('Setting up LLM service mock...');
jest.mock('../../nodes/llm-connector/lib/llm-service', () => ({
  LLMService: {
    getLLM: jest.fn().mockImplementation(() => {
      console.log('LLMService.getLLM() called');
      return {
        process: jest.fn().mockImplementation(() => {
          console.log('LLM process() called');
          return Promise.resolve({
            response: {
              content: 'Test response',
              model: 'gpt-4',
              finish_reason: 'stop',
              created: Date.now(),
              usage: {
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150
              }
            }
          });
        })
      };
    })
  }
}));

// Load test utilities
console.log('Loading test utilities...');
const { createNodeRedMock, createTestNode } = require('./__mocks__/test-utils');

// Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

describe('LLM Connector Node', () => {
  let RED;
  let testNode;
  let configNode;

  beforeEach(() => {
    console.log('\n--- Starting test setup ---');
    
    // Create a new RED mock environment
    console.log('Creating Node-RED mock environment...');
    RED = createNodeRedMock();
    
    // Create a config node
    console.log('Creating config node...');
    const LLMConfigNode = function(config) {
      this.id = config.id;
      this.type = 'llm-config';
      this.name = config.name || 'Test Config';
      this.provider = config.provider || 'openai';
      this.model = config.model || 'gpt-4';
      this.apiKey = config.apiKey || 'test-api-key';
    };
    
    configNode = createTestNode(RED, LLMConfigNode, {
      id: 'test-config',
      type: 'llm-config',
      name: 'Test Config',
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-api-key'
    });
    
    // Create the LLM Connector node
    console.log('Creating LLM Connector node...');
    const LLMConnectorNodeModule = require('../../nodes/llm-connector/llm-connector');
    const LLMConnectorNode = LLMConnectorNodeModule(RED);
    testNode = createTestNode(RED, LLMConnectorNode, {
      id: 'test-node',
      type: 'llm-connector',
      name: 'Test Connector',
      llmConfig: 'test-config',
      debug: true,
      options: {}
    });
    
    // Add nodes to RED
    RED.nodes.addNode('test-config', configNode);
    RED.nodes.addNode('test-node', testNode);
    
    // Mock the send and error functions
    testNode.send = jest.fn();
    testNode.error = jest.fn();
    
    console.log('--- Test setup complete ---\n');
  });
  
  afterEach(() => {
    console.log('\n--- Cleaning up test ---');
    jest.clearAllMocks();
    if (RED && RED.nodes) {
      RED.nodes.clear();
    }
    console.log('--- Cleanup complete ---\n');
  });
  
  test('should process input and send response', async () => {
    console.log('\n--- Starting test: should process input and send response ---');
    
    // Create a test message
    const testMsg = {
      _msgid: 'test-msg-1',
      payload: 'Test input',
      topic: 'test-topic'
    };
    
    console.log('Sending message to node...');
    
    // Simulate input
    testNode.emit('input', testMsg);
    
    // Wait for async processing
    console.log('Waiting for async processing...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the send function was called
    console.log('Verifying expectations...');
    expect(testNode.send).toHaveBeenCalled();
    
    if (testNode.send.mock.calls.length > 0) {
      console.log('send was called with:', testNode.send.mock.calls[0]);
    } else {
      console.log('send was not called');
    }
    
    console.log('--- Test completed ---\n');
  });
});

console.log('Test file loaded');
