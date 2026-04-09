/**
 * Agent Communication Protocol - Index
 * Exports all protocol components
 */

const Message = require('./Message');
const EventRegistry = require('./EventRegistry');
const { MessagePublisher, EventBus } = require('./MessageBroker');

// Singleton registry
let eventRegistry = null;
let eventBus = null;
let messagePublisher = null;

function getEventRegistry() {
  if (!eventRegistry) {
    eventRegistry = new EventRegistry();
  }
  return eventRegistry;
}

function getEventBus() {
  if (!eventBus) {
    eventBus = new EventBus();
    eventBus.initialize(getEventRegistry());
  }
  return eventBus;
}

function getMessagePublisher() {
  if (!messagePublisher) {
    messagePublisher = new MessagePublisher();
  }
  return messagePublisher;
}

// Event types constants
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

module.exports = {
  Message,
  EventRegistry,
  MessagePublisher,
  EventBus,
  getEventRegistry,
  getEventBus,
  getMessagePublisher,
  EVENT_TYPES
};
