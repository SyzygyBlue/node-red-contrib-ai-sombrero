/**
 * Integration tests for LLM Connector Node
 * These tests verify the integration between LLM Connector and LLM Config nodes
 */

'use strict';

const { createNode, mockRed } = require('@node-red/nodes/test/helpers/createNode');
const LLMConnectorNode = require('../../nodes/llm-connector/llm-connector');
const LLMConfigNode = require('../../nodes/llm-config/llm-config');

// Mock the audit service
jest.mock('../../services/audit-service', () => ({
  auditLogger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('LLM Connector Integration Tests', () => {
  let RED;
  let testNode;
  let configNode;
  
  beforeAll(() => {
    // Set up the Node-RED environment
    RED = mockRed();
    
    // Register node types
    RED.nodes.registerType('llm-connector', LLMConnectorNode);
    RED.nodes.registerType('llm-config', LLMConfigNode);
    
    // Mock the LLM service
    jest.mock('../../services/llm-service', () => ({
      callLLM: jest.fn().mockResolvedValue({
        text: 'Test response',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        },
        finish_reason: 'stop'
      })
    }));
  });
  
  beforeEach(() => {
    // Create a new LLM Config node for each test
    configNode = createNode(RED, {
      id: 'test-config',
      type: 'llm-config',
      name: 'Test Config',
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-api-key'
    });
    
    // Create a new LLM Connector node for each test
    testNode = createNode(RED, {
      id: 'test-node',
      type: 'llm-connector',
      name: 'Test Connector',
      llmConfig: 'test-config',
      role: 'assistant',
      debug: false
    });
    
    // Mock the send function
    testNode.send = jest.fn();
    testNode.error = jest.fn();
    
    // Add the config node to the test flow
    RED.nodes.addNode('test-config', configNode);
    RED.nodes.addNode('test-node', testNode);
  });
  
  afterEach(() => {
    // Clean up mocks
    jest.clearAllMocks();
    RED.events.removeAllListeners();
    RED.nodes.clear();
  });
  
  test('should process a message through the LLM', async () => {
    // Arrange
    const msg = {
      payload: 'Hello, world!',
      _llm: {
        messages: [
          { role: 'user', content: 'Hello, world!' }
        ]
      }
    };
    
    // Act
    await testNode.on('input', msg);
    
    // Assert
    expect(testNode.send).toHaveBeenCalledTimes(1);
    const response = testNode.send.mock.calls[0][0];
    expect(response.payload).toBe('Test response');
    expect(response._llm.model).toBe('gpt-4');
    expect(response._llm.usage.total_tokens).toBe(15);
  });
  
  test('should handle LLM errors gracefully', async () => {
    // Arrange
    const error = new Error('LLM service error');
    require('../../services/llm-service').callLLM.mockRejectedValueOnce(error);
    
    const msg = {
      payload: 'Fail me',
      _llm: {
        messages: [
          { role: 'user', content: 'Fail me' }
        ]
      }
    };
    
    // Act
    await testNode.on('input', msg);
    
    // Assert
    expect(testNode.error).toHaveBeenCalled();
    expect(testNode.send).toHaveBeenCalledWith([null, expect.objectContaining({
      error: expect.any(Error)
    })]);
  });
  
  test('should validate response against schema if provided', async () => {
    // Arrange
    const msg = {
      payload: 'Return JSON',
      _llm: {
        messages: [
          { role: 'user', content: 'Return JSON' }
        ],
        responseSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          },
          required: ['name']
        }
      }
    };
    
    // Mock a valid JSON response
    require('../../services/llm-service').callLLM.mockResolvedValueOnce({
      text: '{"name":"Test"}',
      model: 'gpt-4',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      finish_reason: 'stop'
    });
    
    // Act & Assert
    await expect(testNode.on('input', msg)).resolves.not.toThrow();
    
    // Mock an invalid JSON response
    require('../../services/llm-service').callLLM.mockResolvedValueOnce({
      text: 'Not JSON',
      model: 'gpt-4',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      finish_reason: 'stop'
    });
    
    // Act & Assert
    await testNode.on('input', msg);
    expect(testNode.error).toHaveBeenCalled();
  });
  
  test('should include debug info when debug mode is enabled', async () => {
    // Arrange
    testNode.debug = true;
    const msg = {
      payload: 'Debug test',
      _llm: {
        messages: [
          { role: 'user', content: 'Debug test' }
        ]
      }
    };
    
    // Act
    await testNode.on('input', msg);
    
    // Assert
    const response = testNode.send.mock.calls[0][0];
    expect(response._debug).toBeDefined();
    expect(response._debug.response.model).toBe('gpt-4');
    expect(response._llm.responseTime).toBeDefined();
  });
});
