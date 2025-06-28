/**
 * Mock implementation of the LLM Connector Role Based Helper
 */

const mockRoleHelper = {
  generatePrompt: jest.fn().mockResolvedValue({
    messages: [
      { role: 'system', content: 'Mock system message' },
      { role: 'user', content: 'Test' }
    ],
    responseSchema: null
  })
};

// Reset all mocks before each test
beforeEach(() => {
  mockRoleHelper.generatePrompt.mockClear();
  // Reset to default implementation
  mockRoleHelper.generatePrompt.mockResolvedValue({
    messages: [
      { role: 'system', content: 'Mock system message' },
      { role: 'user', content: 'Test' }
    ],
    responseSchema: null
  });
});

module.exports = mockRoleHelper;
