# Agent Communication Protocol Specification

**Version**: 1.0.0  
**Date**: 2026-04-10  
**Author**: Copilot Core Team  
**Status**: Draft

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Communication Patterns](#communication-patterns)
3. [Message Format](#message-format)
4. [Event Types](#event-types)
5. [Protocol Details](#protocol-details)
6. [Implementation Guide](#implementation-guide)
7. [Examples](#examples)

---

## Overview

The **Agent Communication Protocol** defines the standard for inter-agent communication in the Copilot Core ecosystem. It enables agents to:

- 🔄 **Request-Response**: Synchronous communication
- 📡 **Event-Driven**: Asynchronous notifications
- 📢 **Publish-Subscribe**: Multi-agent broadcasting
- 📨 **Message Queue**: Persistent messaging

**Key Features**:
- ✅ Standardized message format
- ✅ Support for all communication patterns
- ✅ Built-in error handling
- ✅ Automatic acknowledgment
- ✅ Support for correlation IDs
- ✅ Flexible metadata

---

## Communication Patterns

### 1. Request-Response Pattern

**Description**: Synchronous one-to-one communication

**Use Cases**:
- Query agent status
- Request configuration update
- Ask for permission
- Trigger immediate action

**Flow**:
```
Agent A → Request → Agent B
Agent B → Response → Agent A
```

**Example**:
```
Sender: Agent-001
Receiver: Agent-002
Type: query_status
Correlation-ID: abc123

Payload: {
  "action": "get_status",
  "target": "Agent-002"
}
```

### 2. Event-Driven Pattern

**Description**: Asynchronous one-to-many or one-to-one notifications

**Use Cases**:
- Agent lifecycle events (created, updated, deleted)
- Status changes
- Permission grants/revocations
- Conflict detection/resolution

**Flow**:
```
Agent A → Event → All Interested Agents
```

**Example**:
```
Sender: Agent-001
Receiver: * (broadcast)
Type: agent:deployed
Correlation-ID: xyz789

Payload: {
  "agent_id": "agent-001",
  "timestamp": 1712680800000,
  "details": {
    "version": "1.0.0",
    "status": "deployed"
  }
}
```

### 3. Publish-Subscribe Pattern

**Description**: Many-to-many broadcasting with topic-based routing

**Use Cases**:
- System-wide announcements
- Multi-agent coordination
- Broadcast updates
- Distributed processing

**Flow**:
```
Publisher → Topic → Subscribers
```

**Example**:
```
Publisher: System-Broadcast
Topic: system:updates
Subscribers: all_agents

Payload: {
  "event_type": "system_update",
  "version": "2.0.0",
  "message": "New features available"
}
```

### 4. Message Queue Pattern

**Description**: Persistent asynchronous messaging with queuing

**Use Cases**:
- Background processing
- Batch operations
- Long-running tasks
- Load balancing

**Flow**:
```
Producer → Queue → Consumer
```

**Example**:
```
Producer: Agent-001
Queue: processing_queue

Payload: {
  "task_type": "transcode",
  "input": "video.mp4",
  "output": "video_transcoded.mp4",
  "priority": "high"
}
```

---

## Message Format

### Basic Structure

```json
{
  "header": {
    "sender": "agent-id",
    "receiver": "agent-id-or-*",
    "timestamp": 1712680800000,
    "correlation_id": "uuid-string"
  },
  "payload": {
    "type": "message-type",
    "data": {},
    "metadata": {}
  },
  "error?: {
    "code": "error-code",
    "message": "error-message"
  },
  "ack?: {
    "status": "ack-status",
    "timestamp": 1712680800000
  }
}
```

### Header Fields

| Field | Type | Required | Description |
|------|------|------|----|
| `sender` | string | ✅ | Agent ID that sent the message |
| `receiver` | string | ✅ | Target agent ID or `*` for broadcast |
| `timestamp` | number | ✅ | Unix timestamp in milliseconds |
| `correlation_id` | string | ✅ | Unique ID for request-response matching |

### Payload Fields

| Field | Type | Required | Description |
|------|------|------|----|
| `type` | string | ✅ | Message type identifier |
| `data` | object | ✅ | Message payload data |
| `metadata` | object | ❌ | Additional metadata |

### Error Fields (Optional)

| Field | Type | Required | Description |
|------|------|------|----|
| `code` | string | ✅ | Error code |
| `message` | string | ✅ | Human-readable error message |

### Acknowledgment Fields (Optional)

| Field | Type | Required | Description |
|------|------|------|----|
| `status` | string | ✅ | Acknowledgment status |
| `timestamp` | number | ✅ | Ack timestamp |

---

## Event Types Registry

### Lifecycle Events

| Event Type | Description | Payload Example |
|------|------|----|
| `agent:created` | New agent created | `{"agent_id": "agent-001", "name": "Test Agent", "created_by": "admin"}` |
| `agent:updated` | Agent configuration updated | `{"agent_id": "agent-001", "version": "1.1.0", "updated_by": "admin"}` |
| `agent:deleted` | Agent removed | `{"agent_id": "agent-001", "deleted_by": "admin"}` |
| `agent:deployed` | Agent deployed to production | `{"agent_id": "agent-001", "version": "1.0.0", "deployed_at": 1712680800000}` |
| `agent:undeployed` | Agent undeployed | `{"agent_id": "agent-001", "undeployed_at": 1712680800000}` |
| `agent:paused` | Agent paused | `{"agent_id": "agent-001", "reason": "maintenance"}` |
| `agent:resumed` | Agent resumed | `{"agent_id": "agent-001", "resumed_by": "admin"}` |

### Status Events

| Event Type | Description | Payload Example |
|------|------|----|
| `health:status` | System health check | `{"timestamp": 1712680800000, "status": "healthy"}` |
| `agent:health` | Agent health status | `{"agent_id": "agent-001", "status": "healthy", "uptime": 3600}` |
| `system:health` | System-wide health | `{"overall_status": "healthy", "components": {...}}` |

### Permission Events

| Event Type | Description | Payload Example |
|------|------|----|
| `permission:granted` | Permission granted | `{"agent_id": "agent-001", "permission": "agent:deploy", "granted_by": "admin"}` |
| `permission:revoked` | Permission revoked | `{"agent_id": "agent-001", "permission": "agent:deploy", "revoked_by": "admin"}` |
| `permission:audit` | Permission audit | `{"agent_id": "agent-001", "permissions": ["agent:read", "agent:deploy"]}` |

### Conflict Events

| Event Type | Description | Payload Example |
|------|------|----|
| `conflict:detected` | Conflict detected | `{"conflict_id": "conflict-001", "type": "id", "agents": ["agent-001", "agent-002"]}` |
| `conflict:resolved` | Conflict resolved | `{"conflict_id": "conflict-001", "resolution": "rename", "result": "agent-001-renamed"}` |

### Data Events

| Event Type | Description | Payload Example |
|------|------|----|
| `data:created` | Data entry created | `{"type": "configuration", "data": {...}}` |
| `data:updated` | Data entry updated | `{"type": "configuration", "data": {...}, "version": "2"}` |
| `data:deleted` | Data entry deleted | `{"type": "configuration", "id": "config-001"}` |
| `data:export` | Data exported | `{"type": "configuration", "format": "json", "count": 100}` |

---

## Protocol Details

### Correlation ID

**Purpose**: Match requests with responses in request-response pattern

**Format**: UUID v4 string
```
example: "550e8400-e29b-41d4-a716-446655440000"
```

**Best Practices**:
- ✅ Generate unique ID for each request
- ✅ Include in both request and response
- ✅ Use for request tracking
- ✅ Store in audit logs

### Timestamp Format

**Format**: Unix timestamp in milliseconds
```
example: 1712680800000 (2024-04-09T19:00:00.000Z)
```

### Message ID

**Purpose**: Unique identifier for each message

**Format**: Concatenation of correlation_id and sequence number
```
example: "550e8400-e29b-41d4-a716-446655440000-001"
```

### Acknowledgment

**Purpose**: Confirm message delivery

**Status Values**:
- `pending` - Awaiting acknowledgment
- `received` - Message received
- `processed` - Message processed successfully
- `error` - Message processing failed

**Example**:
```json
{
  "ack": {
    "status": "processed",
    "timestamp": 1712680800500,
    "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Implementation Guide

### Step 1: Define Message Structure

```javascript
class Message {
  constructor(sender, receiver, type, data, correlationId = null) {
    this.header = {
      sender: sender,
      receiver: receiver,
      timestamp: Date.now(),
      correlation_id: correlationId || this.generateUUID()
    };
    
    this.payload = {
      type: type,
      data: data,
      metadata: {}
    };
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  serialize() {
    return JSON.stringify(this);
  }

  static deserialize(json) {
    return new Message(
      json.header.sender,
      json.header.receiver,
      json.payload.type,
      json.payload.data,
      json.header.correlation_id
    );
  }
}
```

### Step 2: Create Event Registry

```javascript
const EVENT_TYPES = {
  // Lifecycle events
  AGENT_CREATED: 'agent:created',
  AGENT_UPDATED: 'agent:updated',
  AGENT_DELETED: 'agent:deleted',
  AGENT_DEPLOYED: 'agent:deployed',
  AGENT_UNDEPLOYED: 'agent:undeployed',
  AGENT_PAUSED: 'agent:paused',
  AGENT_RESUMED: 'agent:resumed',

  // Status events
  HEALTH_STATUS: 'health:status',
  AGENT_HEALTH: 'agent:health',
  SYSTEM_HEALTH: 'system:health',

  // Permission events
  PERMISSION_GRANTED: 'permission:granted',
  PERMISSION_REVOKED: 'permission:revoked',
  PERMISSION_AUDIT: 'permission:audit',

  // Conflict events
  CONFLICT_DETECTED: 'conflict:detected',
  CONFLICT_RESOLVED: 'conflict:resolved',

  // Data events
  DATA_CREATED: 'data:created',
  DATA_UPDATED: 'data:updated',
  DATA_DELETED: 'data:deleted',
  DATA_EXPORT: 'data:export'
};
```

### Step 3: Implement Publisher

```javascript
class MessagePublisher {
  constructor() {
    this.subscribers = new Map();
    this.queues = new Map();
  }

  subscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic).push(callback);
  }

  publish(topic, message) {
    const callbacks = this.subscribers.get(topic) || [];
    callbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error(`Error in subscriber for topic ${topic}:`, error);
      }
    });
  }

  publishToQueue(queueName, message) {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }
    this.queues.get(queueName).push(message);
  }
}
```

### Step 4: Implement Subscriber

```javascript
class MessageSubscriber {
  constructor(publisher) {
    this.publisher = publisher;
  }

  subscribe(topic, callback) {
    this.publisher.subscribe(topic, callback);
  }

  async request(message) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      // Implement request-response logic
      // ...
    });
  }
}
```

---

## Examples

### Example 1: Request-Response

```javascript
// Sender
const request = new Message(
  'Agent-001',
  'Agent-002',
  'query_status',
  { target: 'Agent-002' },
  'corr-001'
);

// Receiver
const response = new Message(
  'Agent-002',
  'Agent-001',
  'status_response',
  { status: 'healthy', uptime: 3600 },
  'corr-001'
);

// Serialize
const requestJson = JSON.stringify(request);
const responseJson = JSON.stringify(response);
```

### Example 2: Event-Driven

```javascript
const event = new Message(
  'Agent-001',
  '*',
  'agent:deployed',
  {
    agent_id: 'agent-001',
    version: '1.0.0',
    deployed_at: Date.now()
  }
);

console.log(JSON.stringify(event, null, 2));
```

### Example 3: Publish-Subscribe

```javascript
// Publisher
const publisher = new MessagePublisher();

publisher.subscribe('system:updates', (message) => {
  console.log('Received update:', message.payload.data);
});

const update = new Message(
  'System-Broadcast',
  '*',
  'system:update',
  {
    version: '2.0.0',
    message: 'New features available'
  }
);

publisher.publish('system:updates', update);
```

---

## Best Practices

### 1. Message Naming
- ✅ Use clear, descriptive names
- ✅ Follow naming conventions (camelCase)
- ✅ Include version if needed

### 2. Correlation IDs
- ✅ Always include in request-response
- ✅ Use UUID v4 format
- ✅ Store in audit logs

### 3. Error Handling
- ✅ Include error code and message
- ✅ Don't expose internal details
- ✅ Return consistent error format

### 4. Security
- ✅ Validate all incoming messages
- ✅ Authenticate senders
- ✅ Encrypt sensitive data
- ✅ Rate limit requests

### 5. Performance
- ✅ Use binary formats for high-throughput
- ✅ Implement message batching
- ✅ Use connection pooling
- ✅ Monitor message queues

---

## Version History

| Version | Date | Changes |
|------|------|------|
| 1.0.0 | 2026-04-10 | Initial release |

---

## Appendix

### A. Message Type Registry

```javascript
const MESSAGE_TYPES = {
  // Core types
  QUERY: 'query',
  REQUEST: 'request',
  RESPONSE: 'response',
  RESPONSE_ERROR: 'response_error',
  
  // Event types
  EVENT: 'event',
  BROADCAST: 'broadcast',
  
  // Data types
  DATA_CREATE: 'data_create',
  DATA_UPDATE: 'data_update',
  DATA_DELETE: 'data_delete',
  DATA_READ: 'data_read'
};
```

### B. Error Codes

```javascript
const ERROR_CODES = {
  // General errors
  INVALID_MESSAGE: 1000,
  AUTHENTICATION_FAILED: 1001,
  UNAUTHORIZED: 1002,
  
  // Message errors
  MISSING_FIELD: 2000,
  INVALID_FORMAT: 2001,
  INVALID_TYPE: 2002,
  
  // System errors
  RATE_LIMIT_EXCEEDED: 3000,
  QUEUE_FULL: 3001,
  TIMEOUT: 3002,
  
  // Agent errors
  AGENT_NOT_FOUND: 4000,
  AGENT_UNAVAILABLE: 4001,
  PERMISSION_DENIED: 4002,
  
  // Conflict errors
  CONFLICT_DETECTED: 5000,
  CONFLICT_RESOLUTION_FAILED: 5001
};
```

---

**Status**: Draft v1.0.0  
**Next Review**: 2026-04-15  
**Contact**: Copilot Core Team
