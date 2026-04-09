# Copilot Quick Usage Examples

**Copilot Core** - Natural Language Agent Configuration System  
**Quick Start Guide**

---

## 🚀 Quick Start (1-2 Minutes)

### Basic Usage

```javascript
const CopilotCore = require('./src/copilot/CopilotCore');

const copilot = new CopilotCore();

// Simple agent creation
const result = copilot.process(
  'Create a GitHub review agent',
  { author: 'admin' }
);

console.log(result.configuration);
// {
//   id: 'devops-github-review-agent-001',
//   name: 'GitHub Review Agent',
//   version: '1.0.0',
//   domain: 'devops',
//   permissions: ['agent:read', 'agent:deploy', 'code:analyze'],
//   ...
// }
```

---

## 📋 All Examples

### Example 1: Create Different Agent Types

```javascript
// 1. GitHub Review Agent
const githubAgent = copilot.process(
  'Create a GitHub review agent that analyzes code quality',
  { author: 'admin' }
);

// 2. Monitoring Agent
const monitoringAgent = copilot.process(
  'Create a monitoring agent for health checks and alerts',
  { author: 'admin' }
);

// 3. Analytics Agent
const analyticsAgent = copilot.process(
  'Create a data analytics agent that generates reports',
  { author: 'admin' }
);

// 4. DevOps Agent
const devOpsAgent = copilot.process(
  'Create a DevOps agent for deployment and operations',
  { author: 'admin' }
);

console.log('Created 4 agents:', [
  githubAgent.configuration,
  monitoringAgent.configuration,
  analyticsAgent.configuration,
  devOpsAgent.configuration
]);
```

### Example 2: Query Agents

```javascript
// List all agents
const allAgents = copilot.process('List all agents');
console.log('All agents:', allAgents.translation);

// Query by domain
const devOpsAgents = copilot.process('Show devOps agents');
console.log('DevOps agents:', devOpsAgents);

// Query by keyword
const monitoringAgents = copilot.process('Show monitoring agents');
console.log('Monitoring agents:', monitoringAgents);
```

### Example 3: Update Agent

```javascript
// Update version
const updateResult = copilot.process(
  'Update agent "github-reviewer" to version 2.0.0',
  { author: 'admin' }
);

console.log('Updated:', updateResult.configuration);
// {
//   ...
//   version: '2.0.0',
//   ...
// }
```

### Example 4: Delete Agent

```javascript
// Delete agent
const deleteResult = copilot.process(
  'Delete agent "old-bot"',
  { author: 'admin' }
);

console.log('Deleted:', deleteResult.translation);
// {
//   action: 'delete',
//   target: 'agent',
//   entities: { agentId: 'old-bot' },
//   ...
// }
```

### Example 5: Permission Inference

```javascript
const PermissionInferencer = require('./src/copilot/PermissionInferencer');
const inferencer = new PermissionInferencer();

// Infer permissions from description
const inference = inferencer.infer({
  description: 'GitHub PR reviewer that analyzes code quality',
  services: ['github-review', 'code-analysis'],
  domain: 'devops'
});

console.log('Inferred Permissions:', inference.permissions);
// ['code:analyze', 'code:lint', 'github:read', 'github:review']

console.log('Confidence:', inference.confidence); // 0.9
console.log('Reasoning:', inference.reasoning);
```

### Example 6: Conflict Detection

```javascript
const ConflictDetector = require('./src/copilot/ConflictDetector');
const detector = new ConflictDetector();

const config1 = {
  id: 'agent-001',
  name: 'GitHub Reviewer',
  version: '1.0.0',
  domain: 'devops',
  permissions: ['agent:read', 'code:analyze']
};

const config2 = {
  id: 'agent-001',  // Same ID!
  name: 'GitHub Reviewer',
  version: '1.0.0',
  domain: 'devops',
  permissions: ['agent:read', 'agent:deploy']
};

const detection = detector.detect(config1, config2);

console.log('Conflicts Detected:', detection.hasConflicts); // true
console.log('Conflicts:', detection.conflicts);
// [{
//   type: 'id',
//   severity: 'high',
//   message: 'ID conflict: "agent-001" is used by both agents'
// }]
```

### Example 7: Conflict Resolution

```javascript
const ConflictResolver = require('./src/copilot/ConflictResolver');
const resolver = new ConflictResolver();

// Resolve conflicts
const resolution = resolver.resolveWithPriority(
  detection.conflicts,
  { config1, config2 },
  { 
    context: { 
      userGroup: 'developer', 
      action: 'update' 
    },
    strategy: 'auto'
  }
);

console.log('Resolution:', resolution);
// {
//   success: true,
//   resolved: [{
//     winner: 'config2',
//     priority: { config1: { level: 'high', score: 150 }, ... },
//     decision: 'Priority 150 > 100 - config2 wins'
//   }],
//   unresolved: false
// }
```

### Example 8: Custom Template

```javascript
const AgentGenerator = require('./src/copilot/AgentGenerator');
const generator = new AgentGenerator();

// Register custom template
generator.registerCustomTemplate({
  id: 'security-team',
  name: 'Security Team Agent',
  description: 'Security-focused agent with audit capabilities',
  fields: {
    domain: 'security',
    permissions: ['audit:read', 'audit:export', 'permission:audit'],
    services: ['security', 'audit']
  },
  defaults: {
    author: 'security-team'
  }
});

// Use custom template
const result = generator.generate(
  { name: 'Security Auditor' },
  { template: 'security-team' }
);

console.log('Generated:', result.configuration);
// {
//   id: 'security-auditor-agent-001',
//   domain: 'security',
//   permissions: ['audit:read', 'audit:export', 'permission:audit'],
//   services: ['security', 'audit'],
//   author: 'security-team'
// }
```

### Example 9: Batch Processing

```javascript
const inputs = [
  'Create a GitHub review agent',
  'Create a monitoring agent',
  'Create a data analytics agent',
  'Create a deployment agent'
];

const results = [];

for (const input of inputs) {
  const result = copilot.process(input, { author: 'admin' });
  if (result.success) {
    results.push({
      input,
      configuration: result.configuration,
      confidence: result.confidence,
      time: Date.now()
    });
  }
}

console.log('Processed', results.length, 'agents in', results.length, 'requests');
```

### Example 10: Error Handling

```javascript
// Invalid input
const result = copilot.process('Create agent with invalid name @#$%');

if (!result.success) {
  console.log('Error:', result.error);
  console.log('Validation:', result.validation);
}
// Output:
// Error: Validation failed
// Validation: { valid: false, errors: ['Name exceeds maximum length'] }
```

### Example 11: Context Management

```javascript
const ContextManager = require('./src/copilot/ContextManager');
const contextManager = new ContextManager();

// Update user context
contextManager.updateUserContext({
  userId: 'user-123',
  roles: ['admin'],
  permissions: ['agent:read', 'agent:deploy'],
  preferences: {
    defaultDomain: 'devops',
    showSuggestions: true
  },
  recentAgents: ['agent-001', 'agent-002']
});

// Check permissions
const hasPermission = contextManager.checkPermission('user-123', 'agent:deploy');
console.log('Has deploy permission:', hasPermission.hasPermission); // true
console.log('Granted by:', hasPermission.grantedBy); // 'explicit'

// Get suggestions
const suggestions = contextManager.getContextSuggestions('user-123');
console.log('Suggestions:', suggestions);
```

### Example 12: Performance Benchmark

```javascript
const CopilotPerformance = require('./tests/copilot-performance.test.js');
const performance = new CopilotPerformance();

// Run benchmarks
performance.runBenchmarks();

// Output:
// [Performance] Starting benchmarks...
// [Performance] NLP Benchmark...
// NLP Benchmark:
//   Iterations: 1000
//   Avg: 12.34ms
//   Min: 5.12ms
//   Max: 45.67ms
//   P95: 30.12ms
//   P99: 38.45ms
```

### Example 13: Full Pipeline (Real-World)

```javascript
const copilot = new CopilotCore();

async function deployAgents(agents) {
  const deployed = [];
  
  for (const agentData of agents) {
    try {
      // Create agent
      const result = copilot.process(
        agentData.description,
        { author: agentData.author }
      );
      
      if (!result.success) {
        console.log('Failed to create agent:', agentData.name);
        continue;
      }
      
      // Check for conflicts
      if (result.conflicts.length > 0) {
        console.log('Conflicts detected for:', agentData.name);
        console.log('Conflicts:', result.conflicts);
        
        // Auto-resolve
        const resolution = copilot.conflictResolver.autoResolve(result.conflicts);
        console.log('Auto-resolved:', resolution);
      }
      
      // Store in database
      await storeAgent(result.configuration);
      
      deployed.push({
        ...result.configuration,
        deployedAt: new Date(),
        confidence: result.confidence
      });
      
    } catch (error) {
      console.error('Error deploying agent:', error);
    }
  }
  
  return deployed;
}

// Usage
const agentsToDeploy = [
  {
    name: 'GitHub Reviewer',
    description: 'Automated GitHub PR reviewer',
    author: 'admin'
  },
  {
    name: 'Monitor Server',
    description: 'Server health monitoring agent',
    author: 'ops'
  }
];

deployAgents(agentsToDeploy).then(deployed => {
  console.log('Deployed agents:', deployed);
});
```

### Example 14: Advanced Filtering

```javascript
// Complex query with filters
const complexQuery = copilot.process(
  'Show all monitoring agents in production with high priority',
  { 
    author: 'admin',
    filters: {
      domain: 'monitoring',
      status: 'production',
      priority: 'high'
    }
  }
);

console.log('Query result:', complexQuery);
```

### Example 15: Version Comparison

```javascript
// Compare versions
const v1 = '1.0.0';
const v2 = '2.0.0';
const v3 = '1.5.0';

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (parts2[i] > parts1[i]) return 'v2 is newer';
    if (parts1[i] > parts2[i]) return 'v1 is newer';
  }
  return 'Same version';
}

console.log(compareVersions(v1, v2)); // v2 is newer
console.log(compareVersions(v1, v3)); // v3 is newer
```

### Example 16: Permission Suggestions

```javascript
// Get permission recommendations
const recommendation = permissionInferencer.recommend({
  description: 'Create a monitoring agent',
  domain: 'monitoring'
});

console.log('Recommendations:', recommendation.recommendations);
// [
//   {
//     type: 'minimum',
//     priority: 'high',
//     message: 'Consider adding minimum permissions: agent:read, health:status',
//     permissions: ['agent:read', 'health:status']
//   },
//   {
//     type: 'domain_specific',
//     priority: 'low',
//     message: 'Additional permissions for monitoring domain: alert:trigger, notification:send'
//   }
// ]
```

---

## 🎯 Best Practices

### 1. Use Descriptive Names

✅ Good:
```javascript
'Create a GitHub code review agent'
'Create a server health monitoring agent'
```

❌ Bad:
```javascript
'Create an agent'
'Agent'
```

### 2. Provide Clear Descriptions

✅ Good:
```javascript
'Create an agent that monitors server CPU usage and sends alerts when it exceeds 80%'
```

❌ Bad:
```javascript
'Monitor server'
```

### 3. Choose Appropriate Domain

- `devops` - Development, deployment, code analysis
- `monitoring` - Health checks, alerts
- `analytics` - Data analysis, reports
- `operations` - System administration
- `general` - Basic operations

### 4. Let System Infer Permissions

The system will automatically infer permissions based on:
- Agent description
- Domain
- Services
- Keywords

### 5. Handle Conflicts

When conflicts are detected:
1. Review conflict details
2. Choose appropriate resolution strategy
3. Consider user roles and priorities

---

## 📊 Performance Tips

### 1. Enable Caching
```javascript
const copilot = new CopilotCore({
  cacheEnabled: true,
  cacheTTL: 300000  // 5 minutes
});
```

### 2. Batch Processing
```javascript
// Process 10 agents at once
const batchResult = await copilot.processBatch(agentDescriptions);
```

### 3. Use Pre-computed Templates
```javascript
const template = agentGenerator.getTemplate('devops');
const result = agentGenerator.generate(input, { template });
```

---

## 🔍 Debugging

### Check Translation
```javascript
const result = copilot.process('Create a monitoring agent');
console.log('Translation:', result.translation);
console.log('Entities:', result.translation.entities);
```

### Check Confidence
```javascript
console.log('Confidence:', result.confidence);
// 0.85 (85% confidence)
```

### Check Validation
```javascript
console.log('Validation:', result.validation);
// { valid: true/false, errors: [...] }
```

### Check Conflicts
```javascript
console.log('Conflicts:', result.conflicts);
// [{ type: 'id', severity: 'high', ... }]
```

---

## 📚 Related Documentation

- [Full API Documentation](./COPILOT_API.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Testing Guide](../tests/README.md)

---

**Quick Start Complete!** 🎉

Now you have everything you need to get started with Copilot Core. For more detailed information, check the [Full API Documentation](./COPILOT_API.md).
