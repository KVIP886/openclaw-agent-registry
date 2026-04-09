/**
 * Copilot - Permission Inferencer
 * Created: 2026-04-10 (Week 4 Day 3)
 * Function: Infer permissions from description, domain, and services
 */

class PermissionInferencer {
  constructor() {
    // Permission inference rules
    this.rules = this._initializeRules();
    
    // Domain to permissions mapping
    this.domainPermissions = this._initializeDomainPermissions();
    
    // Service to permissions mapping
    this.servicePermissions = this._initializeServicePermissions();
    
    // Confidence scores for each inference rule
    this.confidenceScores = {
      high: 0.9,
      medium: 0.7,
      low: 0.5
    };

    console.log('[PermissionInferencer] Initialized');
    console.log('[PermissionInferencer] Rules loaded:', Object.keys(this.rules).length);
    console.log('[PermissionInferencer] Domain mappings:', Object.keys(this.domainPermissions).length);
  }

  /**
   * Initialize inference rules
   */
  _initializeRules() {
    return {
      // Keywords that indicate specific permissions
      github: {
        keywords: ['github', 'pull request', 'pr', 'merge', 'commit'],
        permissions: ['github:read', 'github:review', 'github:merge'],
        confidence: 'high'
      },
      codeQuality: {
        keywords: ['code quality', 'code analysis', 'code review', 'linting'],
        permissions: ['code:analyze', 'code:lint', 'code:check'],
        confidence: 'high'
      },
      deployment: {
        keywords: ['deploy', 'deployment', 'push', 'release', 'launch'],
        permissions: ['agent:deploy', 'agent:undeploy', 'system:admin'],
        confidence: 'high'
      },
      monitoring: {
        keywords: ['monitor', 'health', 'status', 'alert', 'check'],
        permissions: ['health:status', 'agent:health', 'monitoring:read'],
        confidence: 'high'
      },
      notification: {
        keywords: ['notify', 'notification', 'alert', 'send', 'message'],
        permissions: ['notification:send', 'alert:trigger', 'message:send'],
        confidence: 'high'
      },
      dataAnalysis: {
        keywords: ['data', 'analyze', 'analysis', 'report', 'metric'],
        permissions: ['data:read', 'data:analyze', 'report:generate'],
        confidence: 'medium'
      },
      audit: {
        keywords: ['audit', 'log', 'trace', 'track', 'record'],
        permissions: ['audit:read', 'audit:export', 'agent:audit'],
        confidence: 'medium'
      },
      security: {
        keywords: ['security', 'secure', 'compliance', 'permission', 'access'],
        permissions: ['permission:read', 'permission:audit', 'compliance:check'],
        confidence: 'medium'
      },
      administration: {
        keywords: ['admin', 'manage', 'configure', 'system', 'settings'],
        permissions: ['system:admin', 'config:manage', 'permission:manage'],
        confidence: 'high'
      },
      basicRead: {
        keywords: ['read', 'view', 'list', 'show', 'get'],
        permissions: ['agent:read', 'permission:read', 'config:read'],
        confidence: 'low'
      }
    };
  }

  /**
   * Initialize domain permissions
   */
  _initializeDomainPermissions() {
    return {
      devops: [
        'agent:read',
        'agent:deploy',
        'agent:monitor',
        'agent:restart',
        'code:analyze',
        'code:lint'
      ],
      monitoring: [
        'health:status',
        'health:diagnose',
        'agent:health',
        'agent:logs',
        'alert:trigger',
        'notification:send'
      ],
      analytics: [
        'data:read',
        'data:analyze',
        'report:generate',
        'metric:read'
      ],
      operations: [
        'agent:deploy',
        'agent:undeploy',
        'agent:restart',
        'system:admin',
        'config:read',
        'config:update'
      ],
      general: [
        'agent:read',
        'agent:health',
        'permission:read',
        'audit:read'
      ],
      security: [
        'audit:read',
        'audit:export',
        'permission:audit',
        'compliance:check',
        'agent:audit'
      ]
    };
  }

  /**
   * Initialize service permissions
   */
  _initializeServicePermissions() {
    return {
      'github-review': ['github:read', 'github:review', 'code:analyze'],
      'deployment': ['agent:deploy', 'agent:monitor', 'system:admin'],
      'monitoring': ['health:status', 'agent:health', 'alert:trigger'],
      'notification': ['notification:send', 'alert:trigger', 'message:send'],
      'analytics': ['data:read', 'data:analyze', 'report:generate'],
      'logging': ['audit:read', 'audit:export', 'agent:logs'],
      'testing': ['agent:test', 'code:analyze', 'code:lint'],
      'backup': ['system:backup', 'data:read', 'agent:deploy']
    };
  }

  /**
   * Infer permissions from input
   * @param {Object} input - Input data
   * @returns {Object} Inference result
   */
  infer(input) {
    const startTime = Date.now();
    
    const {
      description = '',
      domain,
      services = [],
      keywords = [],
      permissions = []
    } = input;

    // If permissions already specified, return as-is
    if (permissions && permissions.length > 0) {
      return {
        success: true,
        permissions: permissions,
        inferred: false,
        confidence: 1.0,
        reasoning: 'Permissions already specified',
        inferenceTime: Date.now() - startTime
      };
    }

    // Combine all text sources
    const textToAnalyze = [
      description,
      ...services,
      ...keywords
    ].join(' ').toLowerCase();

    // Apply inference rules
    const matches = this._applyRules(textToAnalyze);

    // Get domain-based permissions
    const domainPerms = this._getDomainPermissions(domain);

    // Get service-based permissions
    const servicePerms = this._getServicePermissions(services);

    // Combine all permissions
    const allPermissions = this._combinePermissions(
      matches.permissions,
      domainPerms,
      servicePerms
    );

    // Calculate confidence
    const confidence = this._calculateConfidence(matches, domain, services);

    // Generate reasoning
    const reasoning = this._generateReasoning(matches, domain, services, allPermissions);

    return {
      success: true,
      permissions: allPermissions,
      inferred: true,
      confidence,
      reasoning,
      matches,
      domainPermissions: domainPerms,
      servicePermissions: servicePerms,
      inferenceTime: Date.now() - startTime
    };
  }

  /**
   * Apply inference rules to text
   */
  _applyRules(text) {
    const matches = [];
    const matchedPermissions = new Set();

    for (const [ruleId, rule] of Object.entries(this.rules)) {
      // Check if any keyword matches
      const keywordsMatched = rule.keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      );

      if (keywordsMatched.length > 0) {
        // Add matched permissions
        for (const permission of rule.permissions) {
          matchedPermissions.add(permission);
        }

        // Record match
        matches.push({
          ruleId,
          confidence: this.confidenceScores[rule.confidence],
          matchedKeywords: keywordsMatched,
          permissions: rule.permissions
        });
      }
    }

    return {
      matches,
      permissions: Array.from(matchedPermissions)
    };
  }

  /**
   * Get domain-based permissions
   */
  _getDomainPermissions(domain) {
    if (!domain) return [];
    
    const permissions = this.domainPermissions[domain.toLowerCase()];
    return permissions || [];
  }

  /**
   * Get service-based permissions
   */
  _getServicePermissions(services) {
    if (!services || !Array.isArray(services)) return [];
    
    const allPermissions = new Set();
    
    for (const service of services) {
      const serviceId = service.toLowerCase();
      const permissions = this.servicePermissions[serviceId];
      if (permissions) {
        for (const perm of permissions) {
          allPermissions.add(perm);
        }
      }
    }
    
    return Array.from(allPermissions);
  }

  /**
   * Combine permissions with deduplication
   */
  _combinePermissions(...permissionArrays) {
    const allPermissions = new Set();
    
    for (const permissions of permissionArrays) {
      for (const permission of permissions) {
        allPermissions.add(permission);
      }
    }
    
    return Array.from(allPermissions);
  }

  /**
   * Calculate confidence score
   */
  _calculateConfidence(matches, domain, services) {
    if (matches.permissions.length === 0) {
      return 0.3; // Low confidence when no rules matched
    }

    // Base confidence from matches
    let baseConfidence = 0;
    for (const match of matches) {
      baseConfidence += match.confidence;
    }
    baseConfidence /= matches.length;

    // Boost for domain match
    const domainBoost = domain ? 0.1 : 0;

    // Boost for service match
    const serviceBoost = services.length > 0 ? 0.1 : 0;

    // Calculate final confidence
    const finalConfidence = Math.min(baseConfidence + domainBoost + serviceBoost, 1.0);

    return parseFloat(finalConfidence.toFixed(2));
  }

  /**
   * Generate reasoning for inference
   */
  _generateReasoning(matches, domain, services, permissions) {
    const reasoning = [];

    // Add match explanations
    for (const match of matches) {
      reasoning.push({
        type: 'rule_match',
        rule: match.ruleId,
        confidence: match.confidence,
        matchedKeywords: match.matchedKeywords,
        permissions: match.permissions
      });
    }

    // Add domain explanation
    if (domain) {
      const domainPerms = this._getDomainPermissions(domain);
      if (domainPerms.length > 0) {
        reasoning.push({
          type: 'domain_inference',
          domain,
          permissions: domainPerms
        });
      }
    }

    // Add service explanations
    if (services && services.length > 0) {
      for (const service of services) {
        const servicePerms = this.servicePermissions[service.toLowerCase()];
        if (servicePerms) {
          reasoning.push({
            type: 'service_inference',
            service,
            permissions: servicePerms
          });
        }
      }
    }

    // Summary
    const summary = {
      type: 'summary',
      inferredPermissions: permissions,
      totalInferred: permissions.length,
      sources: [
        matches.length > 0 ? `Rule matches (${matches.length})` : null,
        domain ? `Domain (${domain})` : null,
        services.length > 0 ? `Services (${services.length})` : null
      ].filter(Boolean)
    };

    reasoning.push(summary);

    return reasoning;
  }

  /**
   * Get recommended permissions
   * @param {Object} input - Input data
   * @returns {Object} Recommendation result
   */
  recommend(input) {
    const inference = this.infer(input);

    // Add recommendations
    const recommendations = this._generateRecommendations(inference);

    return {
      ...inference,
      recommendations
    };
  }

  /**
   * Generate recommendations
   */
  _generateRecommendations(inference) {
    const recommendations = [];
    const { permissions, domain, confidence } = inference;

    // Recommend minimum permissions
    const minPermissions = this._getMinimumPermissions(domain);
    const missingMin = minPermissions.filter(p => !permissions.includes(p));
    
    if (missingMin.length > 0) {
      recommendations.push({
        type: 'minimum',
        priority: 'high',
        message: `Consider adding minimum permissions: ${missingMin.join(', ')}`,
        permissions: missingMin
      });
    }

    // Recommend based on confidence
    if (confidence < 0.7) {
      recommendations.push({
        type: 'confidence',
        priority: 'medium',
        message: 'Low confidence in permission inference. Review and adjust if needed.',
        confidence
      });
    }

    // Recommend additional permissions based on domain
    if (domain) {
      const domainPerms = this.domainPermissions[domain];
      if (domainPerms) {
        const additional = domainPerms.filter(p => !permissions.includes(p));
        if (additional.length > 0) {
          recommendations.push({
            type: 'domain_specific',
            priority: 'low',
            message: `Additional permissions for ${domain} domain: ${additional.join(', ')}`,
            permissions: additional
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Get minimum permissions for domain
   */
  _getMinimumPermissions(domain) {
    const minPermissions = {
      devops: ['agent:read', 'agent:deploy'],
      monitoring: ['health:status', 'agent:read'],
      analytics: ['data:read', 'data:analyze'],
      operations: ['agent:read', 'system:admin'],
      general: ['agent:read'],
      security: ['audit:read', 'permission:read']
    };

    return minPermissions[domain] || minPermissions.general;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      rulesCount: Object.keys(this.rules).length,
      domainMappings: Object.keys(this.domainPermissions).length,
      serviceMappings: Object.keys(this.servicePermissions).length
    };
  }

  /**
   * Add custom inference rule
   */
  addCustomRule(rule) {
    const { id, keywords, permissions, confidence = 'medium' } = rule;

    if (!id) {
      return {
        success: false,
        error: 'Rule ID is required'
      };
    }

    if (this.rules[id]) {
      return {
        success: false,
        error: `Rule "${id}" already exists`
      };
    }

    this.rules[id] = {
      keywords,
      permissions,
      confidence
    };

    console.log(`[PermissionInferencer] ✅ Added custom rule: ${id}`);

    return {
      success: true,
      rule: { id, keywords, permissions, confidence }
    };
  }

  /**
   * Remove inference rule
   */
  removeRule(id) {
    if (!this.rules[id]) {
      return {
        success: false,
        error: `Rule "${id}" does not exist`
      };
    }

    delete this.rules[id];

    console.log(`[PermissionInferencer] ❌ Removed rule: ${id}`);

    return {
      success: true,
      removedId: id
    };
  }
}

module.exports = PermissionInferencer;
