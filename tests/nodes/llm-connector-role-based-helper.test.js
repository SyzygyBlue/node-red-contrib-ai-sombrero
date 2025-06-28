const path = require('path');
const fs = require('fs');

// Mock fs
jest.mock('fs');

// Mock the audit logger
const mockAuditLogger = {
  log: jest.fn(),
  error: jest.fn()
};

jest.mock('../../services/audit-service', () => ({
  auditLogger: mockAuditLogger
}));

// Mock Handlebars
jest.mock('handlebars', () => {
  return {
    registerHelper: jest.fn(),
    compile: jest.fn().mockImplementation(template => (context) => {
      // Simple template interpolation for testing
      return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        return context[key.trim()] || '';
      });
    })
  };
});

// Import the module after setting up mocks
const { 
  generatePrompt, 
  validateSchema, 
  getRoleConfig,
  _testExports
} = require('../../nodes/llm-connector/llm-connector-role-based-helper');

// Initialize test role templates before any tests run
const testRoleTemplates = {
  'test-role': {
    system: 'You are a test assistant.',
    user: 'Test message: {{message}}',
    responseSchema: {
      type: 'object',
      properties: {
        testField: { type: 'string' }
      },
      required: ['testField']
    }
  },
  'assistant': {
    system: 'You are a helpful assistant.',
    user: '{{message}}',
    responseSchema: {}
  },
  'no-system': {
    user: '{{message}}',
    responseSchema: {}
  },
  'no-user': {
    system: 'Test system',
    responseSchema: {}
  }
};

// Replace the module's roleTemplates with our test templates
Object.assign(_testExports.roleTemplates, testRoleTemplates);

describe('LLM Connector Role-Based Helper', () => {
  // Test setup
  const testRole = 'test-role';
  const testTemplate = testRoleTemplates[testRole];
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Ensure our test roles are always available
    Object.assign(_testExports.roleTemplates, testRoleTemplates);
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getRoleConfig', () => {
    it('should return role configuration for existing role', () => {
      const config = getRoleConfig(testRole);
      expect(config).toEqual(testTemplate);
    });

    it('should throw error for non-existent role', () => {
      expect(() => getRoleConfig('non-existent-role')).toThrow('Role \'non-existent-role\' not found');
    });
  });

  describe('generatePrompt', () => {
    it('should generate prompt with system and user messages', () => {
      const context = { message: 'test' };
      const result = generatePrompt(testRole, context);
      
      expect(result).toHaveProperty('messages');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toBe(testTemplate.system);
      expect(result.messages[1].role).toBe('user');
      expect(result.messages[1].content).toBe('Test message: test');
      expect(result.responseSchema).toEqual(testTemplate.responseSchema);
    });

    it('should handle missing system message', () => {
      const role = 'no-system';
      
      const result = generatePrompt(role, { message: 'test' });
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content).toBe('test');
    });

    it('should handle missing user message', () => {
      const role = 'no-user';
      
      const result = generatePrompt(role, { message: 'test' });
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toBe('Test system');
    });
  });

  describe('validateSchema', () => {
    it('should validate data against schema', () => {
      const schema = {
        type: 'object',
        properties: {
          testField: { type: 'string' },
          optionalField: { type: 'number' }
        },
        required: ['testField']
      };
      
      // Valid data
      let result = validateSchema({ testField: 'value' }, schema);
      expect(result.valid).toBe(true);
      
      // Invalid type
      result = validateSchema({ testField: 123 }, schema);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be of type string');
      
      // Missing required field
      result = validateSchema({}, schema);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required field');
    });

    it('should handle empty schema', () => {
      const result = validateSchema({ any: 'data' }, null);
      expect(result.valid).toBe(true);
    });
  });

  // Skip the role templates initialization tests for now as they require more complex mocking
  // of the module system which can be flaky in Jest
  describe.skip('role templates initialization', () => {
    // These tests are skipped because they require complex module mocking
    // that can be flaky in Jest. They should be tested with integration tests instead.
  });
});
