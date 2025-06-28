// Mock for @node-red/util
module.exports = {
  ensureString: jest.fn((input) => {
    if (typeof input === 'string') return input;
    if (input === null || input === undefined) return '';
    return JSON.stringify(input);
  }),
  ensureBuffer: jest.fn((input) => {
    if (Buffer.isBuffer(input)) return input;
    if (typeof input === 'string') return Buffer.from(input);
    return Buffer.from(JSON.stringify(input));
  }),
  ensureArray: jest.fn((input) => {
    if (Array.isArray(input)) return input;
    return input !== undefined ? [input] : [];
  }),
  parseContextStore: jest.fn((key) => {
    // Simple mock for context store parsing
    const parts = (key || '').split(':');
    return {
      store: parts[0] || 'default',
      key: parts[1] || ''
    };
  }),
  // Add other utility functions as needed
  generateId: jest.fn(() => 'test-id-' + Math.random().toString(36).substr(2, 8)),
  cloneMessage: jest.fn((msg) => JSON.parse(JSON.stringify(msg))),
  ensureString: jest.fn((input) => {
    if (input === undefined || input === null) return '';
    return String(input);
  }),
  ensureNumber: jest.fn((input, defaultValue = 0) => {
    const num = Number(input);
    return isNaN(num) ? defaultValue : num;
  }),
  // Add other utility functions as needed
};
