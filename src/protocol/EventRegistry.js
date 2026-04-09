/**
 * Agent Communication Protocol - Event Registry
 * Created: 2026-04-10 (Week 5 Day 2)
 * Function: Event type registry and management
 */

class EventRegistry {
  constructor() {
    this.events = new Map();
    this._initializeEvents();
  }

  _initializeEvents() {
    // Lifecycle events
    this.register('agent:created', {
      type: 'lifecycle',
      description: 'New agent created',
      requiredFields: ['agent_id', 'name', 'created_by'],
      optionalFields: ['version', 'metadata'],
      callback: null
    });

    this.register('agent:updated', {
      type: 'lifecycle',
      description: 'Agent configuration updated',
      requiredFields: ['agent_id', 'version', 'updated_by'],
      optionalFields: ['changes', 'previous_version'],
      callback: null
    });

    this.register('agent:deleted', {
      type: 'lifecycle',
      description: 'Agent removed',
      requiredFields: ['agent_id', 'deleted_by'],
      optionalFields: ['reason'],
      callback: null
    });

    this.register('agent:deployed', {
      type: 'lifecycle',
      description: 'Agent deployed to production',
      requiredFields: ['agent_id', 'version', 'deployed_at'],
      optionalFields: ['environment', 'deployed_by'],
      callback: null
    });

    this.register('agent:undeployed', {
      type: 'lifecycle',
      description: 'Agent undeployed',
      requiredFields: ['agent_id', 'undeployed_at'],
      optionalFields: ['reason', 'undeployed_by'],
      callback: null
    });

    this.register('agent:paused', {
      type: 'lifecycle',
      description: 'Agent paused',
      requiredFields: ['agent_id'],
      optionalFields: ['reason', 'paused_by'],
      callback: null
    });

    this.register('agent:resumed', {
      type: 'lifecycle',
      description: 'Agent resumed',
      requiredFields: ['agent_id'],
      optionalFields: ['resumed_by', 'previous_pause_reason'],
      callback: null
    });

    // Status events
    this.register('health:status', {
      type: 'status',
      description: 'System health check',
      requiredFields: ['timestamp', 'status'],
      optionalFields: ['uptime', 'load_average'],
      callback: null
    });

    this.register('agent:health', {
      type: 'status',
      description: 'Agent health status',
      requiredFields: ['agent_id', 'status'],
      optionalFields: ['uptime', 'last_check', 'metrics'],
      callback: null
    });

    this.register('system:health', {
      type: 'status',
      description: 'System-wide health',
      requiredFields: ['overall_status', 'timestamp'],
      optionalFields: ['components', 'load', 'memory'],
      callback: null
    });

    // Permission events
    this.register('permission:granted', {
      type: 'permission',
      description: 'Permission granted',
      requiredFields: ['agent_id', 'permission', 'granted_by'],
      optionalFields: ['granted_at', 'expires_at', 'metadata'],
      callback: null
    });

    this.register('permission:revoked', {
      type: 'permission',
      description: 'Permission revoked',
      requiredFields: ['agent_id', 'permission', 'revoked_by'],
      optionalFields: ['revoked_at', 'reason'],
      callback: null
    });

    this.register('permission:audit', {
      type: 'permission',
      description: 'Permission audit',
      requiredFields: ['agent_id', 'permissions', 'audited_by'],
      optionalFields: ['audit_timestamp', 'metadata'],
      callback: null
    });

    // Conflict events
    this.register('conflict:detected', {
      type: 'conflict',
      description: 'Conflict detected',
      requiredFields: ['conflict_id', 'type', 'agents'],
      optionalFields: ['details', 'severity', 'detected_at'],
      callback: null
    });

    this.register('conflict:resolved', {
      type: 'conflict',
      description: 'Conflict resolved',
      requiredFields: ['conflict_id', 'resolution', 'result'],
      optionalFields: ['resolved_by', 'resolved_at', 'details'],
      callback: null
    });

    // Data events
    this.register('data:created', {
      type: 'data',
      description: 'Data entry created',
      requiredFields: ['type', 'data'],
      optionalFields: ['created_at', 'created_by'],
      callback: null
    });

    this.register('data:updated', {
      type: 'data',
      description: 'Data entry updated',
      requiredFields: ['type', 'data', 'version'],
      optionalFields: ['updated_at', 'updated_by', 'changes'],
      callback: null
    });

    this.register('data:deleted', {
      type: 'data',
      description: 'Data entry deleted',
      requiredFields: ['type', 'id'],
      optionalFields: ['deleted_at', 'deleted_by', 'reason'],
      callback: null
    });

    this.register('data:export', {
      type: 'data',
      description: 'Data exported',
      requiredFields: ['type', 'format'],
      optionalFields: ['count', 'exported_at', 'exported_by'],
      callback: null
    });
  }

  register(eventType, config) {
    if (this.events.has(eventType)) {
      throw new Error(`Event ${eventType} already registered`);
    }

    this.events.set(eventType, {
      ...config,
      registeredAt: Date.now()
    });

    return true;
  }

  unregister(eventType) {
    return this.events.delete(eventType);
  }

  get(eventType) {
    return this.events.get(eventType);
  }

  getAll() {
    return Array.from(this.events.entries()).map(([event, config]) => ({
      eventType: event,
      description: config.description,
      type: config.type
    }));
  }

  registerCallback(eventType, callback) {
    const event = this.events.get(eventType);
    if (!event) {
      throw new Error(`Event ${eventType} not found`);
    }

    event.callback = callback;
    return true;
  }

  getCallback(eventType) {
    const event = this.events.get(eventType);
    return event ? event.callback : null;
  }

  validatePayload(eventType, payload) {
    const event = this.events.get(eventType);
    if (!event) {
      return {
        valid: false,
        error: `Event type ${eventType} not registered`
      };
    }

    const errors = [];
    const requiredFields = event.requiredFields || [];

    for (const field of requiredFields) {
      if (payload[field] === undefined || payload[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  getEventTypeByCategory(category) {
    const result = [];
    for (const [event, config] of this.events) {
      if (config.type === category) {
        result.push(event);
      }
    }
    return result;
  }

  getStats() {
    const stats = {
      total: this.events.size,
      byType: {
        lifecycle: 0,
        status: 0,
        permission: 0,
        conflict: 0,
        data: 0
      }
    };

    for (const event of this.events.values()) {
      if (stats.byType[event.type] !== undefined) {
        stats.byType[event.type]++;
      }
    }

    return stats;
  }
}

// Singleton instance
let registry = null;
function getRegistry() {
  if (!registry) {
    registry = new EventRegistry();
  }
  return registry;
}

module.exports = EventRegistry;
module.exports.getRegistry = getRegistry;
