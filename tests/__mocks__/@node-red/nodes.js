// Mock for @node-red/nodes
module.exports = {
  test: {
    helpers: {
      createNode: jest.fn().mockImplementation((RED, config) => ({
        id: config.id || 'test-node',
        type: config.type,
        name: config.name || '',
        on: jest.fn(),
        send: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        log: jest.fn(),
        status: jest.fn(),
        ...config
      })),
      mockRed: () => ({
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
      })
    }
  }
};
