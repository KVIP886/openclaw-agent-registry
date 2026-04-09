/**
 * Copilot Core - AI-Powered Natural Language Interface
 * Created: 2026-04-10 (Week 4 Day 1)
 * Function: Core Copilot engine for natural language agent management
 */

const NLPParser = require('./NLPParser');
const NLTranslator = require('./NLTranslator');

class CopilotCore {
  constructor(options = {}) {
    this.parser = new NLPParser();
    this.translator = new NLTranslator();
    
    // Configuration
    this.config = {
      autoGenerateId: options.autoGenerateId !== false,
      validateOutput: options.validateOutput !== false,
      confidenceThreshold: options.confidenceThreshold || 0.6,
      maxSuggestions: options.maxSuggestions || 5
    };

    console.log('[CopilotCore] Initialized');
    console.log('[CopilotCore] Auto-ID generation:', this.config.autoGenerateId);
    console.log('[CopilotCore] Confidence threshold:', this.config.confidenceThreshold);
  }

  /**
   * Process natural language input
   * @param {string} input - Natural language input
   * @param {Object} context - Context information
   * @returns {Object} Processed result
   */
  process(input, context = {}) {
    const startTime = Date.now();

    // Validate input
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return {
        success: false,
        error: 'Invalid input: empty or missing',
        processingTime: Date.now() - startTime
      };
    }

    // Translate the input
    const translation = this.translator.translate(input, context);

    if (!translation.success) {
      return {
        success: false,
        error: translation.error || 'Translation failed',
        errors: translation.errors,
        suggestions: translation.suggestions,
        processingTime: Date.now() - startTime
      };
    }

    // Check confidence threshold
    if (translation.confidence < this.config.confidenceThreshold) {
      return {
        success: false,
        confidence: translation.confidence,
        threshold: this.config.confidenceThreshold,
        warning: 'Confidence below threshold. Please provide more details.',
        parsing: translation.parsing,
        translation: translation,
        processingTime: Date.now() - startTime
      };
    }

    // Generate final result
    const result = {
      success: true,
      processingTime: Date.now() - startTime,
      parsing: translation.parsing,
      translation: translation,
      suggestions: this._generateSuggestions(translation, context),
      recommendations: this._generateRecommendations(translation, context)
    };

    // Add confidence to result
    result.confidence = translation.confidence;

    return result;
  }

  /**
   * Generate suggestions based on translation
   */
  _generateSuggestions(translation, context) {
    const suggestions = [];
    const { parsing, translation: translated } = translation;

    // Add missing field suggestions
    if (translated.missingFields && translated.missingFields.length > 0) {
      for (const field of translated.missingFields) {
        suggestions.push(`What ${field.toLowerCase()} should this ${parsing.entities.domain || 'agent'} have?`);
      }
    }

    // Add clarification suggestions
    if (parsed.suggestions && parsed.suggestions.length > 0) {
      suggestions.push(...parsed.suggestions.slice(0, this.config.maxSuggestions));
    }

    // Add next step suggestions
    const nextSteps = this._getNextStepSuggestions(translation);
    suggestions.push(...nextSteps);

    return suggestions.slice(0, this.config.maxSuggestions);
  }

  /**
   * Generate recommendations based on translation
   */
  _generateRecommendations(translation, context) {
    const recommendations = [];
    const { intent, confidence, entities } = translation.parsing;

    // Domain recommendation
    if (!entities.domain && entities.services?.length > 0) {
      recommendations.push({
        type: 'domain',
        message: `Based on your services, I recommend domain: ${entities.services[0].split('_')[0] || 'general'}`,
        priority: 'medium'
      });
    }

    // Permission recommendation
    if (intent === 'CREATE' && !entities.permissions) {
      const recommendedPermissions = this._recommendPermissions(entities, context);
      if (recommendedPermissions.length > 0) {
        recommendations.push({
          type: 'permissions',
          message: `Recommended permissions: ${recommendedPermissions.join(', ')}`,
          priority: 'high',
          suggestions: recommendedPermissions
        });
      }
    }

    // Name recommendation
    if (!entities.name && entities.agentId) {
      recommendations.push({
        type: 'name',
        message: `Consider using "${entities.agentId}" as the name`,
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Get next step suggestions
   */
  _getNextStepSuggestions(translation) {
    const suggestions = [];
    const { intent, translation: translated } = translation;

    switch (intent) {
      case 'CREATE':
        if (translated.missingFields?.includes('description')) {
          suggestions.push('Describe what this agent does');
        } else if (translated.missingFields?.includes('domain')) {
          suggestions.push('Specify the agent domain');
        } else {
          suggestions.push('Review the generated configuration and confirm');
        }
        break;

      case 'READ':
        suggestions.push('Use "list all agents" to see all available agents');
        break;

      case 'UPDATE':
        suggestions.push('Review the update fields before applying');
        break;

      case 'DELETE':
        suggestions.push('Confirm that this is the correct agent to delete');
        break;
    }

    return suggestions;
  }

  /**
   * Recommend permissions based on context
   */
  _recommendPermissions(entities, context) {
    const recommendations = [];

    // Domain-based recommendations
    if (entities.domain) {
      const domainPermissions = this._getDomainPermissions(entities.domain);
      recommendations.push(...domainPermissions);
    }

    // Service-based recommendations
    if (entities.services?.length > 0) {
      for (const service of entities.services) {
        const servicePermissions = this._getServicePermissions(service);
        recommendations.push(...servicePermissions);
      }
    }

    // User role-based recommendations
    if (context.userRole) {
      const rolePermissions = this._getRolePermissions(context.userRole);
      recommendations.push(...rolePermissions);
    }

    return [...new Set(recommendations)].slice(0, 5);
  }

  /**
   * Get domain-specific permissions
   */
  _getDomainPermissions(domain) {
    const domainPermissions = {
      devops: ['agent:deploy', 'agent:monitor', 'code:analyze'],
      analytics: ['data:read', 'data:analyze', 'report:generate'],
      monitoring: ['health:status', 'alert:trigger', 'notification:send'],
      operations: ['agent:restart', 'agent:deploy', 'system:admin'],
      general: ['agent:read', 'agent:health']
    };

    return domainPermissions[domain] || domainPermissions.general;
  }

  /**
   * Get service-specific permissions
   */
  _getServicePermissions(service) {
    const servicePermissions = {
      'github-review': ['github:read', 'github:review', 'code:analyze'],
      'deployment': ['agent:deploy', 'agent:undeploy', 'system:admin'],
      'monitoring': ['health:status', 'agent:health', 'agent:logs'],
      'notification': ['notification:send', 'alert:trigger'],
      'data-analysis': ['data:read', 'data:analyze']
    };

    return servicePermissions[service] || [];
  }

  /**
   * Get role-based permissions
   */
  _getRolePermissions(role) {
    const rolePermissions = {
      admin: ['system:admin', 'agent:*', 'permission:*', 'config:*'],
      operator: ['agent:read', 'agent:deploy', 'agent:monitor'],
      developer: ['agent:read', 'agent:create', 'agent:deploy', 'code:analyze'],
      observer: ['agent:read', 'health:status', 'audit:read']
    };

    return rolePermissions[role] || [];
  }

  /**
   * Process a complete agent creation flow
   * @param {string} input - Natural language input
   * @param {Object} context - Context information
   * @returns {Object} Agent creation result
   */
  createAgent(input, context = {}) {
    const result = this.process(input, context);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        processingTime: result.processingTime
      };
    }

    // Validate translation
    const translation = result.translation;
    if (!translation.missingFields || translation.missingFields.length > 0) {
      return {
        success: false,
        error: 'Missing required fields',
        missingFields: translation.missingFields,
        suggestions: result.suggestions,
        processingTime: result.processingTime
      };
    }

    // Generate final configuration
    const configuration = translation.configuration;

    return {
      success: true,
      configuration,
      confidence: result.confidence,
      suggestions: result.suggestions,
      recommendations: result.recommendations,
      processingTime: result.processingTime
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      parserStats: this.parser.getStats(),
      translatorStats: this.translator.getStats(),
      config: this.config
    };
  }

  /**
   * Generate examples
   */
  generateExamples() {
    return {
      inputs: this.translator.generateExamples(),
      descriptions: this._generateExampleDescriptions()
    };
  }

  /**
   * Generate example descriptions
   */
  _generateExampleDescriptions() {
    const examples = [
      {
        input: 'Create a GitHub review agent that analyzes code quality',
        expected: {
          action: 'CREATE',
          domain: 'devops',
          services: ['github-review', 'code-analysis'],
          permissions: ['code:analyze', 'github:review'],
          name: 'GitHub Review Agent'
        }
      },
      {
        input: 'List all agents in the monitoring domain',
        expected: {
          action: 'QUERY',
          filters: {
            domain: 'monitoring'
          }
        }
      },
      {
        input: 'Update the agent "old-bot" to version 2.0.0',
        expected: {
          action: 'UPDATE',
          filters: {
            name: 'old-bot'
          },
          updates: {
            version: '2.0.0'
          }
        }
      }
    ];

    return examples;
  }
}

module.exports = CopilotCore;
