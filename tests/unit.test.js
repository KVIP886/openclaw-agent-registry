/**
 * Unit Tests for OpenClaw Agent Registry v1.0.0
 * Testing actual working functionality
 */

describe('OpenClaw Agent Registry - Unit Tests', () => {
  
  describe('Module Exports', () => {
    test('should export AuthManager as class', () => {
      const Auth = require('../src/auth');
      expect(typeof Auth).toBe('function');
    });

    test('should export RBACManager as class', () => {
      const RBAC = require('../src/rbac');
      expect(typeof RBAC).toBe('function');
    });

    test('should export db module with resetData', () => {
      const dbModule = require('../src/database/inMemoryDb.js');
      expect(dbModule).toHaveProperty('default');
      expect(typeof dbModule.default).toBe('object');
      expect(dbModule).toHaveProperty('resetData');
      expect(typeof dbModule.resetData).toBe('function');
    });
  });

  describe('RBAC Manager', () => {
    test('should have getRoles method', () => {
      const rbac = new (require('../src/rbac'))();
      expect(typeof rbac.getRoles).toBe('function');
    });

    test('should have getAllPermissions method', () => {
      const rbac = new (require('../src/rbac'))();
      expect(typeof rbac.getAllPermissions).toBe('function');
    });

    test('should have getRoleNames method', () => {
      const rbac = new (require('../src/rbac'))();
      expect(typeof rbac.getRoleNames).toBe('function');
    });

    test('getRoles should return object', () => {
      const rbac = new (require('../src/rbac'))();
      const roles = rbac.getRoles();
      expect(typeof roles).toBe('object');
      expect(Object.keys(roles).length).toBeGreaterThan(0);
    });

    test('getAllPermissions should return array', () => {
      const rbac = new (require('../src/rbac'))();
      const permissions = rbac.getAllPermissions();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
    });

    test('getRoleNames should return array of strings', () => {
      const rbac = new (require('../src/rbac'))();
      const roleNames = rbac.getRoleNames();
      expect(Array.isArray(roleNames)).toBe(true);
      expect(roleNames.every(name => typeof name === 'string')).toBe(true);
    });

    test('should have standard roles', () => {
      const rbac = new (require('../src/rbac'))();
      const roles = rbac.getRoles();
      expect(roles).toHaveProperty('agent_admin');
      expect(roles).toHaveProperty('agent_operator');
      expect(roles).toHaveProperty('agent_observer');
    });

    test('should have at least 17 unique permissions', () => {
      const rbac = new (require('../src/rbac'))();
      const permissions = rbac.getAllPermissions();
      expect(permissions.length).toBeGreaterThanOrEqual(17);
    });

    test('hasPermission should work with valid user', () => {
      const rbac = new (require('../src/rbac'))();
      // 需要先将用户添加到 RBAC 系统中
      rbac.users.set('user-1', {
        id: 'user-1',
        permissions: ['agent:read', 'agent:start', 'agent:stop']
      });

      expect(rbac.hasPermission('user-1', 'agent:read')).toBe(true);
      expect(rbac.hasPermission('user-1', 'agent:start')).toBe(true);
      expect(rbac.hasPermission('user-1', 'agent:stop')).toBe(true);
      expect(rbac.hasPermission('user-1', 'agent:delete')).toBe(false);
    });
  });

  describe('Authentication Manager', () => {
    test('should generate access token', () => {
      const auth = new (require('../src/auth'))();
      const token = auth.generateAccessToken({ id: 'user-1', username: 'test' });
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('should verify valid token', () => {
      const auth = new (require('../src/auth'))();
      const token = auth.generateAccessToken({ id: 'user-1', username: 'test' });
      const decoded = auth.verifyToken(token);
      expect(decoded.username).toBe('test');
    });

    test('should throw error for invalid token', () => {
      const auth = new (require('../src/auth'))();
      expect(() => auth.verifyToken('invalid.token')).toThrow('Invalid token');
    });

    test('should revoke token', () => {
      const auth = new (require('../src/auth'))();
      const token = auth.generateAccessToken({ id: 'user-1', username: 'test' });
      auth.revokeToken(token);
      // 被撤销的 token 会抛出 "Invalid token" 错误
      expect(() => auth.verifyToken(token)).toThrow('Invalid token');
    });

    test('should generate API key', () => {
      const auth = new (require('../src/auth'))();
      const apiKey = auth.generateApiKey('test-api-key');
      expect(typeof apiKey).toBe('object');
      expect(apiKey).toHaveProperty('apiKey');
      expect(apiKey.apiKey).toMatch(/^lk_[a-f0-9]+$/);
    });

    test('hashPassword should return bcrypt hash', () => {
      const auth = new (require('../src/auth'))();
      const hash = auth.hashPassword('test-password');
      expect(hash).toMatch(/^\$2a\$[0-9]{2}\$[A-Za-z0-9\/.]{53}$/);
    });

    test('hashApiKey should return bcrypt hash', () => {
      const auth = new (require('../src/auth'))();
      const hash = auth.hashApiKey('test-key');
      expect(hash).toMatch(/^\$2a\$[0-9]{2}\$[A-Za-z0-9\/.]{53}$/);
    });
  });

  describe('Database Module', () => {
    let agents, permissions, deployments, events;

    beforeEach(() => {
      const dbModule = require('../src/database/inMemoryDb.js');
      dbModule.resetData();
      
      // 使用 dbModule 直接导出的 CRUD 对象
      agents = dbModule.agents;
      permissions = dbModule.permissions;
      deployments = dbModule.deployments;
      events = dbModule.events;
    });

    test('should have agents CRUD methods', () => {
      expect(typeof agents.create).toBe('function');
      expect(typeof agents.getAll).toBe('function');
      expect(typeof agents.getById).toBe('function');
      expect(typeof agents.update).toBe('function');
      expect(typeof agents.delete).toBe('function');
    });

    test('should have permissions CRUD methods', () => {
      expect(typeof permissions.create).toBe('function');
      expect(typeof permissions.getAll).toBe('function');
      expect(typeof permissions.delete).toBe('function');
    });

    test('should have deployments CRUD methods', () => {
      expect(typeof deployments.create).toBe('function');
      expect(typeof deployments.getAll).toBe('function');
    });

    test('should have events CRUD methods', () => {
      expect(typeof events.create).toBe('function');
      expect(typeof events.getAll).toBe('function');
    });

    test('should create and read agent', () => {
      const result = agents.create({
        id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      expect(result.error).toBeNull();
      expect(result.agent.id).toBe('test-agent-1');

      const agent = agents.getById('test-agent-1');
      expect(agent.name).toBe('Test Agent');
    });

    test('should list all agents with filters', () => {
      agents.create({
        id: 'agent-1',
        name: 'Agent 1',
        version: '1.0.0',
        domain: 'production',
        status: 'running',
        author: 'User 1'
      });

      agents.create({
        id: 'agent-2',
        name: 'Agent 2',
        version: '1.0.0',
        domain: 'testing',
        status: 'testing',
        author: 'User 2'
      });

      const allAgents = agents.getAll();
      expect(allAgents.length).toBe(2);

      const productionAgents = agents.getAll({ domain: 'production' });
      expect(productionAgents.length).toBe(1);

      const runningAgents = agents.getAll({ status: 'running' });
      expect(runningAgents.length).toBe(1);
    });

    test('should create permission', () => {
      const agentId = 'test-agent-1';
      
      agents.create({
        id: agentId,
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      const result = permissions.create({
        agent_id: agentId,
        permission_type: 'agent:read',
        resource_type: 'agent',
        scope: 'self'
      });

      expect(result.error).toBeNull();
      expect(result.permission.permission_type).toBe('agent:read');

      const perms = permissions.getAll(agentId);
      expect(perms.length).toBe(1);
    });

    test('should create deployment', () => {
      const agentId = 'test-agent-1';
      
      agents.create({
        id: agentId,
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      const result = deployments.create({
        agent_id: agentId,
        deployment_type: 'container',
        environment: 'production',
        endpoint: 'http://agent.local:3000',
        status: 'pending'
      });

      expect(result.error).toBeNull();
      expect(result.deployment.environment).toBe('production');
    });

    test('should create event', () => {
      const result = events.create({
        event_id: 'test-event-1',
        event_type: 'agent_created',
        severity: 'info',
        message: 'Agent created successfully'
      });

      expect(result.error).toBeNull();
      expect(result.event.event_type).toBe('agent_created');
    });

    test('should reset all data', () => {
      agents.create({
        id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      expect(agents.getAll().length).toBe(1);

      const dbModule = require('../src/database/inMemoryDb.js');
      dbModule.resetData();

      expect(agents.getAll().length).toBe(0);
    });
  });

  describe('Database Persistence', () => {
    test('should check if loadPersistedData exists', () => {
      const dbModule = require('../src/database/inMemoryDb.js');
      expect(typeof dbModule.loadPersistedData).toBe('function');
    });
  });

  describe('Integration Tests', () => {
    test('RBAC checkPermission should work with middleware-style function', () => {
      const rbac = new (require('../src/rbac'))();
      
      const checkPerm = rbac.checkPermission('agent:create');
      expect(typeof checkPerm).toBe('function');
    });

    test('Authentication should work end-to-end', () => {
      const Auth = require('../src/auth');
      const auth = new Auth();
      
      const user = { id: 'user-1', username: 'test' };
      
      // Generate token
      const token = auth.generateAccessToken(user);
      expect(typeof token).toBe('string');
      
      // Verify token
      const decoded = auth.verifyToken(token);
      expect(decoded.username).toBe('test');
      
      // Revoke token
      auth.revokeToken(token);
      expect(() => auth.verifyToken(token)).toThrow('Invalid token');
    });

    test('Database should persist agents correctly', () => {
      const dbModule = require('../src/database/inMemoryDb.js');
      dbModule.resetData();
      
      const agents = dbModule.agents;
      const result = agents.create({
        id: 'agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });
      
      expect(result.agent.id).toBe('agent-1');
      expect(result.agent.status).toBe('testing');
      expect(result.agent.metadata).toEqual({});
    });
  });
});
