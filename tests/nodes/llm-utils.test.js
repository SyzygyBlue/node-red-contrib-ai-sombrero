/**
 * Tests for LLM Utility Functions
 */

'use strict';

const {
  validateLLMConfig,
  formatMessages,
  processLLMResponse,
  _validateAgainstSchema: validateAgainstSchema
} = require('../../nodes/llm-connector/lib/llm-utils');

describe('LLM Utils', () => {
  describe('validateLLMConfig', () => {
    test('should validate OpenAI config', () => {
      const config = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key'
      };
      
      const result = validateLLMConfig(config);
      expect(result.valid).toBe(true);
    });
    
    test('should require API key for OpenAI', () => {
      const config = {
        provider: 'openai',
        model: 'gpt-4'
      };
      
      const result = validateLLMConfig(config);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('API key');
    });
    
    test('should validate Azure config', () => {
      const config = {
        provider: 'azure',
        model: 'gpt-4',
        apiKey: 'test-key',
        endpoint: 'https://test.azure.com',
        deploymentName: 'test-deployment'
      };
      
      const result = validateLLMConfig(config);
      expect(result.valid).toBe(true);
    });
    
    test('should require all Azure parameters', () => {
      const config = {
        provider: 'azure',
        model: 'gpt-4'
      };
      
      const result = validateLLMConfig(config);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('required for Azure');
    });
  });
  
  describe('formatMessages', () => {
    test('should format messages with role template', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      const roleTemplate = {
        systemMessage: 'You are a helpful assistant.'
      };
      
      const result = formatMessages(messages, roleTemplate);
      
      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('system');
      expect(result[1].content).toBe('Hello');
      expect(result[2].content).toBe('Hi there!');
    });
    
    test('should handle empty messages', () => {
      const result = formatMessages([], { systemMessage: 'Test' });
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Test');
    });
  });
  
  describe('processLLMResponse', () => {
    test('should process a valid response', () => {
      const response = {
        text: 'Test response',
        model: 'gpt-4',
        usage: { prompt_tokens: 10, completion_tokens: 5 },
        finish_reason: 'stop'
      };
      
      const result = processLLMResponse(response);
      
      expect(result.text).toBe('Test response');
      expect(result.model).toBe('gpt-4');
      expect(result.usage.prompt_tokens).toBe(10);
      expect(result.finishReason).toBe('stop');
    });
    
    test('should parse JSON responses', () => {
      const response = {
        text: '{"name":"Test","count":42}',
        model: 'gpt-4',
        usage: {},
        finish_reason: 'stop'
      };
      
      const result = processLLMResponse(response);
      expect(result.json).toEqual({ name: 'Test', count: 42 });
    });
    
    test('should validate against schema if provided', () => {
      const response = {
        text: '{"name":"Test"}',
        model: 'gpt-4',
        usage: {},
        finish_reason: 'stop'
      };
      
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          count: { type: 'number' }
        },
        required: ['name', 'count']
      };
      
      expect(() => {
        processLLMResponse(response, { validateSchema: true, schema });
      }).toThrow('Response validation failed');
    });
  });
  
  describe('validateAgainstSchema', () => {
    test('should validate required fields', () => {
      const schema = {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        }
      };
      
      // Missing required field
      let result = validateAgainstSchema({ age: 30 }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: name');
      
      // Valid data
      result = validateAgainstSchema({ name: 'Test', age: 30 }, schema);
      expect(result.valid).toBe(true);
    });
    
    test('should validate field types', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          active: { type: 'boolean' }
        }
      };
      
      const result = validateAgainstSchema({
        name: 123,  // Should be string
        age: '30',  // Should be number
        active: 'yes'  // Should be boolean
      }, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'name' must be of type 'string'");
      expect(result.errors).toContain("Field 'age' must be of type 'number'");
      expect(result.errors).toContain("Field 'active' must be of type 'boolean'");
    });
    
    test('should validate enums', () => {
      const schema = {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending']
          }
        }
      };
      
      let result = validateAgainstSchema({ status: 'invalid' }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("must be one of");
      
      result = validateAgainstSchema({ status: 'active' }, schema);
      expect(result.valid).toBe(true);
    });
  });
});
