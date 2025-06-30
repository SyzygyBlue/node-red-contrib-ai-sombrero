'use strict';

console.log('Starting MCP Node test...');

// Enable Jest debug mode
process.env.DEBUG = 'jest';

// Increase Jest timeout
jest.setTimeout(30000);

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

// Mock the routing service
jest.mock('../../../nodes/mcp-node/lib/routing-service', () => ({
  createRoutingService: jest.fn().mockImplementation(() => ({
    evaluateRules: jest.fn(),
    performAIRouting: jest.fn(),
    route: jest.fn().mockImplementation((msg) => {
      console.log('Routing service route() called');
      return Promise.resolve({
        outputs: [
          {
            index: 0,
            msg: { ...msg, output: 0 }
          }
        ],
        decision: {
          mode: 'rule',
          rule: 'Test Rule'
        },
        debug: {
          ruleEvaluations: [{ name: 'Test Rule', matched: true }]
        },
        executionTime: 5
      });
    })
  }))
}));

// Get the mocked module
const routingServiceMock = require('../../../nodes/mcp-node/lib/routing-service');

// Mock the audit service
jest.mock('services/audit-service', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock the UI handler
jest.mock('../../../nodes/mcp-node/lib/ui-handler', () => () => ({
  registerUIEndpoints: jest.fn()
}));

// Load test utilities
console.log('Loading test utilities...');
const { createNodeRedMock, createTestNode, createTestMessage } = require('../llm-connector/__mocks__/test-utils');

// Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process in tests
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit process in tests
});

describe('MCP Node', () => {
  let RED;
  let mcpNode;
  let llmConfigNode;
  
  // Import the MCP node module
  let mcpNodeModule;

  beforeEach(() => {
    console.log('\n--- Setting up test ---');
    
    // Reset mocks
    if (routingServiceMock.createRoutingService) {
      routingServiceMock.createRoutingService.mockClear();
    }
    
    // Create Node-RED mock
    RED = createNodeRedMock();
    console.log('Creating Node-RED mock environment...');
    
    // Add HTTP admin mock methods
    RED.httpAdmin = {
      get: jest.fn(),
      post: jest.fn()
    };
    
    // Create a mock LLM config node
    console.log('Creating LLM config node...');
    const LLMConfigNode = function(config) {
      this.id = config.id;
      this.type = 'llm-config';
      this.name = config.name || 'Test Config';
      this.provider = config.provider || 'openai';
      this.model = config.model || 'gpt-4';
      this.apiKey = config.apiKey || 'test-api-key';
      
      // Mock the sendPrompt method
      this.sendPrompt = jest.fn().mockImplementation((prompt, options, callback) => {
        console.log('LLM config sendPrompt() called');
        setTimeout(() => {
          callback(null, {
            text: 'This is a test response from the LLM',
            model: this.model,
            usage: {
              prompt_tokens: 50,
              completion_tokens: 25,
              total_tokens: 75
            }
          });
        }, 10);
      });
    };
    
    llmConfigNode = createTestNode(RED, LLMConfigNode, {
      id: 'test-llm-config',
      type: 'llm-config',
      name: 'Test LLM Config'
    });
    
    // Store the node in the RED mock
    RED.nodes.addNode('test-llm-config', llmConfigNode);
    
    // Import the MCP node module
    mcpNodeModule = require('../../../nodes/mcp-node/mcp-node')(RED);
    
    // The routing service mock is already set up in the jest.mock call
  });

  afterEach(() => {
    console.log('\n--- Cleaning up test ---');
    jest.clearAllMocks();
    if (RED && RED.nodes && typeof RED.nodes.clear === 'function') {
      RED.nodes.clear();
    }
  });

  test('should register node type with Node-RED', () => {
    console.log('Testing node registration...');
    
    // Check if the node was registered
    expect(RED.nodes.registerType).toHaveBeenCalledWith('mcp-node', expect.any(Function));
  });

  test('should initialize with correct configuration', () => {
    console.log('Testing node initialization...');
    
    // Create a node instance
    const config = {
      id: 'test-mcp-node',
      type: 'mcp-node',
      name: 'Test MCP Node',
      routingMode: 'ai',
      rules: [{ name: 'Test Rule', type: 'simple', property: 'payload', operator: 'eq', value: 'test', output: 0 }],
      outputLabels: ['Output 1', 'Output 2'],
      debugMode: true,
      llmConfig: 'test-llm-config'
    };
    
    const MCPNode = RED.nodes.registerType.mock.calls[0][1];
    mcpNode = new MCPNode(config);
    
    // Check if the node was initialized correctly
    expect(mcpNode.name).toBe('Test MCP Node');
    expect(mcpNode.routingMode).toBe('ai');
    expect(mcpNode.rules).toEqual(config.rules);
    expect(mcpNode.outputLabels).toEqual(config.outputLabels);
    expect(mcpNode.debugMode).toBe(true);
    expect(mcpNode.llmConfig).toBe(llmConfigNode);
  });

  test('should handle input messages correctly', (done) => {
    console.log('Testing input message handling...');
    
    // Create a node instance
    const config = {
      id: 'test-mcp-node',
      type: 'mcp-node',
      name: 'Test MCP Node',
      routingMode: 'ai',
      rules: [{ name: 'Test Rule', type: 'simple', property: 'payload', operator: 'eq', value: 'test', output: 0 }],
      outputLabels: ['Output 1', 'Output 2'],
      debugMode: true,
      llmConfig: 'test-llm-config'
    };
    
    const MCPNode = RED.nodes.registerType.mock.calls[0][1];
    mcpNode = new MCPNode(config);
    
    // Create a test message
    const msg = createTestMessage({
      payload: 'test'
    });
    
    // Mock the send function
    const send = jest.fn();
    const doneMock = jest.fn(() => {
      // Check if send was called with the correct outputs
      expect(send).toHaveBeenCalled();
      expect(send.mock.calls[0][0]).toHaveLength(2); // Two outputs
      expect(send.mock.calls[0][0][0]).toEqual(expect.objectContaining({ output: 0 }));
      expect(send.mock.calls[0][0][1]).toBeNull(); // Second output is null
      expect(doneMock).toHaveBeenCalled();
      done(); // Call the Jest done() function to complete the test
    });
    
    // Trigger the input event
    mcpNode.emit('input', msg, send, doneMock);
  });

  test('should handle errors gracefully', (done) => {
    console.log('Testing error handling...');
    
    // Make the routing service throw an error
    routingServiceMock.createRoutingService.mockImplementationOnce(() => ({
      evaluateRules: jest.fn(),
      performAIRouting: jest.fn(),
      route: jest.fn().mockRejectedValue(new Error('Test error'))
    }));
    
    // Create a node instance
    const config = {
      id: 'test-mcp-node',
      type: 'mcp-node',
      name: 'Test MCP Node',
      routingMode: 'ai',
      rules: [{ name: 'Test Rule', type: 'simple', property: 'payload', operator: 'eq', value: 'test', output: 0 }],
      outputLabels: ['Output 1', 'Output 2'],
      debugMode: true,
      llmConfig: 'test-llm-config'
    };
    
    const MCPNode = RED.nodes.registerType.mock.calls[0][1];
    mcpNode = new MCPNode(config);
    
    // Create a test message
    const msg = createTestMessage({
      payload: 'test'
    });
    
    // Mock the send and done functions
    const send = jest.fn();
    const doneMock = jest.fn((error) => {
      // Check if error was handled correctly
      expect(error).toBeDefined();
      expect(error.message).toBe('Test error');
      expect(mcpNode.status).toHaveBeenCalledWith(expect.objectContaining({ fill: 'red' }));
      done(); // Call the Jest done() function to complete the test
    });
    
    // Trigger the input event
    mcpNode.emit('input', msg, send, doneMock);
  });

  test('should manage decision history', () => {
    console.log('Testing decision history management...');
    
    // Create a node instance
    const config = {
      id: 'test-mcp-node',
      type: 'mcp-node',
      name: 'Test MCP Node',
      routingMode: 'ai',
      rules: [{ name: 'Test Rule', type: 'simple', property: 'payload', operator: 'eq', value: 'test', output: 0 }],
      outputLabels: ['Output 1', 'Output 2'],
      debugMode: true,
      llmConfig: 'test-llm-config'
    };
    
    const MCPNode = RED.nodes.registerType.mock.calls[0][1];
    mcpNode = new MCPNode(config);
    
    // Check initial history
    expect(mcpNode.getDecisionHistory()).toEqual([]);
    
    // Clear history (should be a no-op since it's already empty)
    expect(mcpNode.clearDecisionHistory()).toBe(true);
    expect(mcpNode.getDecisionHistory()).toEqual([]);
  });
});
