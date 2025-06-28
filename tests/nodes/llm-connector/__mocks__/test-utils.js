/**
 * Test utilities for LLM Connector tests
 */

// Mock Node-RED environment
function createNodeRedMock() {
  const nodes = {
    createNode: jest.fn(),
    registerType: jest.fn(),
    getNode: jest.fn()
  };

  const util = {
    ensureString: jest.fn((input) => {
      if (typeof input === 'string') return input;
      if (input === null || input === undefined) return '';
      return JSON.stringify(input);
    }),
    ensureArray: jest.fn((input) => {
      if (Array.isArray(input)) return input;
      return input !== undefined ? [input] : [];
    }),
    cloneMessage: jest.fn((msg) => JSON.parse(JSON.stringify(msg)))
  };

  const httpAdmin = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  };

  const auth = {
    needsPermission: jest.fn().mockImplementation(() => (req, res, next) => next())
  };

  return {
    nodes,
    util,
    log: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      trace: jest.fn(),
      _: {
        log: jest.fn()
      }
    },
    settings: {
      get: jest.fn(),
      set: jest.fn()
    },
    hooks: {
      add: jest.fn()
    },
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    },
    comms: {
      publish: jest.fn()
    },
    httpAdmin,
    httpNode: { ...httpAdmin }, // Clone for httpNode
    auth,
    // Add other Node-RED globals as needed
  };
}

// Create a mock LLM Config node
function createMockLLMConfig(config = {}) {
    // Create a mock response that matches the expected format
  const mockResponse = {
    id: `chatcmpl-${Math.random().toString(36).substr(2, 14)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: config.model || 'gpt-3.5-turbo',
    choices: [{
      message: {
        role: 'assistant',
        content: config.responseText || 'Mock LLM response',
        function_call: null,
        tool_calls: null
      },
      finish_reason: 'stop',
      index: 0
    }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 15,
      total_tokens: 25
    },
    text: config.responseText || 'Mock LLM response',
    role: 'assistant'
  };

  return {
    id: config.id || `config-${Math.random().toString(36).substr(2, 8)}`,
    name: config.name || 'Test LLM Config',
    type: 'llm-config',
    provider: config.provider || 'openai',
    model: config.model || 'gpt-3.5-turbo',
    apiKey: config.apiKey || 'test-api-key',
    temperature: config.temperature || 0.7,
    maxTokens: config.maxTokens || 1000,
    debug: config.debug || false,
    callLLM: jest.fn().mockImplementation((params) => {
      if (config.shouldError) {
        return Promise.reject(new Error('LLM API error'));
      }
      // Return a response that includes the prompt and other params
      return Promise.resolve({
        ...mockResponse,
        prompt: params.prompt,
        model: config.model || 'gpt-3.5-turbo',
        temperature: params.temperature,
        max_tokens: params.max_tokens
      });
    }),
    // Also include the mock response directly for testing
    _mockResponse: mockResponse
  };
}

// Create a test message
function createTestMessage(overrides = {}) {
  return {
    _msgid: `test-msg-${Math.random().toString(36).substr(2, 8)}`,
    payload: 'Test message',
    topic: 'test',
    ...overrides
  };
}

// Create a test node instance
function createTestNode(config = {}) {
  const node = {
    id: `test-node-${Math.random().toString(36).substr(2, 8)}`,
    name: 'Test LLM Connector',
    type: 'llm-connector',
    llmConfig: createMockLLMConfig(),
    role: 'assistant',
    debug: false,
    options: {},
    status: jest.fn(),
    error: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    ...config
  };

  // Set up input handler
  const inputHandlers = [];
  node.on.mockImplementation((event, handler) => {
    if (event === 'input') {
      inputHandlers.push(handler);
    }
  });

  // Helper to trigger input
  node.triggerInput = async (msg) => {
    const send = (outputs) => {
      node.lastOutput = outputs;
      return outputs;
    };

    const done = (error) => {
      if (error) {
        node.error(error.message || error, msg);
      }
    };

    for (const handler of inputHandlers) {
      await handler(msg, send, done);
    }
  };

  return node;
}

module.exports = {
  createNodeRedMock,
  createMockLLMConfig,
  createTestMessage,
  createTestNode
};
