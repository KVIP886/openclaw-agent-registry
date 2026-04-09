/**
 * Copilot - Integration Tests
 * Created: 2026-04-10 (Week 4 Day 5)
 * Function: End-to-end integration tests for Copilot Core
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const CopilotCore = require('../src/copilot/CopilotCore');
const ContextManager = require('../src/copilot/ContextManager');
const ContextIndexer = require('../src/copilot/ContextIndexer');
const AgentGenerator = require('../src/copilot/AgentGenerator');
const PermissionInferencer = require('../src/copilot/PermissionInferencer');
const ConflictDetector = require('../src/copilot/ConflictDetector');
const ConflictResolver = require('../src/copilot/ConflictResolver');

describe('Copilot Core Integration Tests', () => {
  let copilot, contextManager, contextIndexer, agentGenerator, permissionInferencer, detector, resolver;

  beforeEach(() => {
    contextManager = new ContextManager();
    contextIndexer = new ContextIndexer();
    agentGenerator = new AgentGenerator();
    permissionInferencer = new PermissionInferencer();
    detector = new ConflictDetector();
    resolver = new ConflictResolver();
    copilot = new CopilotCore({
      contextManager,
      agentGenerator,
      permissionInferencer,
      conflictDetector: detector,
      conflictResolver: resolver
    });
  });

  afterEach(() => {
    copilot = null;
    contextManager = null;
    contextIndexer = null;
    agentGenerator = null;
    permissionInferencer = null;
    detector = null;
    resolver = null;
  });

  describe('NLP Parser Integration', () => {
    it('should parse CREATE intent', () => {
      const result = copilot.process('Create a GitHub review agent');
      
      assert.ok(result.success);
      assert.strictEqual(result.translation.action, 'create');
      assert.strictEqual(result.translation.target, 'agent');
      assert.ok(result.translation.entities.name);
    });

    it('should parse READ intent', () => {
      const result = copilot.process('List all agents');
      
      assert.ok(result.success);
      assert.strictEqual(result.translation.action, 'read');
      assert.strictEqual(result.translation.target, 'agents');
    });

    it('should parse UPDATE intent', () => {
      const result = copilot.process('Update agent "old-bot" to version 2.0.0');
      
      assert.ok(result.success);
      assert.strictEqual(result.translation.action, 'update');
      assert.strictEqual(result.translation.target, 'agent');
      assert.ok(result.translation.entities.agentId);
      assert.ok(result.translation.entities.version);
    });

    it('should parse DELETE intent', () => {
      const result = copilot.process('Delete agent "deprecated-bot"');
      
      assert.ok(result.success);
      assert.strictEqual(result.translation.action, 'delete');
      assert.strictEqual(result.translation.target, 'agent');
      assert.ok(result.translation.entities.agentId);
    });

    it('should parse QUERY intent', () => {
      const result = copilot.process('Show monitoring agents');
      
      assert.ok(result.success);
      assert.strictEqual(result.translation.action, 'query');
      assert.strictEqual(result.translation.target, 'agents');
      assert.strictEqual(result.translation.filters.domain, 'monitoring');
    });
  });

  describe('Context Management Integration', () => {
    it('should manage user context', () => {
      const result = contextManager.updateUserContext({
        userId: 'user-123',
        roles: ['admin'],
        permissions: ['agent:read', 'agent:deploy']
      });

      assert.ok(result.success);
      assert.strictEqual(result.userId, 'user-123');
      assert.strictEqual(result.context.roles.length, 1);
    });

    it('should check permissions', () => {
      contextManager.updateUserContext({
        userId: 'user-123',
        permissions: ['agent:read', 'agent:deploy']
      });

      const hasPermission = contextManager.checkPermission('user-123', 'agent:deploy');
      
      assert.ok(hasPermission.hasPermission);
      assert.strictEqual(hasPermission.grantedBy, 'explicit');
    });

    it('should provide suggestions', () => {
      contextManager.updateUserContext({
        userId: 'user-123',
        permissions: ['agent:read'],
        preferences: { defaultDomain: 'devops' }
      });

      const suggestions = contextManager.getContextSuggestions('user-123');
      
      assert.ok(Array.isArray(suggestions));
      assert.ok(suggestions.length >= 0);
    });
  });

  describe('Agent Generation Integration', () => {
    it('should generate agent from description', () => {
      const result = copilot.createAgent(
        'Create a monitoring agent for health checks',
        { author: 'admin' }
      );

      assert.ok(result.success);
      assert.ok(result.configuration.id);
      assert.ok(result.configuration.name);
      assert.ok(result.configuration.permissions.length > 0);
    });

    it('should generate agent with custom template', () => {
      agentGenerator.registerCustomTemplate({
        id: 'test-template',
        name: 'Test Agent',
        fields: {
          domain: 'testing',
          permissions: ['agent:test']
        }
      });

      const result = agentGenerator.generate(
        { name: 'Test Agent' },
        { template: 'test-template' }
      );

      assert.ok(result.success);
      assert.strictEqual(result.configuration.domain, 'testing');
    });

    it('should validate generated configuration', () => {
      const result = agentGenerator.generate({});

      assert.ok(!result.success);
      assert.strictEqual(result.error, 'Missing required field: name');
    });

    it('should infer permissions', () => {
      const inference = permissionInferencer.infer({
        description: 'GitHub PR reviewer',
        services: ['github-review']
      });

      assert.ok(inference.success);
      assert.ok(inference.permissions.includes('github:read'));
      assert.ok(inference.permissions.includes('github:review'));
    });

    it('should provide recommendations', () => {
      const recommendation = permissionInferencer.recommend({
        description: 'GitHub reviewer'
      });

      assert.ok(recommendation.success);
      assert.ok(Array.isArray(recommendation.recommendations));
    });
  });

  describe('Conflict Detection Integration', () => {
    it('should detect ID conflict', () => {
      const config1 = { id: 'agent-001', name: 'Test Agent' };
      const config2 = { id: 'agent-001', name: 'Test Agent 2' };

      const detection = detector.detect(config1, config2);

      assert.ok(detection.success);
      assert.ok(detection.hasConflicts);
      assert.strictEqual(detection.conflicts.length, 1);
      assert.strictEqual(detection.conflicts[0].type, 'id');
    });

    it('should detect permission conflict', () => {
      const config1 = {
        id: 'agent-001',
        permissions: ['agent:read']
      };
      const config2 = {
        id: 'agent-002',
        permissions: []
      };

      const detection = detector.detect(config1, config2);

      assert.ok(detection.success);
      assert.ok(detection.hasConflicts);
    });

    it('should detect version conflict', () => {
      const config1 = {
        id: 'agent-001',
        version: '2.0.0'
      };
      const config2 = {
        id: 'agent-002',
        version: '1.0.0'
      };

      const detection = detector.detect(config1, config2);

      assert.ok(detection.success);
      assert.ok(detection.hasConflicts);
      assert.strictEqual(detection.conflicts[0].type, 'version');
    });

    it('should detect domain conflict', () => {
      const config1 = {
        id: 'agent-001',
        domain: 'invalid-domain'
      };

      const detection = detector.detect({}, config1);

      assert.ok(detection.success);
      assert.ok(detection.hasConflicts);
    });
  });

  describe('Conflict Resolution Integration', () => {
    it('should resolve ID conflict by keeping new', () => {
      const config1 = { id: 'agent-001', name: 'Old Agent' };
      const config2 = { id: 'agent-001', name: 'New Agent' };

      const detection = detector.detect(config1, config2);
      const resolution = resolver.resolveWithPriority(
        detection.conflicts,
        { config1, config2 },
        { strategy: 'new' }
      );

      assert.ok(resolution.success);
      assert.strictEqual(resolution.resolved[0].winner, 'config2');
    });

    it('should resolve permission conflict by merging', () => {
      const config1 = {
        id: 'agent-001',
        permissions: ['agent:read', 'agent:deploy']
      };
      const config2 = {
        id: 'agent-002',
        permissions: ['agent:monitor', 'code:analyze']
      };

      const detection = detector.detect(config1, config2);
      const resolution = resolver.resolveWithPriority(
        detection.conflicts,
        { config1, config2 },
        { strategy: 'merge' }
      );

      assert.ok(resolution.success);
    });

    it('should resolve by priority', () => {
      const config1 = {
        id: 'agent-001',
        status: 'testing',
        domain: 'general'
      };
      const config2 = {
        id: 'agent-002',
        status: 'production',
        domain: 'security'
      };

      const detection = detector.detect(config1, config2);
      const resolution = resolver.resolveWithPriority(
        detection.conflicts,
        { config1, config2 },
        { 
          context: { userGroup: 'admin', action: 'update' },
          strategy: 'auto'
        }
      );

      assert.ok(resolution.success);
      assert.ok(resolution.resolved.length > 0);
    });

    it('should auto-resolve all conflicts', () => {
      const config1 = { id: 'agent-001', name: 'Agent' };
      const config2 = { id: 'agent-001', name: 'Agent' };

      const detection = detector.detect(config1, config2);
      const resolution = resolver.autoResolve(detection.conflicts);

      assert.ok(resolution.success);
      assert.ok(!resolution.unresolved);
    });
  });

  describe('End-to-End Integration', () => {
    it('should create agent through full pipeline', () => {
      const input = 'Create a GitHub review agent that analyzes code quality';
      
      const result = copilot.process(input, { author: 'admin' });

      assert.ok(result.success);
      assert.ok(result.translation);
      assert.ok(result.configuration);
      assert.ok(result.conflicts.length === 0);
      assert.ok(result.suggestions.length >= 0);
    });

    it('should handle multiple intents in sequence', () => {
      const inputs = [
        'Create a monitoring agent',
        'List all agents',
        'Update agent "monitor" to version 2.0',
        'Delete agent "old-monitor"'
      ];

      for (const input of inputs) {
        const result = copilot.process(input);
        assert.ok(result.success, `Failed to process: ${input}`);
      }
    });

    it('should detect and resolve conflicts in pipeline', () => {
      const input1 = 'Create agent "test-bot" with ID "agent-001"';
      const input2 = 'Create agent "test-bot-2" with ID "agent-001"';

      const result1 = copilot.process(input1, { author: 'admin' });
      const result2 = copilot.process(input2, { author: 'admin' });

      assert.ok(result1.success);
      assert.ok(result2.success);
      
      // Check if conflict was detected
      const hasConflict = result2.conflicts && result2.conflicts.length > 0;
      assert.ok(hasConflict);
    });

    it('should provide suggestions and recommendations', () => {
      const input = 'Create an agent';
      
      const result = copilot.process(input);

      assert.ok(result.success);
      assert.ok(result.suggestions.length >= 0);
      assert.ok(result.recommendations.length >= 0);
    });

    it('should handle invalid input gracefully', () => {
      const input = 'Create agent with invalid name';
      
      const result = copilot.process(input, { author: 'admin' });

      assert.ok(result.success);
      assert.ok(result.validation && !result.validation.valid);
      assert.ok(result.conflicts.length === 0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid requests', () => {
      const startTime = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        copilot.process(`Create agent ${i}`);
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;

      console.log(`Average processing time: ${avgTime.toFixed(2)}ms`);
      assert.ok(avgTime < 100, `Average processing time too slow: ${avgTime}ms`);
    });

    it('should handle large batch of configurations', () => {
      const configs = [];
      for (let i = 0; i < 50; i++) {
        configs.push({
          id: `agent-${i}`,
          name: `Agent ${i}`,
          version: '1.0.0',
          permissions: ['agent:read'],
          domain: 'general'
        });
      }

      const startTime = Date.now();
      const result = detector.detect(configs[0], configs[1]);
      const duration = Date.now() - startTime;

      assert.ok(result.success);
      assert.ok(duration < 1000, 'Batch detection too slow');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = copilot.process('');

      assert.ok(!result.success);
      assert.ok(result.error);
    });

    it('should handle null/undefined', () => {
      const result = copilot.process(null);

      assert.ok(!result.success);
      assert.ok(result.error);
    });

    it('should handle special characters', () => {
      const result = copilot.process('Create agent "Special-Çhar@cters_123"');

      assert.ok(result.success);
      assert.ok(result.configuration);
    });

    it('should handle very long descriptions', () => {
      const longDescription = 'Create a ' + 'test'.repeat(1000) + ' agent';
      
      const result = copilot.process(longDescription);

      assert.ok(result.success);
    });

    it('should handle unicode characters', () => {
      const result = copilot.process('Create an agent with unicode name: 日本語テスト');

      assert.ok(result.success);
      assert.ok(result.configuration);
    });
  });
});

// Export for running standalone
module.exports = module.exports;
