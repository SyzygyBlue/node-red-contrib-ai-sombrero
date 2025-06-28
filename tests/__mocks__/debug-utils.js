// Mock implementation of the debug-utils module
const mockDebugLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  time: jest.fn(),
  timeEnd: jest.fn(),
  logMessage: jest.fn((event, data = {}, level = 'debug') => {
    const logEntry = { event, ...data, timestamp: new Date().toISOString() };
    // Call the appropriate log level function
    mockDebugLogger[level](logEntry);
    return logEntry;
  }),
  child: jest.fn(() => mockDebugLogger)
};

const createDebugLogger = jest.fn(() => mockDebugLogger);

const createDebugContext = jest.fn((options) => {
  const debug = createDebugLogger(options);
  
  return {
    debug,
    withTiming: jest.fn((name, fn) => {
      return async (...args) => {
        debug.time(name);
        try {
          const result = await fn(...args);
          debug.timeEnd(name);
          return result;
        } catch (error) {
          debug.timeEnd(name);
          debug.logMessage(`${name}_failed`, { 
            error: error.message,
            stack: error.stack 
          }, 'error');
          throw error;
        }
      };
    })
  };
});

module.exports = {
  createDebugLogger,
  createDebugContext,
  mockDebugLogger // Export the mock for test assertions
};
