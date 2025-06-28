/**
 * Mock implementation of the LLM Connector Audit Logger
 */

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn()
};

// Reset all mocks before each test
beforeEach(() => {
  Object.values(mockLogger).forEach(mock => mock.mockClear());
});

module.exports = mockLogger;
