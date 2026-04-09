/**
 * Jest Test Setup
 * Configure test environment and globals
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001'; // Use different port for tests
process.env.JWT_SECRET = 'test-secret-key-for-jest';

// Extend expect with custom matchers (if needed)
// Example: expect.extend({ toBeValidToken(received) { ... } });

// Suppress console logs during tests (optional, for cleaner output)
// jest.mock('console', () => ({
//   ...jest.requireActual('console'),
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn()
// }));

global.testHelpers = {
  // Helper to create mock agent data
  createMockAgent: (overrides = {}) => ({
    id: 'test-agent-1',
    name: 'Test Agent',
    version: '1.0.0',
    domain: 'testing',
    description: 'Test agent for unit tests',
    author: 'Test User',
    status: 'testing',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  // Helper to create mock user data
  createMockUser: (role = 'admin') => {
    const roles = {
      admin: ['agent:admin', 'system:admin', 'permission:manage', 'config:manage', 'health:monitor'],
      operator: ['agent:read', 'agent:create', 'agent:deploy', 'agent:update', 'agent:delete', 'health:monitor'],
      viewer: ['agent:read', 'agent:health']
    };

    return {
      id: 'test-user',
      username: 'testuser',
      passwordHash: '$2a$10$test',
      permissions: roles[role] || [],
      roles: role,
      roleDetails: [{ roleName: role, permissions: roles[role] || [] }]
    };
  },

  // Helper to reset database
  resetDb: async (db) => {
    if (db.agents) db.agents = [];
    if (db.permissions) db.permissions = [];
    if (db.deployments) db.deployments = [];
    if (db.configs) db.configs = [];
    if (db.events) db.events = [];
    if (db.auditLogs) db.auditLogs = [];
    if (db.nextIds) {
      db.nextIds.permissions = 1;
      db.nextIds.deployments = 1;
      db.nextIds.configs = 1;
      db.nextIds.events = 1;
      db.nextIds.auditLogs = 1;
    }
  }
};
