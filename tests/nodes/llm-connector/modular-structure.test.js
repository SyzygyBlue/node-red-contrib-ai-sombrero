/**
 * Modular Structure Tests
 * 
 * These tests verify that the modular structure of the LLM Connector
 * is working as expected.
 */

const path = require('path');

// Mock the prompt builder
jest.mock('../../../nodes/llm-connector/lib/prompt/prompt-builder', () => {
  return jest.fn().mockImplementation(() => {
    return {
      buildPrompt: jest.fn().mockReturnValue('Formatted prompt')
    };
  });
});

// Mock the output processor
jest.mock('../../../nodes/llm-connector/lib/validation/output-processor', () => ({
  processLLMOutput: jest.fn().mockImplementation((response) => response.content)
}));

// Create a simple mock debug object with the required methods
const mockDebug = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  time: jest.fn(),
  timeEnd: jest.fn(),
  logMessage: jest.fn((...args) => {
    console.log('logMessage called with:', ...args);
    return { event: args[0], ...args[1] };
  }),
  child: jest.fn(() => mockDebug)
};

// Mock the debug-utils module
jest.mock('../../../nodes/llm-connector/lib/utils/debug-utils', () => ({
  createDebugLogger: jest.fn(() => mockDebug),
  createDebugContext: jest.fn(() => ({
    debug: mockDebug,
    logMessage: mockDebug.logMessage.bind(mockDebug),
    withTiming: jest.fn((name, fn) => async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        throw error;
      }
    })
  }))
}));

// Mock the LLM client
const mockLLMClient = {
  generate: jest.fn().mockResolvedValue({
    content: 'Test response',
    usage: { total_tokens: 10 }
  })
};

// Mock the createLLMClient function
jest.mock('../../../nodes/llm-connector/lib/integration', () => ({
  createLLMClient: jest.fn((config) => ({
    generate: mockLLMClient.generate
  }))
}));

// Now import the modules after setting up mocks
const { 
  LLMError, 
  ERROR_CODES,
  // Core message processing
  validateMessage,
  normalizeMessage,
  processMessage,
  // Prompt building
  buildPrompt,
  // Role management
  RoleManager,
  defaultRoleManager,
  // Error handling and debugging
  handleLLMError,
  createError,
  createDebugLogger: mockCreateDebugLogger,
  createDebugContext: mockCreateDebugContext
} = require('../../../nodes/llm-connector/lib');

// Import the mock audit logger from the __mocks__ directory
const { auditLogger: mockAuditLogger } = require(path.join(process.cwd(), 'tests', '__mocks__', 'services', 'audit-service'));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Set up default mock behaviors
  mockDebug.logMessage.mockImplementation((event, data, level = 'debug') => {
    const logEntry = { event, ...data, timestamp: new Date().toISOString() };
    if (typeof mockDebug[level] === 'function') {
      mockDebug[level](logEntry);
    } else {
      mockDebug.debug(logEntry);
    }
    return logEntry;
  });
});

describe('Modular Structure', () => {
  let helpers;
  
  beforeAll(() => {
    // Load the main helpers file which uses our modular structure
    jest.resetModules();
    helpers = require(path.join(process.cwd(), 'nodes', 'llm-connector', 'llm-connector-helpers'));
    
    // Mock the debug utilities in the main module
    jest.mock('../../../nodes/llm-connector/lib/utils/debug-utils', () => ({
      ...jest.requireActual('../../../nodes/llm-connector/lib/utils/debug-utils'),
      createDebugLogger: jest.fn(() => mockDebug),
      createDebugContext: jest.fn((options) => ({
        debug: mockDebug,
        logMessage: mockDebug.logMessage.bind(mockDebug),
        withTiming: jest.fn((name, fn) => {
          return async (...args) => {
            mockDebug.time(name);
            try {
              const result = await fn(...args);
              mockDebug.timeEnd(name);
              return result;
            } catch (error) {
              mockDebug.timeEnd(name);
              mockDebug.logMessage(`${name}_failed`, { 
                error: error.message,
                stack: error.stack 
              }, 'error');
              throw error;
            }
          };
        })
      }))
    }));
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    jest.resetModules();
  });
  
  test('should export all expected functions and classes', () => {
    // Core message processing
    expect(typeof helpers.validateMessage).toBe('function');
    expect(typeof helpers.normalizeMessage).toBe('function');
    expect(typeof helpers.processMessage).toBe('function');
    
    // Prompt building
    expect(typeof helpers.buildPrompt).toBe('function');
    
    // Role management
    expect(helpers.RoleManager).toBeDefined();
    expect(helpers.defaultRoleManager).toBeDefined();
    
    // Error handling and debugging
    expect(typeof helpers.handleLLMError).toBe('function');
    expect(typeof helpers.createError).toBe('function');
    expect(typeof helpers.createDebugLogger).toBe('function');
    expect(typeof helpers.createDebugContext).toBe('function');
    
    // Error types
    expect(helpers.LLMError).toBeDefined();
    expect(helpers.ERROR_CODES).toBeDefined();
    
    // Backward compatibility
    expect(helpers.roleHelper).toBeDefined();
    expect(typeof helpers.processTask).toBe('function');
    expect(typeof helpers.validateTask).toBe('function');
  });
  
  test('should handle message normalization', async () => {
    const testMsg = {
      payload: 'Test message',
      topic: 'test',
      _llm: {
        role: 'user',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello' }
        ]
      }
    };
    
    const normalized = await helpers.normalizeMessage(testMsg, { id: 'test-node' });
    
    expect(normalized).toBeDefined();
    expect(normalized._llm).toBeDefined();
    expect(normalized._llm.nodeId).toBe('test-node');
    expect(normalized._llm.messages).toHaveLength(2);
  });
  
  test('should handle message validation', () => {
    // In test environment with empty node, validation is very permissive
    expect(() => validateMessage({}, {})).not.toThrow();
    
    // With a non-empty node, validation becomes more strict
    const node = { 
      id: 'test-node',
      llmConfig: { callLLM: jest.fn() }
    };
    
    // Should pass with valid message
    expect(() => validateMessage({ payload: 'Test' }, node)).not.toThrow();
    
    // Should pass with _llm.messages
    expect(() => validateMessage({ _llm: { messages: [] } }, node)).not.toThrow();
    
    // Should pass with topic
    expect(() => validateMessage({ topic: 'test' }, node)).not.toThrow();
    
    // Should fail if no content and no LLM config on node
    expect(() => validateMessage({}, { id: 'test-node' }))
      .toThrow('Message must contain either payload, _llm.messages, or topic');
      
    // Should fail if no LLM config is provided at all with a non-empty node
    expect(() => validateMessage({ payload: 'Test' }, { id: 'test-node' }))
      .toThrow('LLM configuration not found');
  });
  
  test('should process a simple message', async () => {
    // Setup test data
    const testMsg = {
      payload: 'Hello, world!',
      _llm: {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, world!' }
        ]
      },
      _llmConfig: {
        provider: 'test',
        model: 'test-model',
        callLLM: jest.fn().mockResolvedValue({
          content: 'Test response',
          usage: { total_tokens: 10 }
        })
      }
    };
    
    const node = {
      id: 'test-node',
      debug: true,
      options: {},
      llmConfig: testMsg._llmConfig,
      validateResponses: true
    };
    
    // Mock the LLM client response
    const mockLLMResponse = {
      content: 'Test response',
      usage: { total_tokens: 10 }
    };
    
    mockLLMClient.generate.mockResolvedValueOnce(mockLLMResponse);
    
    // Execute
    const result = await processMessage(testMsg, node);
    
    // Verify results
    expect(result).toBeDefined();
    expect(result.payload).toBe('Test response');
    expect(result._llm).toBeDefined();
    expect(result._llm.response).toBe('Test response');
    expect(mockLLMClient.generate).toHaveBeenCalledWith('Formatted prompt', {
      maxTokens: undefined,
      temperature: undefined,
      stopSequences: undefined,
      debug: true
    });
  });
  
  test('should handle errors during processing', async () => {
    // Setup test data with an error
    const testMsg = {
      payload: 'Hello, world!',
      _llmConfig: {
        provider: 'test',
        model: 'test-model',
        callLLM: jest.fn()
      }
    };
    
    const node = {
      id: 'test-node',
      debug: true,
      options: {},
      llmConfig: testMsg._llmConfig
    };
    
    // Mock the LLM client to throw an error
    const testError = new Error('Test error');
    mockLLMClient.generate.mockRejectedValueOnce(testError);
    
    // Should throw an error
    await expect(processMessage(testMsg, node))
      .rejects
      .toThrow(testError);
      
    // Verify error was logged
    expect(mockDebug.logMessage).toHaveBeenCalledWith(
      'processing_failed', 
      expect.objectContaining({
        error: 'Test error',
        stack: expect.any(String)
      }), 
      'error'
    );
  });
});
