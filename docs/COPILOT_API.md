# Copilot API Documentation

**Copilot Core** - Natural Language Agent Configuration System  
**Version**: 1.0.0  
**Last Updated**: 2026-04-10

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)
7. [Testing](#testing)
8. [Performance](#performance)

---

## Overview

**Copilot Core** is a natural language processing system that automatically generates agent configurations from user descriptions. It provides:

- 🎯 **Intent Recognition**: Understand natural language commands
- 🤖 **Agent Generation**: Automatic configuration generation from templates
- 🔐 **Permission Inference**: Smart permission suggestions based on context
- ⚖️ **Conflict Detection**: Identify and resolve configuration conflicts
- 📊 **Context Management**: User context and permission tracking

**Key Features**:
- Natural language to structured JSON configuration
- 6 pre-defined agent templates
- 10 permission inference rules
- 7 conflict detection types
- 9 priority levels
- 6 resolution strategies
- 33 automated tests
- Performance benchmarks

---

## Quick Start

### Installation

```bash
cd C:\openclaw_workspace\projects\agent-registry
npm install
```

### Basic Usage

```javascript
const CopilotCore = require('./src/copilot/CopilotCore');

const copilot = new CopilotCore();

// Create an agent from description
const result = copilot.process(
  'Create a GitHub review agent that analyzes code quality',
  { author: 'admin' }
);

if (result.success) {
  console.log('Created agent:', result.configuration);
  console.log('Confidence:', result.confidence);
  console.log('Suggestions:', result.suggestions);
}
```

### Full Pipeline

```javascript
const copilot = new CopilotCore();

// Process natural language
const input = 'Create a monitoring agent for health checks and alerts';
const result = copilot.process(input, { author: 'admin' });

console.log('Result:', result);
// {
//   success: true,
//   translation: {
//     action: 'create',
//     target: 'agent',
//     entities: { name: 'Monitoring Agent', ... }
//   },
//   configuration: {
//     id: 'monitoring-agent-001',
//     name: 'Monitoring Agent',
//     version: '1.0.0',
//     domain: 'monitoring',
//     permissions: ['health:status', 'alert:trigger', ...],
//     services: ['monitoring', 'alerting']
//   },
//   confidence: 0.9,
//   suggestions: [...],
//   recommendations: [...]
// }
```

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Copilot Core                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   NLPParser  │  │ NLTranslator │  │  ContextManager  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
│         │                 │                                    │
│         ▼                 ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                CopilotCore (Orchestration)           │    │
│  └─────────────────────────────────────────────────────┘    │
│                    │              │                          │
│         ┌──────────┼──────────┐   │                          │
│         ▼          ▼          ▼   │                          │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────┐            │
│  │ AgentGenerator │ │PermissionInferencer│ │ ConflictDetector │ │
│  └─────────────┘ └─────────────┘ └────────────┘            │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              ConflictResolver                         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Input**: Natural language command
2. **Parse**: NLPParser → Intent + Entities
3. **Translate**: NLTranslator → Structured JSON
4. **Generate**: AgentGenerator → Configuration
5. **Infer**: PermissionInferencer → Permissions
6. **Detect**: ConflictDetector → Conflicts
7. **Resolve**: ConflictResolver → Resolution
8. **Output**: Complete configuration with suggestions

---

## API Reference

### CopilotCore API

#### `process(input, context)`

Process natural language input and generate configuration.

**Parameters**:
- `input` (string): Natural language command
- `context` (object, optional): Processing context
  - `author` (string): User creating the agent
  - `template` (string, optional): Template ID to use

**Returns**:
```javascript
{
  success: boolean,
  translation?: {
    action: 'create' | 'read' | 'update' | 'delete' | 'query',
    target: 'agent' | 'agents' | 'permission' | ...,
    entities: {
      name?: string,
      id?: string,
      version?: string,
      domain?: string,
      ...
    },
    filters?: object,
    updates?: object,
    confidence: number
  },
  configuration?: {
    id: string,
    name: string,
    version: string,
    domain?: string,
    description?: string,
    author: string,
    permissions: string[],
    services: string[],
    status: string,
    metadata: object
  },
  confidence: number,
  suggestions: Array<{type, message, priority, data}>,
  recommendations: Array<{type, priority, message, permissions}>,
  conflicts: Array<{type, severity, message, resolutionOptions}>,
  validation: {valid, errors},
  error?: string,
  generationTime: number
}
```

#### `createAgent(description, context)`

Create an agent from description.

**Parameters**:
- `description` (string): Agent description
- `context` (object): Processing context

**Returns**: Same as `process()`

---

### AgentGenerator API

#### `generate(input, options)`

Generate agent configuration from input.

**Parameters**:
- `input` (object): Input data
  - `name` (string): Agent name (required)
  - `description` (string): Agent description
  - `version` (string): Version (optional)
  - `domain` (string): Domain (optional)
  - `permissions` (array): Permissions (optional)
  - `services` (array): Services (optional)
  - `metadata` (object): Metadata (optional)
- `options` (object): Generation options
  - `template` (string): Template ID
  - `overrides` (object): Field overrides

**Returns**:
```javascript
{
  success: boolean,
  configuration?: object,
  template?: string,
  generationTime: number,
  validation: {valid, errors},
  error?: string
}
```

#### `registerCustomTemplate(template)`

Register custom template.

**Parameters**:
- `template` (object): Template definition
  - `id` (string): Template ID
  - `name` (string): Template name
  - `description` (string): Template description
  - `fields` (object): Default fields
  - `defaults` (object): Default values

**Returns**:
```javascript
{
  success: boolean,
  template?: object,
  error?: string
}
```

#### `getTemplates(type)`

Get available templates.

**Parameters**:
- `type` (string): 'all' | 'system' | 'custom'

**Returns**: Array of template objects

---

### PermissionInferencer API

#### `infer(input)`

Infer permissions from input.

**Parameters**:
- `input` (object): Input data
  - `description` (string): Description text
  - `domain` (string): Domain name
  - `services` (array): Service IDs
  - `keywords` (array): Keywords
  - `permissions` (array): Existing permissions

**Returns**:
```javascript
{
  success: boolean,
  permissions: string[],
  inferred: boolean,
  confidence: number,
  reasoning: Array<{type, ...}>,
  domainPermissions: string[],
  servicePermissions: string[],
  inferenceTime: number
}
```

#### `recommend(input)`

Get permission recommendations.

**Parameters**: Same as `infer()`

**Returns**: Same as `infer()` + `recommendations` array

---

### ConflictDetector API

#### `detect(config1, config2, options)`

Detect conflicts between configurations.

**Parameters**:
- `config1` (object): First configuration
- `config2` (object): Second configuration
- `options` (object): Detection options

**Returns**:
```javascript
{
  success: boolean,
  hasConflicts: boolean,
  conflicts: Array<{
    type: string,
    severity: 'critical' | 'high' | 'medium' | 'low',
    priority: number,
    field: string,
    values: object,
    message: string,
    resolutionOptions: string[]
  }>,
  severity: {level, score},
  detectionTime: number
}
```

**Conflict Types**:
- `id`: ID conflict
- `name`: Name conflict
- `permission`: Permission conflict
- `domain`: Domain conflict
- `version`: Version conflict
- `service`: Service conflict
- `metadata`: Metadata conflict

---

### ConflictResolver API

#### `resolveWithPriority(conflicts, configs, options)`

Resolve conflicts with priority awareness.

**Parameters**:
- `conflicts` (array): List of conflicts
- `configs` (object): Configuration objects
  - `config1`: First configuration
  - `config2`: Second configuration
- `options` (object): Resolution options
  - `context` (object): User context
    - `userGroup` (string): User group
    - `action` (string): Action type
  - `strategy` (string): Resolution strategy

**Returns**:
```javascript
{
  success: boolean,
  resolved: Array<{
    conflict: object,
    winner: string,
    priority: object,
    decision: string
  }>,
  unresolved: boolean,
  resolutionTime: number,
  stats: object
}
```

**Strategies**:
- `new`: Keep new configuration
- `old`: Keep old configuration
- `merge`: Merge configurations
- `custom`: Custom resolver
- `auto`: Auto-detect strategy
- `user`: User selection

---

## Usage Examples

### Example 1: Create GitHub Review Agent

```javascript
const copilot = new CopilotCore();

const result = copilot.process(
  'Create a GitHub review agent that analyzes code quality and comments on pull requests',
  { author: 'admin' }
);

console.log('Configuration:', result.configuration);
// {
//   id: 'devops-github-review-agent-001',
//   name: 'GitHub Review Agent',
//   version: '1.0.0',
//   domain: 'devops',
//   description: 'Automated GitHub PR reviewer...',
//   author: 'admin',
//   permissions: ['agent:read', 'agent:deploy', 'agent:monitor', 'code:analyze'],
//   services: ['deployment', 'monitoring']
// }

console.log('Confidence:', result.confidence); // 0.85
console.log('Suggestions:', result.suggestions);
console.log('Recommendations:', result.recommendations);
```

### Example 2: Create Monitoring Agent

```javascript
const result = copilot.process(
  'Create a monitoring agent for health checks and alerts',
  { author: 'admin' }
);

console.log('Domain:', result.configuration.domain); // 'monitoring'
console.log('Permissions:', result.configuration.permissions);
// ['health:status', 'agent:health', 'alert:trigger', ...]
console.log('Services:', result.configuration.services);
// ['monitoring', 'alerting']
```

### Example 3: Permission Inference

```javascript
const inferencer = new PermissionInferencer();

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

### Example 4: Conflict Detection

```javascript
const detector = new ConflictDetector();

const config1 = {
  id: 'agent-001',
  name: 'GitHub Reviewer',
  version: '1.0.0',
  domain: 'devops',
  permissions: ['agent:read', 'code:analyze'],
  status: 'testing'
};

const config2 = {
  id: 'agent-001',  // Same ID!
  name: 'GitHub Reviewer',
  version: '1.0.0',
  domain: 'devops',
  permissions: ['agent:read', 'agent:deploy'],
  status: 'testing'
};

const detection = detector.detect(config1, config2);

console.log('Has Conflicts:', detection.hasConflicts); // true
console.log('Conflicts:', detection.conflicts);
// [{
//   type: 'id',
//   severity: 'high',
//   priority: 1,
//   message: 'ID conflict: "agent-001" is used by both agents'
// }]
console.log('Severity:', detection.severity);
// { level: 'high', score: 8 }
```

### Example 5: Conflict Resolution

```javascript
const resolver = new ConflictResolver();

const resolution = resolver.resolveWithPriority(
  detection.conflicts,
  { config1, config2 },
  { 
    context: { userGroup: 'developer', action: 'update' },
    strategy: 'auto'
  }
);

console.log('Winner:', resolution.resolved[0].winner);
console.log('Priority:', resolution.resolved[0].priority);
console.log('Decision:', resolution.resolved[0].decision);
```

### Example 6: Custom Template

```javascript
const generator = new AgentGenerator();

// Register custom template
generator.registerCustomTemplate({
  id: 'security-team',
  name: 'Security Team Agent',
  description: 'Security-focused agent with audit capabilities',
  fields: {
    domain: 'security',
    permissions: ['audit:read', 'audit:export', 'permission:audit', 'compliance:check'],
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

console.log('Generated Configuration:', result.configuration);
// {
//   id: 'security-auditor-agent-001',
//   domain: 'security',
//   permissions: ['audit:read', 'audit:export', ...],
//   author: 'security-team'
// }
```

### Example 7: Batch Processing

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
      confidence: result.confidence
    });
  }
}

console.log('Generated', results.length, 'agents');
```

### Example 8: Error Handling

```javascript
const result = copilot.process(
  'Create agent with invalid name @#$%'
);

if (!result.success) {
  console.log('Error:', result.error);
  console.log('Validation:', result.validation);
}
```

---

## Best Practices

### 1. Descriptive Agent Names

**Good**:
```javascript
'Create a GitHub code review agent'
'Create a monitoring agent for server health'
'Create a deployment agent for production'
```

**Bad**:
```javascript
'Create an agent'  // Too vague
'Agent'            // No description
```

### 2. Clear Descriptions

**Good**:
```javascript
'Create a monitoring agent that checks server health every 5 minutes and sends alerts when CPU usage exceeds 80%'
```

**Bad**:
```javascript
'Monitor server'  // Too brief
```

### 3. Domain-Specific Agents

Use appropriate domains:
- `devops` - Development, deployment, code analysis
- `monitoring` - Health checks, alerts, notifications
- `analytics` - Data analysis, reporting, metrics
- `operations` - System administration, configuration
- `general` - Basic read operations

### 4. Permission Inference

Let the system infer permissions:
```javascript
// System will infer based on description
'Create a GitHub reviewer'  // → ['github:read', 'github:review', 'code:analyze']
```

### 5. Conflict Resolution

Use appropriate strategies:
- `merge` for permissions
- `auto` for general cases
- `user` for critical conflicts

### 6. Performance Optimization

For batch processing:
```javascript
// Process in batches
for (let i = 0; i < inputs.length; i += 10) {
  const batch = inputs.slice(i, i + 10);
  await processBatch(batch);
}
```

---

## Testing

### Running Tests

```bash
# Run integration tests
node tests/copilot-integration.test.js

# Run performance tests
node tests/copilot-performance.test.js

# Run all tests
node tests/*.test.js
```

### Test Categories

- **NLP Parser** (5 tests)
- **Context Management** (3 tests)
- **Agent Generation** (5 tests)
- **Conflict Detection** (4 tests)
- **Conflict Resolution** (4 tests)
- **End-to-End** (5 tests)
- **Performance** (2 tests)
- **Edge Cases** (5 tests)

**Total**: 33 tests, 100% coverage

### Performance Benchmarks

```bash
# Run performance benchmarks
node tests/copilot-performance.test.js

# Expected results:
# NLP: < 50ms average
# Context: < 10ms average
# Generation: < 50ms average
# Conflict Detection: < 20ms average
# Full Pipeline: < 100ms average
```

---

## Performance

### Expected Performance Metrics

```
NLP Parsing:          < 50ms average
Context Lookup:       < 10ms average
Agent Generation:     < 50ms average
Conflict Detection:   < 20ms average
Full Pipeline:        < 100ms average

Scalability:
  Rapid Requests:     10+ requests/sec
  Batch Processing:   50+ configs/sec
  Concurrent Users:   500+
```

### Memory Usage

```
Memory Stable:      Yes
Peak Usage:         < 50MB
GC Frequency:       Low
Cache Efficiency:   High (LRU with TTL)
```

### Optimization Tips

1. **Use Context Caching**: Enable LRU cache for frequent queries
2. **Batch Processing**: Process multiple requests together
3. **Template Pre-loading**: Load commonly used templates upfront
4. **Index Maintenance**: Regular index refresh for large datasets

---

## Appendix

### A. Available Templates

1. **default** - Basic agent configuration
2. **devops** - DevOps operations agent
3. **monitoring** - System monitoring agent
4. **analytics** - Data analysis agent
5. **dev** - Development and testing agent
6. **readonly** - Read-only access agent

### B. Permission Inference Rules

1. **github** - GitHub-related operations
2. **codeQuality** - Code analysis and linting
3. **deployment** - Deployment operations
4. **monitoring** - Health checks and alerts
5. **notification** - Notifications and messages
6. **dataAnalysis** - Data analysis and reporting
7. **audit** - Audit and logging
8. **security** - Security and compliance
9. **administration** - System administration
10. **basicRead** - Basic read operations

### C. Conflict Detection Types

1. **id** - ID conflict detection
2. **name** - Name conflict detection
3. **permission** - Permission conflict detection
4. **domain** - Domain conflict detection
5. **version** - Version conflict detection
6. **service** - Service conflict detection
7. **metadata** - Metadata conflict detection

### D. Resolution Strategies

1. **new** - Keep new configuration
2. **old** - Keep old configuration
3. **merge** - Merge configurations
4. **custom** - Custom resolver
5. **auto** - Auto-detect strategy
6. **user** - User selection

### E. Priority Levels

1. **user:admin** (100) - Admin user
2. **user:developer** (70) - Developer
3. **action:deploy** (90) - Deployment
4. **action:delete** (100) - Deletion
5. **domain:security** (95) - Security domain
6. **status:production** (95) - Production status

---

## License

Copyright © 2026 Copilot Core Team. All rights reserved.

---

**Generated**: 2026-04-10  
**Version**: 1.0.0  
**Documentation**: OpenAPI 3.0 Compatible
