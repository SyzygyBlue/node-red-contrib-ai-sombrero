module.exports = {
  // Enable ES modules support
  transform: {},
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'nodes/**/*.js',
    'services/**/*.js',
    'helpers/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/__mocks__/**',
    '!**/test/**',
    '!**/examples/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js',
    '**/shared/**/*.test.js',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/examples/**'
  ],
  moduleFileExtensions: ['js', 'json', 'node'],
  moduleNameMapper: {
    '^services/(.*)$': '<rootDir>/services/$1',
    '^@node-red/nodes/test/helpers/createNode$': '<rootDir>/tests/__mocks__/@node-red/nodes.js',
    '^services/audit-service$': '<rootDir>/tests/__mocks__/services/audit-service.js',
    '^services/llm-service$': '<rootDir>/services/llm-service.js',
    '^../../nodes/llm-connector/lib/llm-service$': '<rootDir>/nodes/llm-connector/lib/llm-service.js',
    '^../../nodes/llm-connector/llm-connector$': '<rootDir>/nodes/llm-connector/llm-connector.js',
    '^nodes/(.*)$': '<rootDir>/nodes/$1',
    '^shared/(.*)$': '<rootDir>/shared/$1',
    '^test-utils$': '<rootDir>/tests/nodes/llm-connector/__mocks__/test-utils.js'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/examples/',
    'tests/nodes/llm-connector/minimal-.*\\.js$',
    'tests/nodes/llm-connector/simple-.*\\.js$',
    'tests/nodes/llm-connector/direct-.*\\.js$',
    'tests/nodes/llm-connector/debug.*\\.js$',
    'tests/nodes/llm-connector/prompt-system.test.js'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|formdata-polyfill/esm.min.js)/)'
  ]
};
