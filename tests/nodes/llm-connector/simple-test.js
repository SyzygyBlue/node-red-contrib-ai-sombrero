/**
 * Simple Test File
 * A simplified test file to debug the normalizeMessage function
 */

const { normalizeMessage } = require('../../../nodes/llm-connector/llm-connector-helpers');
const roleHelper = require('../../../nodes/llm-connector/llm-connector-role-based-helper');

// Mock the role helper
jest.mock('../../../nodes/llm-connector/llm-connector-role-based-helper');

// Mock the audit logger
jest.mock('../../../nodes/llm-connector/llm-connector-audit-logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Simple Normalization Test', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock for roleHelper.generatePrompt
    roleHelper.generatePrompt.mockResolvedValue({
      messages: [
        { role: 'system', content: 'Mock system message' },
        { role: 'user', content: 'Test' }
      ],
      responseSchema: null
    });
  });

  test('should normalize message with string payload', async () => {
    const msg = { payload: 'Test' };
    const node = { id: 'test-node', role: 'assistant', debug: false };
    
    const result = await normalizeMessage(msg, node);
    
    console.log('=== Test Result ===');
    console.log('Input:', { msg, node });
    console.log('Output:', JSON.stringify(result, null, 2));
    
    // Basic assertions
    expect(result).toBeDefined();
    expect(result.payload).toBe('Test');
    expect(result.role).toBe('assistant');
    expect(result._llm).toBeDefined();
    expect(result._llm.timestamp).toBeDefined();
  });

  test('should preserve custom fields in _llm', async () => {
    const msg = {
      payload: 'Test',
      _llm: {
        customField: 'test-value',
        timestamp: '2023-01-01T00:00:00.000Z',
        messages: [
          { role: 'system', content: 'Test system message' }
        ]
      }
    };

    const node = {
      id: 'test-node',
      role: 'assistant',
      debug: false
    };

    console.log('=== Test Input ===');
    console.log('Message:', JSON.stringify(msg, null, 2));
    console.log('Node:', JSON.stringify(node, null, 2));

    // Call the function
    const result = await normalizeMessage(msg, node);
    
    console.log('=== Test Output ===');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result._llm) {
      console.log('_llm keys:', Object.keys(result._llm));
      console.log('_llm.customField:', result._llm.customField);
      console.log('_llm.nodeId:', result._llm.nodeId);
      
      console.log('All _llm properties:');
      Object.entries(result._llm).forEach(([key, value]) => {
        console.log(`  ${key}:`, value);
      });
    }

    // Assertions
    expect(result._llm).toBeDefined();
    expect(result._llm.customField).toBe('test-value');
    expect(result._llm.timestamp).toBe('2023-01-01T00:00:00.000Z');
    expect(result._llm.nodeId).toBe('test-node');
    expect(result._llm.messages).toHaveLength(2);
  });
});
