// Mock for @node-red/runtime
module.exports = {
  nodes: {
    createNode: jest.fn(),
    registerType: jest.fn(),
    getNode: jest.fn()
  },
  util: {
    setMessageProperty: jest.fn(),
    getMessageProperty: jest.fn(),
    evaluateNodeProperty: jest.fn()
  },
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  settings: {
    get: jest.fn()
  },
  hooks: {
    add: jest.fn()
  },
  events: {
    on: jest.fn(),
    emit: jest.fn()
  },
  comms: {
    publish: jest.fn()
  },
  library: {
    register: jest.fn()
  },
  // Add any other runtime methods your tests might need
};
