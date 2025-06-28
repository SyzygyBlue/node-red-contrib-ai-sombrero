// Global test setup
// Mock console methods to keep test output clean
const originalConsole = { ...console };

global.beforeEach(() => {
  // Mock console methods
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  };

  // Mock process.exit to prevent tests from exiting
  jest.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit() was called');
  });
});

global.afterEach(() => {
  // Restore original console
  global.console = originalConsole;
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear all instances and calls to constructor and all methods
  jest.clearAllMocks();
});

// Mock global Node-RED objects
if (!global.RED) {
  global.RED = {
    nodes: {
      registerType: jest.fn(),
      getNode: jest.fn(),
      createNode: jest.fn(),
      addNode: jest.fn(),
      eachNode: jest.fn(),
      getNodes: jest.fn().mockReturnValue([]),
      clear: jest.fn()
    },
    log: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    },
    httpAdmin: {
      get: jest.fn(),
      post: jest.fn()
    },
    httpNode: {
      get: jest.fn(),
      post: jest.fn()
    },
    auth: {
      needsPermission: jest.fn()
    },
    settings: {
      get: jest.fn()
    },
    util: {
      ensureString: jest.fn().mockImplementation(val => String(val)),
      ensureBuffer: jest.fn().mockImplementation(val => Buffer.from(String(val))),
      ensureArray: jest.fn().mockImplementation(val => Array.isArray(val) ? val : [val]),
      ensureObject: jest.fn().mockImplementation(val => typeof val === 'object' && val !== null ? val : {})
    }
  };
}
