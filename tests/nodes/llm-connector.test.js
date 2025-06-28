/**
 * Tests for LLM Connector Node
 */

'use strict';

// Set up mocks
jest.mock('../../services/audit-service', () => ({
  auditLogger: {
    log: jest.fn(),
    error: jest.fn()
  }
}));

// Import the module to test
const { validateMessage, normalizeMessage, processMessage } = require('../../nodes/llm-connector/llm-connector-helpers');

// Mock the LLM Config node
class MockLLMConfigNode {
  constructor() {
    this.id = 'test-config-123';
    this.type = 'openai';
  }
  
  sendRequest() {
    return Promise.resolve({
      content: 'Test response',
      model: 'gpt-4',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    });
  }
}

describe('LLM Connector Helpers', () => {
  describe('validateMessage', () => {
    test('should validate a valid message', () => {
      const msg = { payload: 'Test message' };
      expect(() => validateMessage(msg, {})).not.toThrow();
    });

    test('should throw error for invalid message', () => {
      expect(() => validateMessage(null, {})).toThrow('Invalid message');
      expect(() => validateMessage({}, {})).toThrow('Message must contain');
    });
  });

  describe('normalizeMessage', () => {
    test('should normalize message with string payload', async () => {
      const msg = { payload: 'Test' };
      const node = { id: 'test-node', role: 'assistant', debug: false };
      const result = await normalizeMessage(msg, node);
      expect(result.payload).toBe('Test');
      expect(result.role).toBe('assistant');
    });

    test('should stringify object payload', async () => {
      const msg = { payload: { test: 'value' } };
      const node = { id: 'test-node', role: 'assistant', debug: false };
      const result = await normalizeMessage(msg, node);
      expect(typeof result.payload).toBe('string');
      expect(JSON.parse(result.payload)).toEqual({ test: 'value' });
    });

    test('should add debug info when debug is enabled', async () => {
      const msg = { payload: 'Test' };
      const node = { id: 'test-node', role: 'assistant', debug: true };
      const result = await normalizeMessage(msg, node);
      expect(result._debug).toBeDefined();
      expect(result._debug.nodeId).toBe('test-node');
    });
  });

  describe('processMessage', () => {
    let mockNode;
    
    beforeEach(() => {
      mockNode = {
        id: 'test-node',
        llmConfig: new MockLLMConfigNode(),
        debug: false
      };
      
      // Clear all mocks
      jest.clearAllMocks();
    });

    test('should process a message through the LLM', async () => {
      const msg = { 
        payload: 'Test message',
        role: 'user' 
      };
      
      const result = await processMessage(msg, mockNode);
      
      expect(result.payload).toBe('Test response');
      expect(result._llmMetadata).toBeDefined();
      expect(result._llmMetadata.provider).toBe('openai');
      expect(result._llmMetadata.model).toBe('gpt-4');
    });

    test('should include debug info when debug is enabled', async () => {
      mockNode.debug = true;
      const msg = { 
        payload: 'Test message',
        role: 'user' 
      };
      
      const result = await processMessage(msg, mockNode);
      
      expect(result._debug).toBeDefined();
      expect(result._debug.processingTime).toBeDefined();
      expect(result._debug.tokens).toBe(15);
    });

    test('should handle LLM errors', async () => {
      // Mock a failing LLM request
      mockNode.llmConfig.sendRequest = jest.fn().mockRejectedValue(new Error('LLM error'));
      
      const msg = { 
        payload: 'Test message',
        role: 'user' 
      };
      
      await expect(processMessage(msg, mockNode))
        .rejects
        .toThrow('LLM processing failed: LLM error');
    });
  });
});

describe('LLM Connector Node', () => {
  let RED;
  let LLMConnectorNode;
  
  beforeEach(() => {
    // Mock Node-RED
    RED = {
      nodes: {
        createNode: jest.fn(),
        registerType: function(name, constructor) {
          this.constructor = constructor;
        },
        getNode: jest.fn().mockImplementation(() => ({
          id: 'test-config',
          type: 'llm-config',
          sendRequest: jest.fn().mockResolvedValue({
            content: 'Test response',
            model: 'gpt-4',
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
          })
        })),
        status: jest.fn()
      },
      httpAdmin: {
        get: jest.fn()
      },
      auth: {
        needsPermission: (perm) => (fn) => fn
      }
    };
    
    // Mock console.error
    console.error = jest.fn();
    
    // Import the node
    require('../../../nodes/llm-connector/llm-connector')(RED);
    LLMConnectorNode = RED.nodes.constructor;
  });
  
  test('should register the node type', () => {
    expect(RED.nodes.registerType).toHaveBeenCalledWith('llm-connector', expect.any(Function));
  });
  
  test('should set up HTTP admin endpoints', () => {
    expect(RED.httpAdmin.get).toHaveBeenCalledWith('/llm-roles', expect.any(Function), expect.any(Function));
  });
  
  describe('Node Initialization', () => {
    let node;
    
    beforeEach(() => {
      // Create a new node instance
      node = {
        id: 'test-node',
        name: 'Test LLM Connector',
        status: jest.fn(),
        error: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'input') {
            node.inputCallback = callback;
          } else if (event === 'close') {
            node.closeCallback = callback;
          }
        }),
        send: jest.fn(),
        llmConfig: 'test-config',
        role: 'assistant',
        debug: false
      };
      
      // Initialize the node
      new LLMConnectorNode(node);
    });
    
    test('should initialize with valid config', () => {
      expect(node.status).toHaveBeenCalledWith({ fill: 'green', shape: 'dot', text: 'Ready' });
      expect(node.error).not.toHaveBeenCalled();
    });
    
    test('should handle input messages', async () => {
      // Mock the process
      const mockProcess = jest.spyOn(require('../../../nodes/llm-connector/llm-connector-helpers'), 'processMessage')
        .mockResolvedValue({ payload: 'Processed' });
      
      // Simulate input message
      const msg = { payload: 'Test' };
      const send = jest.fn();
      const done = jest.fn();
      
      await node.inputCallback(msg, send, done);
      
      // Verify the message was processed
      expect(mockProcess).toHaveBeenCalled();
      expect(send).toHaveBeenCalledWith([{ payload: 'Processed' }, null]);
      expect(done).toHaveBeenCalled();
    });
  });
});
