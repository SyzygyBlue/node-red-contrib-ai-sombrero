/**
 * LLM Connector Validation Tests
 * Tests for message validation logic
 */

'use strict';

// Import the module to test
const { validateMessage } = require('nodes/llm-connector/llm-connector-helpers');

// Mock dependencies
jest.mock('services/audit-service');

describe('LLM Connector - Message Validation', () => {
  test('should validate a valid message with payload', () => {
    const msg = { payload: 'Test message' };
    const result = validateMessage(msg, {});
    expect(result).toBeDefined();
    expect(result.payload).toBe('Test message');
  });
  
  test('should validate a valid message with _llm.messages', () => {
    const msg = { 
      _llm: { 
        messages: [{ role: 'user', content: 'test' }] 
      } 
    };
    const result = validateMessage(msg, {});
    expect(result._llm.messages).toHaveLength(1);
  });
  
  test('should validate a valid message with topic', () => {
    const msg = { topic: 'test-topic' };
    const result = validateMessage(msg, {});
    expect(result.topic).toBe('test-topic');
  });
  
  test('should throw error for null or undefined message', () => {
    expect(() => validateMessage(null, {})).toThrow('Invalid message: expected an object');
    expect(() => validateMessage(undefined, {})).toThrow('Invalid message: expected an object');
  });
  
  test('should throw error for non-object message', () => {
    expect(() => validateMessage('not an object', {})).toThrow('Invalid message: expected an object');
    expect(() => validateMessage(123, {})).toThrow('Invalid message: expected an object');
  });
  
  test('should not throw error for empty message object in test environment', () => {
    // In test environment, empty objects are allowed
    expect(() => validateMessage({}, {})).not.toThrow();
    
    // But if we provide a node, validation should be stricter
    const node = { id: 'test-node' };
    expect(() => validateMessage({}, node)).toThrow('Message must contain either payload, _llm.messages, or topic');
  });
  
  test('should be lenient in test environment', () => {
    // Save original NODE_ENV
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    
    // This would normally fail validation
    const msg = {};
    expect(() => validateMessage(msg, {})).not.toThrow();
    
    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });
  
  test('should validate message with node configuration', () => {
    const msg = { payload: 'test' };
    const node = { 
      id: 'test-node',
      role: 'assistant',
      debug: true,
      llmConfig: {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key'
      }
    };
    
    const result = validateMessage(msg, node);
    expect(result._llm).toBeDefined();
    expect(result._llm.nodeId).toBe('test-node');
  });
  
  test('should preserve existing message properties', () => {
    const msg = { 
      payload: 'test',
      customProp: 'value',
      _msgid: '123'
    };
    
    const result = validateMessage(msg, {});
    expect(result.customProp).toBe('value');
    expect(result._msgid).toBe('123');
  });
});
