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

  return {
    nodes,
    util,
    log: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    },
    settings: {
      get: jest.fn()
    },
    hooks: {
      add: jest.fn()
    },
    events: {
      on: jest.fn(),
      emit: jest.fn()
    },
    comms: {
      publish: jest.fn()
    },
    // Add other Node-RED globals as needed
  };
}

// Create a mock LLM Config node
function createMockLLMConfig(config = {}) {
  return {
    id: config.id || 'llm-config-1',
    type: 'llm-config',
    name: config.name || 'Test LLM Config',
    provider: config.provider || 'openai',
    model: config.model || 'gpt-3.5-turbo',
    apiKey: config.apiKey || 'test-api-key',
    temperature: config.temperature || 0.7,
    maxTokens: config.maxTokens || 1000,
    callLLM: jest.fn().mockResolvedValue({
      content: 'Mock LLM response',
      usage: { total_tokens: 42 },
      model: config.model || 'gpt-3.5-turbo'
    })
  };
}

// Create a test message
function createTestMessage(overrides = {}) {
  return {
    _msgid: 'test-msg-' + Math.random().toString(36).substr(2, 8),
    payload: 'Test message',
    topic: 'test',
    ...overrides
  };
}

// Create a test node instance
function createTestNode(config = {}) {
  const node = {
    id: 'test-node-' + Math.random().toString(36).substr(2, 8),
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
