/**
 * Integration tests for LLM Connector Node
 * These tests verify the integration between LLM Connector and LLM Config nodes
 */

'use strict';

// --- Global mocks ---------------------------------------------------------
// Provide minimal audit logger so node code doesn't throw inside tests
jest.mock('services/audit-service', () => ({
  auditLogger: {
    log: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock helper functions to isolate node logic
jest.mock('nodes/llm-connector/llm-connector-helpers', () => ({
  validateMessage: jest.fn().mockResolvedValue(true),
  normalizeMessage: jest.fn((msg) => Promise.resolve(msg)),
  processMessage: jest.fn().mockResolvedValue({ payload: 'Test response' }),
}));

console.log('Starting test file execution');

// Mock the LLM service module before requiring the test utilities
console.log('Setting up LLM service mock...');

// Store the original console methods
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

console.log('Creating LLM service mock...');
jest.mock('../../nodes/llm-connector/lib/llm-service', () => {
  console.log('Mocking llm-service module');
  const mockProcess = jest.fn().mockImplementation(() => Promise.resolve({
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
  }));
  return {
    LLMService: {
      getLLM: jest.fn().mockImplementation(() => ({ process: mockProcess }))
    }
  };
});

console.log('Requiring test utilities...');
let testUtils;
try {
  testUtils = require('./llm-connector/__mocks__/test-utils');
  console.log('Test utilities loaded successfully');
} catch (error) {
  console.error('Failed to load test utilities:', error);
  throw error;
}

const { createNodeRedMock, createTestNode } = testUtils;
console.log('Test utilities destructured');

// Enable detailed logging
console.log('Loading LLM Connector integration tests...');

// Log the current working directory
console.log('Current working directory:', process.cwd());

// Add a global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

describe.skip('LLM Connector Integration Tests', () => {
  let RED;
  let testNode;
  let configNode;
  
  beforeEach(async () => {
    console.log('\n--- Starting beforeEach ---');
    // Create a new RED mock environment for each test
    RED = createNodeRedMock();
    
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // LLM service is now mocked at the module level
    
    // Create a new LLM Config node for each test
    configNode = createTestNode(RED, require('../../nodes/llm-config/llm-config'), {
      id: 'test-config',
      type: 'llm-config',
      name: 'Test Config',
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-api-key'
    });

    // Create a new LLM Connector node for each test
    testNode = createTestNode(RED, require('../../nodes/llm-connector/llm-connector'), {
      id: 'test-node',
      type: 'llm-connector',
      name: 'Test Connector',
      llmConfig: configNode.id,
      debug: false,
      options: {}
    });

    // Mock the send and error functions
    testNode.send = jest.fn();
    testNode.error = jest.fn();

    // Add the config node to the test flow
    RED.nodes.addNode('test-config', configNode);
    RED.nodes.addNode('test-node', testNode);
    console.log('--- Finished afterEach ---\n');
  });

  test('should process input and send response', async () => {
    console.log('Starting test: should process input and send response');
    
    // Create a test message
    const msg = { 
      _msgid: 'test-msg-1',
      payload: 'Test input',
      topic: 'test-topic'
    };
    
    console.log('Test message created:', JSON.stringify(msg, null, 2));
    
    // Verify the node has an input handler
    if (!testNode._handlers || !testNode._handlers.input) {
      console.error('No input handler registered on test node');
    } else {
      console.log(`Found ${testNode._handlers.input.length} input handlers registered`);
    }
    
    // Simulate input by emitting the 'input' event
    console.log('Emitting input event...');
    testNode.emit('input', msg);
    
    // Wait for async processing
    console.log('Waiting for async processing...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Test completed. Verifying expectations...');
    
    // Verify the send function was called
    expect(testNode.send).toHaveBeenCalled();
    
    // Log the actual calls to send for debugging
    if (testNode.send.mock.calls.length > 0) {
      console.log('send was called with:', testNode.send.mock.calls[0]);
    } else {
      console.log('send was not called');
    }
    console.log('--- Finished afterEach ---\n');
  });

  afterEach(() => {
    console.log('\n--- Starting afterEach ---');
    // Clean up mocks
    jest.clearAllMocks();
    if (RED && RED.nodes) {
      RED.nodes.clear();
    }
    // Reset all mocks
    jest.resetAllMocks();
    console.log('--- Finished afterEach ---\n');
  });
});
