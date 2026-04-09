/**
 * Copilot - Natural Language Translator
 * Created: 2026-04-10 (Week 4 Day 1)
 * Function: Convert parsed NL into structured JSON
 */

const NLPParser = require('./NLPParser');

class NLTranslator {
  constructor() {
    this.parser = new NLPParser();
    
    // Translation rules
    this.rules = {
      CREATE: this._createTranslator.bind(this),
      READ: this._readTranslator.bind(this),
      UPDATE: this._updateTranslator.bind(this),
      DELETE: this._deleteTranslator.bind(this),
      QUERY: this._queryTranslator.bind(this)
    };

    console.log('[NLTranslator] Initialized');
    console.log('[NLTranslator] Translation rules:', Object.keys(this.rules).length);
  }

  /**
   * Translate natural language to structured format
   * @param {string} input - Natural language input
   * @param {Object} context - Context information
   * @returns {Object} Translated result
   */
  translate(input, context = {}) {
    const startTime = Date.now();

    // Parse the input
    const parsed = this.parser.parse(input);
    
    // Validate parsed result
    const validation = this.parser.validate(parsed);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        suggestions: parsed.suggestions,
        translationTime: Date.now() - startTime
      };
    }

    // Find appropriate translator
    const translator = this.rules[parsed.intent];
    if (!translator) {
      return {
        success: false,
        error: `No translator for intent: ${parsed.intent}`,
        translationTime: Date.now() - startTime
      };
    }

    // Translate using appropriate translator
    const translated = translator(parsed, context);

    // Calculate translation time
    translated.translationTime = Date.now() - startTime;
    translated.parsing = parsed;

    console.log(`[NLTranslator] ✅ Translated in ${translated.translationTime}ms: ${parsed.intent}`);

    return {
      success: true,
      ...translated,
      parsingTime: parsed.parsingTime
    };
  }

  /**
   * Translate CREATE intent
   */
  _createTranslator(parsed, context) {
    const agentConfig = this.parser.generateAgentConfig(parsed, context.author);

    return {
      action: 'create',
      target: 'agent',
      configuration: agentConfig,
      confidence: parsed.confidence,
      requiredFields: this._getRequiredFields('CREATE'),
      missingFields: this._findMissingFields(agentConfig, this._getRequiredFields('CREATE'))
    };
  }

  /**
   * Translate READ intent
   */
  _readTranslator(parsed, context) {
    const agentId = parsed.entities.agentId;
    const agentName = parsed.entities.name;

    return {
      action: 'read',
      target: 'agent',
      filters: {
        id: agentId,
        name: agentName
      },
      confidence: parsed.confidence,
      suggestions: agentId 
        ? `Searching for agent ID: ${agentId}`
        : agentName
        ? `Searching for agent NAME: ${agentName}`
        : 'Please specify which agent to search for'
    };
  }

  /**
   * Translate UPDATE intent
   */
  _updateTranslator(parsed, context) {
    const agentId = parsed.entities.agentId;
    const agentName = parsed.entities.name;
    const updates = this._extractUpdates(parsed);

    return {
      action: 'update',
      target: 'agent',
      filters: {
        id: agentId,
        name: agentName
      },
      updates,
      confidence: parsed.confidence,
      validation: this._validateUpdates(updates)
    };
  }

  /**
   * Translate DELETE intent
   */
  _deleteTranslator(parsed, context) {
    const agentId = parsed.entities.agentId;
    const agentName = parsed.entities.name;

    return {
      action: 'delete',
      target: 'agent',
      filters: {
        id: agentId,
        name: agentName
      },
      confidence: parsed.confidence,
      confirmationRequired: true,
      warning: 'This action cannot be undone'
    };
  }

  /**
   * Translate QUERY intent
   */
  _queryTranslator(parsed, context) {
    const filters = this._extractQueryFilters(parsed);

    return {
      action: 'query',
      target: 'agents',
      filters,
      confidence: parsed.confidence,
      limit: context.limit || 50,
      sort: context.sort || 'created_at'
    };
  }

  /**
   * Extract update fields from parsed entities
   */
  _extractUpdates(parsed) {
    const updates = {};
    const { entities } = parsed;

    // Extract each entity that can be updated
    if (entities.name) updates.name = entities.name;
    if (entities.version) updates.version = entities.version;
    if (entities.domain) updates.domain = entities.domain;
    if (entities.description) updates.description = entities.description;
    if (entities.author) updates.author = entities.author;
    if (entities.permissions) updates.permissions = entities.permissions;
    if (entities.services) updates.services = entities.services;

    return updates;
  }

  /**
   * Extract query filters from parsed entities
   */
  _extractQueryFilters(parsed) {
    const filters = {};
    const { entities } = parsed;

    if (entities.agentId) filters.id = entities.agentId;
    if (entities.name) filters.name = entities.name;
    if (entities.domain) filters.domain = entities.domain;
    if (entities.version) filters.version = entities.version;

    return filters;
  }

  /**
   * Validate update fields
   */
  _validateUpdates(updates) {
    const errors = [];

    // Validate version format
    if (updates.version && !this._isValidVersion(updates.version)) {
      errors.push(`Invalid version format: ${updates.version}`);
    }

    // Validate permissions array
    if (updates.permissions && !Array.isArray(updates.permissions)) {
      errors.push('Permissions must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if version is valid
   */
  _isValidVersion(version) {
    return /^[0-9]+\.[0-9]+\.[0-9]+$/.test(version);
  }

  /**
   * Get required fields for action
   */
  _getRequiredFields(action) {
    const requiredFields = {
      CREATE: ['name', 'description', 'domain'],
      READ: ['agentId', 'name'],
      UPDATE: ['agentId', 'name'],
      DELETE: ['agentId', 'name'],
      QUERY: []
    };

    return requiredFields[action] || [];
  }

  /**
   * Find missing fields
   */
  _findMissingFields(config, required) {
    const missing = [];

    for (const field of required) {
      if (!config[field]) {
        missing.push(field);
      }
    }

    return missing;
  }

  /**
   * Get translator statistics
   */
  getStats() {
    return {
      translationRules: Object.keys(this.rules),
      parserStats: this.parser.getStats()
    };
  }

  /**
   * Generate example translations
   */
  generateExamples() {
    const examples = [
      {
        input: 'Create a GitHub review agent that analyzes code quality',
        description: 'Create agent with inferred permissions and domain'
      },
      {
        input: 'Get the agent named "monitor-bot"',
        description: 'Read agent by name'
      },
      {
        input: 'Update agent "old-bot" to version 2.0.0',
        description: 'Update agent version'
      },
      {
        input: 'Delete the agent "test-bot"',
        description: 'Delete agent with confirmation'
      },
      {
        input: 'List all agents in devops domain',
        description: 'Query agents by domain'
      }
    ];

    return examples;
  }
}

module.exports = NLTranslator;
