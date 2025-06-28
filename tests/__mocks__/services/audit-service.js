// Mock implementation of the audit service
const mockAuditLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  logMessage: jest.fn((event, data = {}, level = 'debug') => {
    const logEntry = { event, ...data, timestamp: new Date().toISOString() };
    // Call the appropriate log level function
    mockAuditLogger[level](logEntry);
    return logEntry;
  })
};

module.exports = {
  auditLogger: mockAuditLogger
};
