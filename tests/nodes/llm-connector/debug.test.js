/**
 * Debug Test for LLM Connector Normalization
 * Simplified test to debug message normalization issues
 */

const { normalizeMessage } = require('../../../../nodes/llm-connector/llm-connector-helpers');
const roleHelper = require('../../../../nodes/llm-connector/llm-connector-role-based-helper');
const fs = require('fs');
const path = require('path');

// Mock the role helper
jest.mock('../../../../nodes/llm-connector/llm-connector-role-based-helper');

// Mock the audit logger
jest.mock('../../../../nodes/llm-connector/llm-connector-audit-logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Helper function to write debug output to a file
function writeDebugOutput(testName, data) {
  const debugDir = path.join(__dirname, 'debug');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${testName.replace(/\s+/g, '-')}-${timestamp}.log`;
  const filepath = path.join(debugDir, filename);
  
  // Create debug directory if it doesn't exist
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  
  // Write the data to the file
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  return filepath;
}

describe('LLM Connector - Debug Normalization', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock for roleHelper.generatePrompt
    roleHelper.generatePrompt.mockImplementation((role, promptContext) => {
      return Promise.resolve({
        messages: [
          { role: 'system', content: 'Mock system message' },
          { role: 'user', content: promptContext.prompt || 'Test' }
        ],
        responseSchema: null
      });
    });
  });

  test('debug - preserve custom fields in _llm', async () => {
    // Test data
    const testData = {
      msg: {
        payload: 'Test',
        _llm: {
          customField: 'test-value',
          timestamp: '2023-01-01T00:00:00.000Z',
          messages: [
            { role: 'system', content: 'Test system message' }
          ]
        }
      },
      node: {
        id: 'test-node',
        role: 'assistant',
        debug: false
      }
    };

    // Log input
    console.log('Input:', JSON.stringify(testData, null, 2));

    // Call the function
    const result = await normalizeMessage(testData.msg, testData.node);
    
    // Log output
    const output = {
      result: result,
      _llmKeys: result._llm ? Object.keys(result._llm) : [],
      _llmProperties: {}
    };

    if (result._llm) {
      output._llmProperties = {};
      Object.entries(result._llm).forEach(([key, value]) => {
        output._llmProperties[key] = value;
      });
    }

    console.log('Output:', JSON.stringify(output, null, 2));

    // Write debug output
    const debugFile = writeDebugOutput('debug-preserve-custom-fields', {
      input: testData,
      output: output
    });

    console.log(`Debug output written to: ${debugFile}`);

    // Assertions
    expect(result._llm).toBeDefined();
    expect(result._llm.customField).toBe('test-value');
    expect(result._llm.timestamp).toBe('2023-01-01T00:00:00.000Z');
    expect(result._llm.nodeId).toBe('test-node');
    expect(result._llm.messages).toHaveLength(2);
  });
});
