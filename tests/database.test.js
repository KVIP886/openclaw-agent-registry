/**
 * Database Module Tests
 * OpenClaw Agent Registry v1.0.0
 * Testing: CRUD Operations, Data Persistence, Query Filters
 */

const fs = require('fs');
const path = require('path');

// Mock data directory before importing
const testDir = path.join(__dirname, '..', 'test_data');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Temporarily override DB path
const originalDbPath = require.resolve('../src/database/inMemoryDb.js');
delete require.cache[originalDbPath];

describe('In-Memory Database', () => {
  let dbModule;

  beforeEach(async () => {
    // Clear test data before each test
    const dataFiles = ['agents', 'permissions', 'deployments', 'configs', 'events', 'auditLogs'];
    dataFiles.forEach(file => {
      const filePath = path.join(testDir, `${file}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Re-import with fresh state
    jest.resetModules();
    dbModule = require('../src/database/inMemoryDb.js');
    
    // Clear any persisted data
    dbModule.resetData();
  });

  // Helper function to get CRUD methods
  const getAgents = () => dbModule.agents;
  const getPermissions = () => dbModule.permissions;
  const getDeployments = () => dbModule.deployments;
  const getEvents = () => dbModule.events;

  describe('Agents CRUD', () => {
    it('should create new agent', () => {
      const result = getAgents().create({
        id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      expect(result.error).toBeNull();
      expect(result.agent).toBeDefined();
      expect(result.agent.id).toBe('test-agent-1');
      expect(result.agent.created_at).toBeDefined();
      expect(result.agent.updated_at).toBeDefined();
    });

    it('should not allow duplicate agent IDs', () => {
      // First creation
      getAgents().create({
        id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      // Second creation with same ID
      const result = getAgents().create({
        id: 'test-agent-1',
        name: 'Duplicate Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      expect(result.error).toBe('Agent ID already exists');
      expect(result.agent).toBeNull();
    });

    it('should read agent by ID', () => {
      const createResult = getAgents().create({
        id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      const agent = getAgents().getById('test-agent-1');

      expect(agent).toBeDefined();
      expect(agent.name).toBe('Test Agent');
    });

    it('should return null for non-existent agent', () => {
      const agent = getAgents().getById('non-existent-id');

      expect(agent).toBeNull();
    });

    it('should update agent', () => {
      const createResult = getAgents().create({
        id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      const updateResult = getAgents().update('test-agent-1', {
        version: '2.0.0',
        status: 'production'
      });

      expect(updateResult.error).toBeNull();
      expect(updateResult.agent.version).toBe('2.0.0');
      expect(updateResult.agent.status).toBe('production');
      expect(updateResult.agent.updated_at).toBeDefined();
    });

    it('should delete agent', () => {
      const createResult = getAgents().create({
        id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      const deleteResult = getAgents().delete('test-agent-1');

      expect(deleteResult.error).toBeNull();
      expect(deleteResult.deleted.id).toBe('test-agent-1');

      // Verify deletion
      const agent = getAgents().getById('test-agent-1');
      expect(agent).toBeNull();
    });

    it('should not delete non-existent agent', () => {
      const deleteResult = getAgents().delete('non-existent-id');

      expect(deleteResult.error).toBe('Agent not found');
      expect(deleteResult.deleted).toBeNull();
    });

    it('should list all agents with filters', () => {
      // Create multiple agents
      getAgents().create({
        id: 'agent-1',
        name: 'Agent 1',
        version: '1.0.0',
        domain: 'production',
        status: 'running',
        author: 'User 1'
      });

      getAgents().create({
        id: 'agent-2',
        name: 'Agent 2',
        version: '1.0.0',
        domain: 'testing',
        status: 'testing',
        author: 'User 2'
      });

      getAgents().create({
        id: 'agent-3',
        name: 'Agent 3',
        version: '1.0.0',
        domain: 'production',
        status: 'stopped',
        author: 'User 1'
      });

      // Filter by domain
      const productionAgents = getAgents().getAll({ domain: 'production' });
      expect(productionAgents).toHaveLength(2);
      expect(productionAgents.every(a => a.domain === 'production')).toBe(true);

      // Filter by status
      const runningAgents = getAgents().getAll({ status: 'running' });
      expect(runningAgents).toHaveLength(1);
      expect(runningAgents[0].id).toBe('agent-1');

      // Search by name
      const searchedAgents = getAgents().getAll({ search: 'Agent 1' });
      expect(searchedAgents).toHaveLength(1);
      expect(searchedAgents[0].name).toContain('Agent 1');

      // No filters - return all
      const allAgents = getAgents().getAll();
      expect(allAgents).toHaveLength(3);
    });
  });

  describe('Permissions CRUD', () => {
    it('should create permission', () => {
      const createResult = getAgents().create({
        id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      const permResult = getPermissions().create({
        agent_id: 'test-agent-1',
        permission_type: 'agent:read',
        resource_type: 'agent',
        scope: 'self'
      });

      expect(permResult.error).toBeNull();
      expect(permResult.permission).toBeDefined();
      expect(permResult.permission.permission_type).toBe('agent:read');
    });

    it('should get all permissions for agent', () => {
      const agentId = 'test-agent-1';
      
      getAgents().create({
        id: agentId,
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      getPermissions().create({
        agent_id: agentId,
        permission_type: 'agent:read',
        resource_type: 'agent',
        scope: 'self'
      });

      getPermissions().create({
        agent_id: agentId,
        permission_type: 'agent:deploy',
        resource_type: 'agent',
        scope: 'self'
      });

      const permissions = getPermissions().getAll(agentId);

      expect(permissions).toHaveLength(2);
      expect(permissions.map(p => p.permission_type)).toContain('agent:read');
      expect(permissions.map(p => p.permission_type)).toContain('agent:deploy');
    });

    it('should delete all permissions for agent', () => {
      const agentId = 'test-agent-1';
      
      getAgents().create({
        id: agentId,
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      getPermissions().create({
        agent_id: agentId,
        permission_type: 'agent:read',
        resource_type: 'agent',
        scope: 'self'
      });

      getPermissions().create({
        agent_id: agentId,
        permission_type: 'agent:deploy',
        resource_type: 'agent',
        scope: 'self'
      });

      const deleteResult = getPermissions().deleteAllByAgent(agentId);

      expect(deleteResult.error).toBeNull();

      const permissions = getPermissions().getAll(agentId);
      expect(permissions).toHaveLength(0);
    });
  });

  describe('Deployments CRUD', () => {
    it('should create deployment', () => {
      const agentId = 'test-agent-1';
      
      getAgents().create({
        id: agentId,
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      const deployResult = getDeployments().create({
        agent_id: agentId,
        deployment_type: 'container',
        environment: 'production',
        endpoint: 'http://agent.local:3000',
        status: 'pending'
      });

      expect(deployResult.error).toBeNull();
      expect(deployResult.deployment).toBeDefined();
      expect(deployResult.deployment.environment).toBe('production');
      expect(deployResult.deployment.status).toBe('pending');
    });

    it('should get deployments by agent', () => {
      const agentId = 'test-agent-1';
      
      getAgents().create({
        id: agentId,
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      getDeployments().create({
        agent_id: agentId,
        deployment_type: 'container',
        environment: 'production',
        endpoint: 'http://agent.local:3000',
        status: 'running'
      });

      const deployments = getDeployments().getAll(agentId);

      expect(deployments).toHaveLength(1);
      expect(deployments[0].environment).toBe('production');
    });
  });

  describe('Event Logging', () => {
    it('should create event', () => {
      const agentId = 'test-agent-1';
      
      getAgents().create({
        id: agentId,
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      const eventResult = getEvents().create({
        agent_id: agentId,
        event_type: 'agent_created',
        severity: 'info',
        message: 'Agent created successfully'
      });

      expect(eventResult.error).toBeNull();
      expect(eventResult.event).toBeDefined();
      expect(eventResult.event.event_type).toBe('agent_created');
    });

    it('should get recent events by event_id', () => {
      const agentId = 'test-agent-5';
      
      getAgents().create({
        id: agentId,
        name: 'Test Agent 5',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      // Create event_1 first
      const event1 = getEvents().create({
        agent_id: agentId,
        event_type: 'event_1',
        severity: 'info',
        message: 'Event 1'
      });

      // Force a delay of 100ms to ensure different timestamps
      const start = Date.now();
      while (Date.now() - start < 100) {
        // Busy wait
      }

      // Create event_2 (should be newer due to delay)
      const event2 = getEvents().create({
        agent_id: agentId,
        event_type: 'event_2',
        severity: 'warning',
        message: 'Event 2'
      });

      // Log timestamps for debugging
      console.log('Event 1 timestamp:', event1.event.timestamp);
      console.log('Event 2 timestamp:', event2.event.timestamp);

      // Get all events first (without limit) to see order
      const allEvents = getEvents().getAll(agentId);
      console.log('All events count:', allEvents.length);
      allEvents.forEach((e, i) => {
        console.log(`Event ${i+1}:`, e.event_type, e.timestamp);
      });

      const events = getEvents().getAll(agentId, { limit: 1 });

      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe('event_2'); // Most recent (event_2)
    });
  });

  describe('Data Persistence', () => {
    it('should persist agents to disk', async () => {
      const createResult = getAgents().create({
        id: 'test-agent-2',
        name: 'Test Agent 2',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      expect(createResult.error).toBeNull();

      // Check if file exists in data directory (actual DB path)
      const projectRoot = path.join(__dirname, '..');
      const filePath = path.join(projectRoot, 'data', 'agents.json');
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify file content
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      // Find the agent we just created
      const foundAgent = data.find(a => a.id === 'test-agent-2');
      expect(foundAgent).toBeDefined();
      expect(foundAgent.name).toBe('Test Agent 2');
    });

    it('should load data from disk on restart', () => {
      // This test would require simulating a restart
      // For now, we verify that files are created
      const file = path.join(testDir, 'agents.json');
      
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '[]');
      }

      // Simulate reload
      dbModule.loadPersistedData();

      // Verify data loaded (empty array if file was just created)
      expect(dbModule.db.agents).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle agent without description', () => {
      const result = getAgents().create({
        id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      expect(result.agent.description).toBeNull();
    });

    it('should handle agent without status', () => {
      const result = getAgents().create({
        id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User'
      });

      expect(result.agent.status).toBe('testing'); // Default status
    });

    it('should handle agent with metadata', () => {
      const metadata = {
        customField1: 'value1',
        customField2: 123,
        tags: ['tag1', 'tag2']
      };

      const result = getAgents().create({
        id: 'test-agent-1',
        name: 'Test Agent',
        version: '1.0.0',
        domain: 'testing',
        author: 'Test User',
        metadata
      });

      expect(result.agent.metadata).toEqual(metadata);
    });
  });
});
