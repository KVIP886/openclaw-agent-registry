/**
 * Agent Communication Protocol - Message System
 * Created: 2026-04-10 (Week 5 Day 2)
 * Function: Core message handling for inter-agent communication
 */

class Message {
  constructor(sender, receiver, type, data, correlationId = null) {
    this.header = {
      sender: sender,
      receiver: receiver,
      timestamp: Date.now(),
      correlation_id: correlationId || this._generateUUID()
    };

    this.payload = {
      type: type,
      data: data || {},
      metadata: {}
    };

    this.error = null;
    this.ack = null;
  }

  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  setMetadata(key, value) {
    this.payload.metadata[key] = value;
    return this;
  }

  setError(code, message) {
    this.error = {
      code: code,
      message: message,
      timestamp: Date.now()
    };
    return this;
  }

  setAck(status, timestamp = Date.now()) {
    this.ack = {
      status: status,
      timestamp: timestamp,
      correlation_id: this.header.correlation_id
    };
    return this;
  }

  serialize() {
    return JSON.stringify(this, null, 2);
  }

  static deserialize(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    return new Message(
      data.header.sender,
      data.header.receiver,
      data.payload.type,
      data.payload.data,
      data.header.correlation_id
    );
  }

  validate() {
    const errors = [];

    if (!this.header.sender) {
      errors.push('Missing sender');
    }
    if (!this.header.receiver) {
      errors.push('Missing receiver');
    }
    if (!this.payload.type) {
      errors.push('Missing type');
    }
    if (!this.header.correlation_id) {
      errors.push('Missing correlation_id');
    }
    if (!this.header.timestamp || typeof this.header.timestamp !== 'number') {
      errors.push('Invalid timestamp');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  getCorrelationId() {
    return this.header.correlation_id;
  }

  getSenderId() {
    return this.header.sender;
  }

  getReceiverId() {
    return this.header.receiver;
  }

  getMessageType() {
    return this.payload.type;
  }
}

// Export
module.exports = Message;
