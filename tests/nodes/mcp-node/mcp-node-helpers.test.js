'use strict';

console.log('Starting MCP Node Helpers test...');

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

// Mock the prompt enhancer module
jest.mock('../../../shared/prompt-enhancer', () => {
  return {
    createPromptEnhancer: jest.fn().mockImplementation(() => ({
      withContext: jest.fn().mockImplementation(() => ({
        enhance: jest.fn().mockImplementation((original, instructions) => {
          console.log('Prompt enhancer enhance() called');
          return Promise.resolve(`Enhanced: ${original}`);
        })
      })),
      enhance: jest.fn().mockImplementation((original, instructions) => {
        console.log('Prompt enhancer enhance() called without context');
        return Promise.resolve(`Enhanced: ${original}`);
      })
    }))
  };
});

// Get the mocked module
const promptEnhancerMock = require('../../../shared/prompt-enhancer');

// Mock the audit service
jest.mock('services/audit-service', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
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

describe('MCP Node Helpers', () => {
  let RED;
  let helpers;
  let node;
  let llmConfigNode;
  
  beforeEach(() => {
    console.log('\n--- Starting test setup ---');
    
    // Create a new RED mock environment
    console.log('Creating Node-RED mock environment...');
    RED = createNodeRedMock();
    
    // Add util methods to RED mock
    RED.util = {
      cloneMessage: jest.fn().mockImplementation(msg => JSON.parse(JSON.stringify(msg))),
      getMessageProperty: jest.fn().mockImplementation((msg, prop) => {
        console.log(`Getting property ${prop} from message`);
        const parts = prop.split('.');
        let current = msg;
        for (const part of parts) {
          if (current === undefined || current === null) return undefined;
          current = current[part];
        }
        return current;
      }),
      setMessageProperty: jest.fn().mockImplementation((msg, prop, value) => {
        console.log(`Setting property ${prop} in message to ${value}`);
        const parts = prop.split('.');
        let current = msg;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (current[part] === undefined) current[part] = {};
          current = current[part];
        }
        current[parts[parts.length - 1]] = value;
        return true;
      })
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
    
    // Create a mock MCP node
    console.log('Creating MCP node...');
    const MCPNode = function(config) {
      this.id = config.id;
      this.type = 'mcp-node';
      this.name = config.name || 'Test MCP Node';
      this.status = jest.fn();
      this.error = jest.fn();
      this.warn = jest.fn();
      this.log = jest.fn();
    };
    
    node = createTestNode(RED, MCPNode, {
      id: 'test-mcp-node',
      type: 'mcp-node',
      name: 'Test MCP Node'
    });
    
    // Import the helpers module
    helpers = require('../../../nodes/mcp-node/lib/mcp-node-helpers');
  });

  afterEach(() => {
    console.log('\n--- Cleaning up test ---');
    jest.clearAllMocks();
    RED.nodes.clear();
  });

  test('should process message correctly', () => {
    console.log('Testing message processing...');
    
    // Create a test message
    const msg = createTestMessage({
      payload: {
        type: 'test',
        content: 'This is a test message'
      }
    });
    
    // Process the message with empty config and RED
    const config = {}; // No transformations or context enrichment by default
    const processedMsg = helpers.processMessage(msg, config, RED);
    
    // Check the result: should be a deep clone
    expect(processedMsg).toBeDefined();
    expect(processedMsg).toEqual(msg);
    // Ensure RED.util.cloneMessage was called
    expect(RED.util.cloneMessage).toHaveBeenCalledWith(msg);
    expect(processedMsg).toEqual(expect.objectContaining({
      payload: expect.objectContaining({
        type: 'test',
        content: 'This is a test message'
      })
    }));
  });

  test('should evaluate simple rules correctly', () => {
    console.log('Testing rule evaluation...');
    
    // Create test rules
    const rules = [
      {
        name: 'Match Type',
        type: 'simple',
        property: 'payload.type',
        operator: 'eq',
        value: 'test',
        output: 0,
        priority: 1,
        disabled: false
      },
      {
        name: 'Match Content',
        type: 'simple',
        property: 'payload.content',
        operator: 'contains',
        value: 'test',
        output: 1,
        priority: 0,
        disabled: false
      },
      {
        name: 'Disabled Rule',
        type: 'simple',
        property: 'payload.type',
        operator: 'eq',
        value: 'test',
        output: 2,
        priority: 2,
        disabled: true
      }
    ];
    
    // Create a test message
    const msg = createTestMessage({
      payload: {
        type: 'test',
        content: 'This is a test message'
      }
    });
    

    
    // Evaluate the rules with RED and dummy node
    const node = {};
    const result = helpers.evaluateRules(msg, rules, RED, node);
    
    // Check the result: result is array of matched rules
    expect(Array.isArray(result)).toBe(true);
    // Should match two rules
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ index: 0, output: 0, priority: 1 });
    expect(result[1]).toEqual({ index: 1, output: 1, priority: 0 });
  });

  test('should prepare AI prompt correctly', async () => {
    console.log('Testing AI prompt preparation...');
    
    // Create a test message
    const msg = createTestMessage({
      payload: {
        type: 'test',
        content: 'This is a test message'
      }
    });
    
    // Define output labels
    const outputLabels = ['Output 1', 'Output 2'];
    
    // Define prompt template
    const template = 'Test outputs: {{outputs}}; Test message: {{message}}';
    
    // Prepare the AI prompt; note second arg is config object
    const config = { aiPromptTemplate: template };
    const prompt = await helpers.prepareAIPrompt(msg, config, outputLabels);
    
    // Check the result
    expect(prompt).toBeDefined();
    expect(prompt).toContain('Test outputs:');
    expect(prompt).toContain('0: Output 1');
    expect(prompt).toContain('1: Output 2');
    expect(prompt).toContain('Test message:');
    expect(prompt).toContain(JSON.stringify(msg, null, 2));
  });

  test('should enhance prompt using prompt enhancer', async () => {
    console.log('Testing prompt enhancement...');
    
    // Create a test prompt
    const prompt = 'Route this message to the appropriate output';
    
    // Create a mock LLM provider function
    const llmProvider = jest.fn().mockImplementation(({ prompt }) => {
      return Promise.resolve({ text: `Enhanced: ${prompt}` });
    });
    
    // Enhance the prompt
    // Call enhancePrompt with signature (prompt, llmConfigNode, instructions)
    const enhancedPrompt = await helpers.enhancePrompt(prompt, llmConfigNode, 'Optimize this routing prompt');
    
    // Check the result
    expect(enhancedPrompt).toBeDefined();
    expect(enhancedPrompt).toContain('Enhanced:');
    expect(promptEnhancerMock.createPromptEnhancer).toHaveBeenCalled();
  });

  test('should log decision details correctly', () => {
    console.log('Testing decision logging...');
    
    // Create a test decision
    const decision = {
      mode: 'rule',
      rule: 'Test Rule',
      confidence: 0.95
    };
    
    // Create test outputs
    const outputs = [
      {
        index: 0,
        msg: createTestMessage({ payload: 'Output 0' })
      }
    ];
    
    // Log the decision
    helpers.logDecision(node, decision, outputs, 10); // matches signature
    
    // Check if node.log was called
    expect(node.log).toHaveBeenCalled();
    expect(node.log.mock.calls[0][0]).toContain('rule');
    expect(node.log.mock.calls[0][0]).toContain('Test Rule');
  });
});
