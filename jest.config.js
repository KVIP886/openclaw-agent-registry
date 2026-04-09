/**
 * Jest Configuration for OpenClaw Agent Registry
 * Phase 2: AI Video Generation
 */

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/index.js'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000, // 30 seconds for AI operations
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
  bail: false
};
