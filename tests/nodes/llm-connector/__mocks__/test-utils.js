/**
 * Test utilities for LLM Connector tests
 */

// Mock Node-RED environment
function createNodeRedMock() {
  console.log('[test-utils] Creating Node-RED mock environment');
  const RED = {
    nodes: {
      _nodes: new Map(), // Internal map to store nodes
      getNode: jest.fn(id => RED.nodes._nodes.get(id)),
      addNode: jest.fn((id, node) => RED.nodes._nodes.set(id, node)),
      createNode: jest.fn(function (nodeInstance, config) {
        process.stderr.write(`[DEBUG] RED.nodes.createNode called for node ${config.id || config.type || 'unknown'}\n`);
        
        // Ensure basic properties are set if not already by createTestNode
        nodeInstance.id = nodeInstance.id || config.id || `test-node-${Math.random().toString(36).substr(2, 8)}`;
        nodeInstance.name = nodeInstance.name || config.name;
        nodeInstance.type = nodeInstance.type || config.type;
        
        // Set up Node-RED standard functions
        nodeInstance.error = nodeInstance.error || jest.fn();
        nodeInstance.status = nodeInstance.status || jest.fn();
        nodeInstance.warn = nodeInstance.warn || jest.fn();
        nodeInstance.log = nodeInstance.log || jest.fn();
        
        // CRITICAL: Set up the real event handler infrastructure
        // This is what's missing and causing our tests to fail
        if (!nodeInstance._events) nodeInstance._events = {};
        
        // Only override the on() method if it's not already properly defined
        // or if it's just a Jest mock without implementation
        if (!nodeInstance.on || nodeInstance.on.isMockFunction) {
          process.stderr.write(`[DEBUG] Setting up real event handler for node ${nodeInstance.id}\n`);
          
          // Create real event handling capability
          nodeInstance.on = function(event, handler) {
            process.stderr.write(`[DEBUG] Node ${nodeInstance.id} registering real handler for ${event}\n`);
            if (!this._events[event]) this._events[event] = [];
            this._events[event].push(handler);
            return this; // For chaining
          };
          
          // Create an emit method to trigger events
          nodeInstance.emit = function(event, ...args) {
            process.stderr.write(`[DEBUG] Node ${nodeInstance.id} emitting event ${event}\n`);
            const handlers = this._events[event] || [];
            handlers.forEach(handler => handler.apply(this, args));
            return handlers.length > 0;
          };
        }
        
        return nodeInstance;
      }),
      clear: jest.fn(() => RED.nodes._nodes.clear())
    },
    registeredTypes: {}, // This is where registered types will be stored
    util: {
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
    },
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
      emit: jest.fn(),
      removeAllListeners: jest.fn(), // Added mock for removeAllListeners
    },
    comms: {
      publish: jest.fn()
    },
    httpAdmin: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    },
    httpNode: {}, // Will be assigned later
    auth: {
      needsPermission: jest.fn().mockImplementation(() => (req, res, next) => next())
    }
  };

  // Assign httpNode after httpAdmin is defined
  RED.httpNode = { ...RED.httpAdmin };

  // Mock registerType to populate registeredTypes on RED.nodes
  // This needs to be done after RED.nodes is fully defined.
  RED.nodes.registerType = jest.fn().mockImplementation((type, constructor) => {
    RED.registeredTypes[type] = constructor;
  });

  return RED;
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
function createTestNode(RED, NodeConstructor, config) {
  console.log(`[test-utils] Creating test node with config:`, JSON.stringify(config, null, 2));
  
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    originalConsoleLog(`[${config.id || 'test-node'}]`, ...args);
  };
  
  try {
  const node = {
    id: config.id,
    type: config.type,
    ...config,
    _handlers: {},
    on: function(event, handler) {
      if (!this._handlers[event]) {
        this._handlers[event] = [];
      }
      this._handlers[event].push(handler);
      if (event === 'input') {
        this.inputHandler = handler;
      }
    },
    emit: function(event, ...args) {
      if (this._handlers[event]) {
        this._handlers[event].forEach(handler => handler(...args));
      }
    }
  };
    console.log(`[test-utils] Creating node with ID: ${node.id}`);
    
    // Add debug logging for event registration
    const originalOn = node.on.bind(node);
    node.on = function(event, handler) {
      console.log(`[${node.id}] Registering handler for event: ${event}`);
      return originalOn(event, (...args) => {
        console.log(`[${node.id}] Event '${event}' triggered with args:`, ...args);
        return handler(...args);
      });
    };
    
    // Add debug logging for emit
    const originalEmit = node.emit?.bind(node) || function() {};
    node.emit = function(event, ...args) {
      console.log(`[${node.id}] Emitting event: ${event}`, ...args);
      return originalEmit(event, ...args);
    };
    
    // Call the original createNode
    console.log(`[test-utils] Calling RED.nodes.createNode for ${node.id}`);
    RED.nodes.createNode(node, config);
    
    // Find the NodeConstructor from the mocked RED.nodes.registerType calls
    const registerTypeCall = RED.nodes.registerType.mock.calls.find(call => call[0] === node.type);
    if (!registerTypeCall) {
      throw new Error(`Node type ${node.type} not registered with RED.nodes.registerType`);
    }
    const NodeConstructor = registerTypeCall[1];

    // Call the NodeConstructor
    console.log(`[test-utils] Calling NodeConstructor for ${node.id}`);
    NodeConstructor.call(node, config);
    
    // Log the final node state
    console.log(`[test-utils] Node ${node.id} created successfully`);
    console.log(`[test-utils] Node ${node.id} has handlers:`, Object.keys(node._handlers || {}));
    
    return node;
  } catch (error) {
    console.error(`[test-utils] Error creating test node ${config.id || 'unknown'}:`, error);
    throw error;
  } finally {
    // Restore original console.log
    console.log = originalConsoleLog;
  }
}

module.exports = {
  createNodeRedMock,
  createMockLLMConfig,
  createTestMessage,
  createTestNode
};
