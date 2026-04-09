/**
 * Agent Communication Protocol - Pub/Sub and Message Queue
 * Created: 2026-04-10 (Week 5 Day 2)
 * Function: Publish-subscribe system and message queue implementation
 */

const Message = require('./Message');

class MessagePublisher {
  constructor() {
    this.subscribers = new Map(); // topic -> [callbacks]
    this.queues = new Map(); // queueName -> [messages]
    this.queueConsumers = new Map(); // queueName -> callback
    this.stats = {
      published: 0,
      queued: 0,
      consumed: 0
    };
  }

  /**
   * Subscribe to a topic
   * @param {string} topic - Topic name
   * @param {Function} callback - Callback function
   */
  subscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }

    this.subscribers.get(topic).push(callback);

    // Auto-register for broadcast if it's a system topic
    if (topic === 'broadcast') {
      this.subscribe('system:updates', callback);
    }

    return true;
  }

  /**
   * Unsubscribe from a topic
   * @param {string} topic - Topic name
   * @param {Function} callback - Callback to remove
   */
  unsubscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      return false;
    }

    const callbacks = this.subscribers.get(topic);
    const index = callbacks.indexOf(callback);

    if (index !== -1) {
      callbacks.splice(index, 1);

      // Remove empty subscriptions
      if (callbacks.length === 0) {
        this.subscribers.delete(topic);
      }
    }

    return true;
  }

  /**
   * Publish a message to a topic
   * @param {string} topic - Topic name
   * @param {Object} messageOrPayload - Message object or payload
   */
  publish(topic, messageOrPayload) {
    const callbacks = this.subscribers.get(topic) || [];
    let message;

    // Handle both Message object and payload
    if (messageOrPayload instanceof Message) {
      message = messageOrPayload;
    } else if (typeof messageOrPayload === 'string') {
      message = Message.deserialize(messageOrPayload);
    } else {
      // Assume it's a payload object
      const payload = messageOrPayload;
      message = new Message(
        payload.sender || 'System',
        payload.receiver || '*',
        payload.type,
        payload.data,
        payload.correlation_id
      );
    }

    // Publish to all subscribers
    for (const callback of callbacks) {
      try {
        callback(message);
        this.stats.published++;
      } catch (error) {
        console.error(`Error in subscriber for topic ${topic}:`, error);
      }
    }

    return true;
  }

  /**
   * Publish to all topics
   * @param {Object} messageOrPayload - Message or payload
   */
  broadcast(messageOrPayload) {
    const allTopics = Array.from(this.subscribers.keys());
    const results = [];

    for (const topic of allTopics) {
      const result = this.publish(topic, messageOrPayload);
      results.push(result);
    }

    return results;
  }

  /**
   * Publish to a queue
   * @param {string} queueName - Queue name
   * @param {Object} messageOrPayload - Message or payload
   */
  publishToQueue(queueName, messageOrPayload) {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }

    let message;
    if (messageOrPayload instanceof Message) {
      message = messageOrPayload;
    } else if (typeof messageOrPayload === 'string') {
      message = Message.deserialize(messageOrPayload);
    } else {
      const payload = messageOrPayload;
      message = new Message(
        payload.sender || 'System',
        payload.receiver || '*',
        payload.type,
        payload.data,
        payload.correlation_id
      );
    }

    this.queues.get(queueName).push(message);
    this.stats.queued++;

    return true;
  }

  /**
   * Register consumer for a queue
   * @param {string} queueName - Queue name
   * @param {Function} callback - Consumer callback
   */
  registerQueueConsumer(queueName, callback) {
    if (!this.queueConsumers.has(queueName)) {
      this.queueConsumers.set(queueName, []);
    }
    this.queueConsumers.get(queueName).push(callback);

    // Start processing queue if not already running
    this._startQueueProcessor(queueName);

    return true;
  }

  /**
   * Start queue processor
   */
  _startQueueProcessor(queueName) {
    if (this.queueProcessors && this.queueProcessors.has(queueName)) {
      return; // Already running
    }

    const queue = this.queues.get(queueName);
    const consumers = this.queueConsumers.get(queueName);

    if (!queue || !consumers || queue.length === 0) {
      return;
    }

    const processQueue = async () => {
      const messages = this.queues.get(queueName);
      while (messages.length > 0 && consumers.length > 0) {
        const message = messages.shift();
        for (const consumer of consumers) {
          try {
            await consumer(message);
            this.stats.consumed++;
          } catch (error) {
            console.error(`Error processing message in queue ${queueName}:`, error);
          }
        }

        // If queue still has messages, continue processing
        if (messages.length === 0 && this.queues.has(queueName)) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        }
      }
    };

    processQueue();
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      ...this.stats,
      topics: this.subscribers.size,
      queues: this.queues.size,
      queueNames: Array.from(this.queues.keys())
    };
  }

  /**
   * Clear all subscribers
   */
  clearSubscribers() {
    this.subscribers.clear();
  }

  /**
   * Clear all queues
   */
  clearQueues() {
    for (const [queueName] of this.queues) {
      this.queues.delete(queueName);
    }
    this.stats.queued = 0;
    this.stats.consumed = 0;
  }

  /**
   * Get queue length
   */
  getQueueLength(queueName) {
    return this.queues.get(queueName)?.length || 0;
  }
}

class EventBus {
  constructor() {
    this.publisher = new MessagePublisher();
    this.registry = null; // Will be set by EventRegistry
    this.subscriptions = new Map();
  }

  initialize(registry) {
    this.registry = registry;
  }

  /**
   * Subscribe to an event type
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   */
  subscribe(eventType, callback) {
    const topic = eventType; // Use event type as topic
    this.publisher.subscribe(topic, callback);
  }

  /**
   * Publish an event
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @param {Object} metadata - Optional metadata
   */
  publish(eventType, data, metadata = {}) {
    // Validate event type
    if (this.registry) {
      const validation = this.registry.validatePayload(eventType, data);
      if (!validation.valid) {
        console.error('Invalid event payload:', validation.errors);
        return false;
      }

      // Call registered callback if exists
      const callback = this.registry.getCallback(eventType);
      if (callback) {
        callback(eventType, data);
      }
    }

    // Create message
    const message = new Message(
      'System',
      '*',
      eventType,
      data
    );

    if (metadata) {
      Object.keys(metadata).forEach(key => {
        message.setMetadata(key, metadata[key]);
      });
    }

    // Publish to subscribers
    this.publisher.publish(eventType, message);

    return true;
  }

  /**
   * Get all subscribers for an event type
   */
  getSubscribers(eventType) {
    return this.publisher.subscribers.get(eventType) || [];
  }

  /**
   * Get statistics
   */
  getStats() {
    return this.publisher.getStats();
  }
}

// Export
module.exports = {
  MessagePublisher,
  EventBus
};
