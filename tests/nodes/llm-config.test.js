/**
 * Tests for LLM Config Node
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
const { validateConfig, normalizeConfig, testConnection } = require('../../nodes/llm-config/llm-config-helpers');

describe('LLM Config Node Helpers', () => {
  describe('validateConfig', () => {
    test('should validate OpenAI configuration', () => {
      const config = { provider: 'openai' };
      const credentials = { apiKey: 'test-key' };
      
      expect(() => validateConfig(config, credentials)).not.toThrow();
    });

    test('should throw error for missing OpenAI API key', () => {
      const config = { provider: 'openai' };
      const credentials = {};
      
      expect(() => validateConfig(config, credentials)).toThrow('API Key is required for OpenAI');
    });

    test('should validate Azure configuration', () => {
      const config = { 
        provider: 'azure',
        endpoint: 'https://test.openai.azure.com'
      };
      const credentials = { apiKey: 'test-key' };
      
      expect(() => validateConfig(config, credentials)).not.toThrow();
    });

    test('should throw error for missing Azure endpoint', () => {
      const config = { provider: 'azure' };
      const credentials = { apiKey: 'test-key' };
      
      expect(() => validateConfig(config, credentials)).toThrow('API Key and Endpoint are required for Azure OpenAI');
    });
  });

  describe('normalizeConfig', () => {
    test('should normalize configuration with defaults', () => {
      const config = { provider: 'openai' };
      const normalized = normalizeConfig(config);
      
      expect(normalized.name).toBe('LLM Config (openai)');
      expect(normalized.provider).toBe('openai');
    });

    test('should normalize endpoint URLs', () => {
      const config = { 
        provider: 'custom',
        endpoint: 'https://api.example.com/'
      };
      
      const normalized = normalizeConfig(config);
      expect(normalized.endpoint).toBe('https://api.example.com');
    });
  });

  describe('testConnection', () => {
    test('should test OpenAI connection', async () => {
      // Setup
      const testApiKey = 'test-key-123';
      
      // Execute
      const result = await testConnection(
        'openai',
        { provider: 'openai' },
        { apiKey: testApiKey }
      );
      
      // Verify - The actual implementation returns true by default
      expect(result).toBe(true);
    });

    test('should throw error for unsupported provider', async () => {
      // Execute & Verify
      await expect(testConnection(
        'unsupported-provider',
        { provider: 'unsupported-provider' },
        { apiKey: 'test-key' }
      )).rejects.toThrow('Unsupported provider: unsupported-provider');
    });
  });
});

describe('LLM Config Node', () => {
  let RED;
  let LLMConfigNode;
  
  beforeEach(() => {
    // Mock Node-RED
    RED = {
      nodes: {
        createNode: jest.fn(),
        registerType: jest.fn(),
        getNode: jest.fn()
      },
      httpAdmin: {
        get: jest.fn()
      },
      log: {
        error: jest.fn()
      }
    };
    
    // Load the node
    jest.resetModules();
    LLMConfigNode = require('../../nodes/llm-config/llm-config');
    LLMConfigNode(RED);
  });
  
  test('should register the node type', () => {
    expect(RED.nodes.registerType).toHaveBeenCalledWith(
      'llm-config',
      expect.any(Function),
      {
        credentials: expect.any(Object)
      }
    );
  });
  
  test('should set up HTTP admin endpoint for providers', () => {
    expect(RED.httpAdmin.get).toHaveBeenCalledWith(
      '/llm-providers',
      expect.any(Function)
    );
  });
});
