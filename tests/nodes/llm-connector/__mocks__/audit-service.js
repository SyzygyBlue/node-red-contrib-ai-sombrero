const auditLogger = {
  log: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
};

module.exports = { auditLogger };
