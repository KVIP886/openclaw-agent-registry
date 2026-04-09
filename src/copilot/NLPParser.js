/**
 * Copilot Core - Natural Language Processing Engine
 * Created: 2026-04-10 (Week 4 Day 1)
 * Function: Parse natural language, extract intents and entities
 */

class NLPParser {
  constructor() {
    // Intent definitions
    this.intents = {
      CREATE: 'agent:create',
      READ: 'agent:read',
      UPDATE: 'agent:update',
      DELETE: 'agent:delete',
      DEPLOY: 'agent:deploy',
      QUERY: 'agent:query'
    };

    // Entity patterns
    this.entities = {
      agentId: /(?:agent|tool|bot)[\s:]*"?([a-zA-Z0-9_-]+)"?/i,
      name: /(?:name|title)[\s:]*"?([a-zA-Z0-9\s_-]+)"?/i,
      version: /(?:version|v)(?:[\s:]*)?([0-9]+\.[0-9]+\.[0-9]+)/i,
      domain: /(?:domain|area|field)[\s:]*"?([a-zA-Z]+)"?/i,
      permission: /(?:permission|access|capability)[\s:]*"?([a-zA-Z:]+)"?/i,
      description: /(?:describe|purpose|function|does)[\s:]*"?([^"\n]+)"?/i,
      author: /(?:author|creator|owner)[\s:]*"?([a-zA-Z0-9_-]+)"?/i
    };

    // Intent patterns
    this.intentPatterns = {
      create: [
        /create|add|register|make|build|setup/i,
        /let me create|I want to create|add a new/i
      ],
      read: [
        /get|list|find|show|view|read|query|check/i,
        /what is|can you tell me about|show me/i
      ],
      update: [
        /update|modify|change|edit|alter/i,
        /change the|modify the/i
      ],
      delete: [
        /delete|remove|drop|kill|destroy/i,
        /take away|get rid of|remove the/i
      ],
      deploy: [
        /deploy|launch|start|push|run|activate/i,
        /put into production|make live/i
      ]
    };

    console.log('[NLPParser] Initialized');
    console.log('[NLPParser] Registered patterns:', Object.keys(this.intentPatterns).length);
  }

  /**
   * Parse natural language input
   * @param {string} input - Natural language input
   * @returns {Object} Parsed result
   */
  parse(input) {
    const startTime = Date.now();
    const result = {
      input,
      intent: null,
      entities: {},
      confidence: 0,
      suggestions: [],
      parsingTime: 0
    };

    try {
      // 1. Detect intent
      const intentInfo = this._detectIntent(input);
      result.intent = intentInfo.intent;
      result.confidence = intentInfo.confidence;

      // 2. Extract entities
      const entities = this._extractEntities(input);
      result.entities = entities;

      // 3. Generate suggestions
      result.suggestions = this._generateSuggestions(result);

      // 4. Calculate parsing time
      result.parsingTime = Date.now() - startTime;

      console.log(`[NLPParser] ✅ Parsed in ${result.parsingTime}ms: ${result.intent} (${result.confidence*100}%)`);

      return result;

    } catch (error) {
      console.error('[NLPParser] Error parsing input:', error);
      return {
        input,
        error: error.message,
        intent: null,
        entities: {},
        confidence: 0
      };
    }
  }

  /**
   * Detect intent from input
   */
  _detectIntent(input) {
    let bestIntent = null;
    let maxScore = 0;

    // Check each intent pattern
    for (const [intentName, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
          const score = this._calculateIntentScore(intentName, input, pattern);
          if (score > maxScore) {
            maxScore = score;
            bestIntent = this.intents[intentName.toUpperCase()] || intentName;
          }
        }
      }
    }

    // Fallback: default to CREATE if user mentions agent creation
    if (!bestIntent && this._mentionsAgentCreation(input)) {
      bestIntent = this.intents.CREATE;
      maxScore = 0.6;
    }

    return {
      intent: bestIntent,
      confidence: maxScore
    };
  }

  /**
   * Calculate intent score
   */
  _calculateIntentScore(intentName, input, pattern) {
    let score = 0;

    // Base score for pattern match
    score += 0.5;

    // Bonus for exact keyword match
    if (input.toLowerCase().includes(intentName)) {
      score += 0.3;
    }

    // Bonus for context
    if (this._hasRelevantContext(intentName, input)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Check if input has relevant context for intent
   */
  _hasRelevantContext(intentName, input) {
    const keywords = {
      create: ['agent', 'bot', 'tool', 'service'],
      read: ['list', 'show', 'get', 'find'],
      update: ['update', 'change', 'modify'],
      delete: ['delete', 'remove', 'kill'],
      deploy: ['deploy', 'launch', 'run', 'start']
    };

    const contextWords = keywords[intentName] || [];
    const inputLower = input.toLowerCase();

    return contextWords.some(word => inputLower.includes(word));
  }

  /**
   * Check if input mentions agent creation
   */
  _mentionsAgentCreation(input) {
    const creationWords = ['agent', 'bot', 'tool', 'service', 'system', 'app'];
    const actionWords = ['create', 'add', 'make', 'build', 'setup', 'register'];

    const inputLower = input.toLowerCase();

    return creationWords.some(word => inputLower.includes(word)) &&
           actionWords.some(word => inputLower.includes(word));
  }

  /**
   * Extract entities from input
   */
  _extractEntities(input) {
    const entities = {};

    // Extract each entity type
    for (const [entityType, pattern] of Object.entries(this.entities)) {
      const match = input.match(pattern);
      if (match) {
        entities[entityType] = match[1] || match[0];
      }
    }

    // Extract service types
    const services = this._extractServices(input);
    entities.services = services;

    // Infer from description
    if (entities.description) {
      const inferred = this._inferFromDescription(entities.description);
      Object.assign(entities, inferred);
    }

    return entities;
  }

  /**
   * Extract service types
   */
  _extractServices(input) {
    const services = [];

    // Look for service-like patterns
    const servicePatterns = [
      /github.*review/i,
      /code.*quality/i,
      /deployment.*monitoring/i,
      /data.*analysis/i,
      /notification.*alert/i
    ];

    for (const pattern of servicePatterns) {
      if (input.match(pattern)) {
        // Convert to snake_case
        const service = pattern.source.replace(/\.\*/g, '_').replace(/[^a-z0-9_]/g, '');
        services.push(service);
      }
    }

    return services;
  }

  /**
   * Infer additional entities from description
   */
  _inferFromDescription(description) {
    const inferences = {};
    const descLower = description.toLowerCase();

    // Infer domain from keywords
    if (descLower.includes('github') || descLower.includes('code')) {
      inferences.domain = 'devops';
    } else if (descLower.includes('data') || descLower.includes('analysis')) {
      inferences.domain = 'analytics';
    } else if (descLower.includes('notification') || descLower.includes('alert')) {
      inferences.domain = 'monitoring';
    } else if (descLower.includes('deployment') || descLower.includes('run')) {
      inferences.domain = 'operations';
    }

    // Infer permissions from description
    if (descLower.includes('review') || descLower.includes('code')) {
      inferences.permissions = ['code:analyze', 'github:review'];
    } else if (descLower.includes('deploy')) {
      inferences.permissions = ['agent:deploy', 'agent:monitor'];
    } else if (descLower.includes('notify') || descLower.includes('alert')) {
      inferences.permissions = ['notification:send', 'alert:trigger'];
    }

    return inferences;
  }

  /**
   * Generate suggestions for incomplete input
   */
  _generateSuggestions(parsed) {
    const suggestions = [];

    // Missing name
    if (!parsed.entities.name) {
      suggestions.push('What should the agent be named?');
    }

    // Missing description
    if (!parsed.entities.description) {
      suggestions.push('What does this agent do?');
    }

    // Missing domain
    if (!parsed.entities.domain && parsed.entities.services?.length > 0) {
      suggestions.push('What domain does this agent serve?');
    }

    // Incomplete intent
    if (parsed.intent === this.intents.CREATE && parsed.confidence < 0.7) {
      suggestions.push('Can you be more specific about what you want to create?');
    }

    return suggestions;
  }

  /**
   * Generate agent configuration from parsed input
   * @param {Object} parsed - Parsed NLP result
   * @param {string} fallbackAuthor - Default author if not specified
   * @returns {Object} Agent configuration
   */
  generateAgentConfig(parsed, fallbackAuthor = 'system') {
    const { entities } = parsed;

    // Generate agent ID from name if not provided
    let agentId = entities.agentId;
    if (!agentId && entities.name) {
      agentId = entities.name.toLowerCase()
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+$/, '')
        .substring(0, 30) + '-001';
    }

    // Generate version if not provided
    const version = entities.version || '1.0.0';

    // Generate domain from services if not provided
    let domain = entities.domain;
    if (!domain && entities.services?.length > 0) {
      domain = entities.services[0].split('_')[0] || 'general';
    }
    domain = domain || 'general';

    // Generate description from name if not provided
    const description = entities.description || `Automatic agent: ${entities.name || 'unnamed'}`;

    // Generate permissions from inference
    const permissions = entities.permissions || this._generateDefaultPermissions(domain);

    // Generate name if not provided
    const name = entities.name || 'Unnamed Agent';

    return {
      id: agentId,
      name,
      version,
      domain,
      description,
      author: entities.author || fallbackAuthor,
      permissions,
      services: entities.services || [],
      status: 'testing',
      metadata: {
        createdVia: 'copilot-nlp',
        confidence: parsed.confidence,
        intent: parsed.intent
      }
    };
  }

  /**
   * Generate default permissions based on domain
   */
  _generateDefaultPermissions(domain) {
    const permissionMaps = {
      devops: ['agent:read', 'agent:deploy', 'agent:monitor', 'code:analyze'],
      analytics: ['data:read', 'data:analyze', 'report:generate'],
      monitoring: ['agent:read', 'alert:trigger', 'notification:send', 'health:status'],
      operations: ['agent:deploy', 'agent:restart', 'agent:monitor'],
      general: ['agent:read', 'agent:health']
    };

    return permissionMaps[domain] || permissionMaps.general;
  }

  /**
   * Validate parsed result
   */
  validate(parsed) {
    const errors = [];

    // Required fields
    if (!parsed.intent) {
      errors.push('No intent detected');
    }

    // Agent ID required for create/update/delete
    if ([this.intents.CREATE, this.intents.UPDATE, this.intents.DELETE].includes(parsed.intent)) {
      if (!parsed.entities.agentId && !parsed.entities.name) {
        errors.push('Agent ID or name required');
      }
    }

    // Name required for create
    if (parsed.intent === this.intents.CREATE && !parsed.entities.name) {
      errors.push('Agent name required for creation');
    }

    // Domain recommended for create
    if (parsed.intent === this.intents.CREATE && !parsed.entities.domain) {
      console.warn('[NLPParser] Domain not specified, using default');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get parser statistics
   */
  getStats() {
    return {
      registeredIntents: Object.keys(this.intents),
      registeredEntities: Object.keys(this.entities),
      intentPatterns: Object.keys(this.intentPatterns)
    };
  }
}

module.exports = NLPParser;
