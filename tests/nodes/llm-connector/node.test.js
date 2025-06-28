/**
 * LLM Connector Node Tests
 * Tests for node registration and basic functionality
 */

'use strict';

// Mock dependencies
jest.mock('services/audit-service');

// Import the module to test
const LLMConnector = require('nodes/llm-connector/llm-connector');
const { createNodeRedMock, createMockLLMConfig } = require('./__mocks__/test-utils');

describe('LLM Connector Node', () => {
  let RED;
  
  beforeEach(() => {
    // Create a fresh RED instance for each test
    RED = createNodeRedMock();
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  test('should register the node type with Node-RED', () => {
    // Load the node
    LLMConnector(RED);
    
    // Check if the node type was registered
    expect(RED.nodes.registerType).toHaveBeenCalledWith(
      'llm-connector',
      expect.any(Function)
    );
  });
  
  test('should register HTTP admin endpoints', () => {
    // Load the node
    LLMConnector(RED);
    
    // Check if HTTP endpoints were registered
    expect(RED.httpAdmin.get).toHaveBeenCalledWith(
      '/llm-roles',
      expect.any(Function),
      expect.any(Function)
    );
  });
  
  test('should create node with default configuration', () => {
    // Load the node
    LLMConnector(RED);
    
    // Get the node constructor
    const nodeConstructor = RED.nodes.registerType.mock.calls[0][1];
    
    // Create a new node instance
    const config = {
      id: 'test-node-1',
      name: 'Test LLM Connector',
      type: 'llm-connector',
      llmConfig: 'test-config',
      role: 'assistant',
      debug: false
    };
    
    const node = {
      id: 'test-node-1',
      status: jest.fn(),
      error: jest.fn(),
      send: jest.fn(),
      on: jest.fn()
    };
    
    // Initialize the node
    nodeConstructor.call(node, config);
    
    // Verify node properties
    expect(node.name).toBe('Test LLM Connector');
    expect(node.role).toBe('assistant');
    expect(node.debug).toBe(false);
    expect(node.options).toEqual({});
    expect(typeof node.on).toBe('function');
  });
  
  test('should initialize with provided LLM config', () => {
    // Mock the LLM Config node
    const mockLLMConfig = createMockLLMConfig({ id: 'test-config' });
    RED.nodes.getNode.mockImplementation((id) => {
      if (id === 'test-config') return mockLLMConfig;
      return null;
    });
    
    // Load the node
    LLMConnector(RED);
    const nodeConstructor = RED.nodes.registerType.mock.calls[0][1];
    
    // Create and initialize the node
    const node = {
      id: 'test-node-2',
      status: jest.fn(),
      error: jest.fn(),
      send: jest.fn(),
      on: jest.fn()
    };
    
    const config = {
      id: 'test-node-2',
      llmConfig: 'test-config',
      role: 'assistant',
      debug: true
    };
    
    nodeConstructor.call(node, config);
    
    // Verify the node was initialized with the LLM config
    expect(RED.nodes.getNode).toHaveBeenCalledWith('test-config');
    expect(node.llmConfig).toBe(mockLLMConfig);
    expect(node.debug).toBe(true);
  });
  
  test('should handle missing LLM config', () => {
    // Mock missing LLM config
    RED.nodes.getNode.mockReturnValue(null);
    
    // Load the node
    LLMConnector(RED);
    const nodeConstructor = RED.nodes.registerType.mock.calls[0][1];
    
    // Create and initialize the node
    const node = {
      id: 'test-node-3',
      status: jest.fn(),
      error: jest.fn(),
      send: jest.fn(),
      on: jest.fn()
    };
    
    const config = {
      id: 'test-node-3',
      llmConfig: 'missing-config',
      role: 'assistant'
    };
    
    nodeConstructor.call(node, config);
    
    // Verify error handling - check for the actual error message
    expect(node.error).toHaveBeenCalledWith('LLM Config is required');
    expect(node.status).toHaveBeenCalledWith({
      fill: 'red',
      shape: 'ring',
      text: 'Error: No LLM Config'
    });
  });
});
