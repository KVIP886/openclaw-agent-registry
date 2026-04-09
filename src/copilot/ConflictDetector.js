/**
 * Copilot - Conflict Detector
 * Created: 2026-04-10 (Week 4 Day 4)
 * Function: Conflict detection and resolution for agent configurations
 */

class ConflictDetector {
  constructor(options = {}) {
    // Conflict detection rules
    this.rules = this._initializeRules();
    
    // Resolution strategies
    this.strategies = {
      new: this._resolveByNew.bind(this),
      old: this._resolveByOld.bind(this),
      merge: this._resolveByMerge.bind(this),
      custom: this._resolveByCustom.bind(this)
    };

    // Configuration
    this.config = {
      defaultStrategy: options.defaultStrategy || 'merge',
      customResolvers: new Map(),
      enableConflictTracking: options.enableConflictTracking !== false,
      logConflicts: options.logConflicts !== false
    };

    // Conflict tracking
    this.conflictLog = [];

    console.log('[ConflictDetector] Initialized');
    console.log('[ConflictDetector] Rules loaded:', Object.keys(this.rules).length);
    console.log('[ConflictDetector] Strategies:', Object.keys(this.strategies).length);
  }

  /**
   * Initialize conflict detection rules
   */
  _initializeRules() {
    return {
      // ID conflict
      id: {
        id: 'id_conflict',
        name: 'ID Conflict',
        description: 'Two agents have the same ID',
        severity: 'high',
        priority: 1
      },

      // Name conflict
      name: {
        id: 'name_conflict',
        name: 'Name Conflict',
        description: 'Two agents have the same name',
        severity: 'medium',
        priority: 2
      },

      // Permission conflict
        permission: {
        id: 'permission_conflict',
        name: 'Permission Conflict',
        description: 'Agents have conflicting permissions',
        severity: 'high',
        priority: 3
      },

      // Domain conflict
      domain: {
        id: 'domain_conflict',
        name: 'Domain Conflict',
        description: 'Agents assigned to conflicting domains',
        severity: 'medium',
        priority: 4
      },

      // Version conflict
      version: {
        id: 'version_conflict',
        name: 'Version Conflict',
        description: 'Version sequence issue',
        severity: 'low',
        priority: 5
      },

      // Service conflict
      service: {
        id: 'service_conflict',
        name: 'Service Conflict',
        description: 'Agents have conflicting services',
        severity: 'medium',
        priority: 6
      },

      // Metadata conflict
      metadata: {
        id: 'metadata_conflict',
        name: 'Metadata Conflict',
        description: 'Conflicting metadata fields',
        severity: 'low',
        priority: 7
      }
    };
  }

  /**
   * Detect conflicts between two configurations
   * @param {Object} config1 - First configuration
   * @param {Object} config2 - Second configuration
   * @param {Object} options - Detection options
   * @returns {Object} Detection result
   */
  detect(config1, config2, options = {}) {
    const startTime = Date.now();

    if (!config1 || !config2) {
      return {
        success: false,
        error: 'Invalid configurations',
        conflicts: [],
        detectionTime: Date.now() - startTime
      };
    }

    const conflicts = [];

    // Check each rule
    for (const [ruleId, rule] of Object.entries(this.rules)) {
      const conflict = this._checkConflict(ruleId, config1, config2);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    // Sort conflicts by priority
    conflicts.sort((a, b) => a.priority - b.priority);

    // Calculate severity
    const severity = this._calculateSeverity(conflicts);

    // Log conflict
    if (this.config.enableConflictTracking) {
      this._logConflict(config1, config2, conflicts);
    }

    const result = {
      success: true,
      hasConflicts: conflicts.length > 0,
      conflicts,
      severity,
      detectionTime: Date.now() - startTime
    };

    console.log(`[ConflictDetector] ${result.hasConflicts ? '❌ Detected' : '✅ No'} conflicts in ${result.detectionTime}ms`);

    return result;
  }

  /**
   * Check specific conflict type
   */
  _checkConflict(ruleId, config1, config2) {
    const rule = this.rules[ruleId];
    if (!rule) {
      return null;
    }

    let conflict = null;

    switch (ruleId) {
      case 'id':
        conflict = this._checkIDConflict(config1, config2, rule);
        break;
      case 'name':
        conflict = this._checkNameConflict(config1, config2, rule);
        break;
      case 'permission':
        conflict = this._checkPermissionConflict(config1, config2, rule);
        break;
      case 'domain':
        conflict = this._checkDomainConflict(config1, config2, rule);
        break;
      case 'version':
        conflict = this._checkVersionConflict(config1, config2, rule);
        break;
      case 'service':
        conflict = this._checkServiceConflict(config1, config2, rule);
        break;
      case 'metadata':
        conflict = this._checkMetadataConflict(config1, config2, rule);
        break;
    }

    return conflict;
  }

  /**
   * Check ID conflict
   */
  _checkIDConflict(config1, config2, rule) {
    if (config1.id === config2.id) {
      return {
        ...rule,
        type: 'id',
        field: 'id',
        values: { config1: config1.id, config2: config2.id },
        message: `ID conflict: "${config1.id}" is used by both agents`,
        resolutionOptions: ['keep-new', 'keep-old', 'rename-new', 'rename-old']
      };
    }
    return null;
  }

  /**
   * Check name conflict
   */
  _checkNameConflict(config1, config2, rule) {
    if (config1.name === config2.name && config1.id !== config2.id) {
      return {
        ...rule,
        type: 'name',
        field: 'name',
        values: { config1: config1.name, config2: config2.name },
        message: `Name conflict: "${config1.name}" is used by multiple agents`,
        resolutionOptions: ['keep-new', 'keep-old', 'rename-new', 'rename-old']
      };
    }
    return null;
  }

  /**
   * Check permission conflict
   */
  _checkPermissionConflict(config1, config2, rule) {
    const perms1 = config1.permissions || [];
    const perms2 = config2.permissions || [];

    if (perms1.length === 0 && perms2.length > 0) {
      // One has no permissions, other does
      return {
        ...rule,
        type: 'permission',
        field: 'permissions',
        values: { config1: perms1, config2: perms2 },
        message: `Agent with no permissions conflicts with agent having permissions`,
        resolutionOptions: ['keep-new', 'keep-old', 'merge']
      };
    }

    if (perms1.length > 0 && perms2.length === 0) {
      return {
        ...rule,
        type: 'permission',
        field: 'permissions',
        values: { config1: perms1, config2: perms2 },
        message: `Agent with permissions conflicts with agent having no permissions`,
        resolutionOptions: ['keep-new', 'keep-old', 'merge']
      };
    }

    // Check for conflicting permissions
    const allPerms1 = new Set(perms1);
    const allPerms2 = new Set(perms2);

    for (const perm of allPerms1) {
      // Check if this permission exists in the other config
      if (allPerms2.has(perm)) {
        // This is the same permission, not a conflict
        continue;
      }
    }

    return null;
  }

  /**
   * Check domain conflict
   */
  _checkDomainConflict(config1, config2, rule) {
    // Check if domains are mutually exclusive
    const validDomains = ['devops', 'analytics', 'monitoring', 'operations', 'general'];
    
    if ((config1.domain && !validDomains.includes(config1.domain)) ||
        (config2.domain && !validDomains.includes(config2.domain))) {
      return {
        ...rule,
        type: 'domain',
        field: 'domain',
        values: { 
          config1: config1.domain, 
          config2: config2.domain 
        },
        message: `Invalid domain detected: ${config1.domain || config2.domain}`,
        resolutionOptions: ['keep-new', 'keep-old', 'set-default']
      };
    }

    return null;
  }

  /**
   * Check version conflict
   */
  _checkVersionConflict(config1, config2, rule) {
    const version1 = config1.version;
    const version2 = config2.version;

    if (!version1 || !version2) {
      return null;
    }

    // Check version ordering (assuming config1 is older)
    const parts1 = version1.split('.').map(Number);
    const parts2 = version2.split('.').map(Number);

    // Should be monotonically increasing
    if (parts2[0] < parts1[0] ||
        (parts2[0] === parts1[0] && parts2[1] < parts1[1]) ||
        (parts2[0] === parts1[0] && parts2[1] === parts1[1] && parts2[2] <= parts1[2])) {
      return {
        ...rule,
        type: 'version',
        field: 'version',
        values: { config1: version1, config2: version2 },
        message: `Version sequence issue: ${version1} > ${version2}`,
        resolutionOptions: ['reject-new', 'force-new', 'merge']
      };
    }

    return null;
  }

  /**
   * Check service conflict
   */
  _checkServiceConflict(config1, config2, rule) {
    const services1 = config1.services || [];
    const services2 = config2.services || [];

    // Check if services are mutually exclusive
    const exclusiveServices = {
      'github-review': ['github-deploy'],
      'deployment': ['testing'],
      'monitoring': ['development'],
      'analytics': ['development']
    };

    for (const service1 of services1) {
      for (const service2 of services2) {
        const exclusions = exclusiveServices[service1];
        if (exclusions && exclusions.includes(service2)) {
          return {
            ...rule,
            type: 'service',
            field: 'services',
            values: { config1: service1, config2: service2 },
            message: `Conflicting services: ${service1} and ${service2}`,
            resolutionOptions: ['keep-new', 'keep-old', 'select']
          };
        }
      }
    }

    return null;
  }

  /**
   * Check metadata conflict
   */
  _checkMetadataConflict(config1, config2, rule) {
    const meta1 = config1.metadata || {};
    const meta2 = config2.metadata || {};

    for (const key of Object.keys(meta1)) {
      if (meta2[key] !== undefined && meta1[key] !== meta2[key]) {
        return {
          ...rule,
          type: 'metadata',
          field: `metadata.${key}`,
          values: { config1: meta1[key], config2: meta2[key] },
          message: `Conflicting metadata: ${key}`,
          resolutionOptions: ['keep-new', 'keep-old', 'custom']
        };
      }
    }

    return null;
  }

  /**
   * Calculate overall severity
   */
  _calculateSeverity(conflicts) {
    if (conflicts.length === 0) {
      return { level: 'none', score: 0 };
    }

    let totalScore = 0;
    const severityWeights = {
      critical: 10,
      high: 8,
      medium: 5,
      low: 2
    };

    for (const conflict of conflicts) {
      totalScore += severityWeights[conflict.severity] || 0;
    }

    // Determine overall level
    let level = 'none';
    if (totalScore >= 20) {
      level = 'critical';
    } else if (totalScore >= 10) {
      level = 'high';
    } else if (totalScore >= 5) {
      level = 'medium';
    } else if (totalScore > 0) {
      level = 'low';
    }

    return { level, score: totalScore };
  }

  /**
   * Resolve a conflict
   * @param {Object} conflict - Conflict object
   * @param {string} strategy - Resolution strategy
   * @param {Object} customResolver - Custom resolver function
   * @returns {Object} Resolution result
   */
  resolve(conflict, strategy = this.config.defaultStrategy, customResolver = null) {
    if (!this.strategies[strategy]) {
      if (this.config.customResolvers.has(strategy)) {
        return this.strategies.custom(conflict, this.config.customResolvers.get(strategy));
      }
      return {
        success: false,
        error: `Unknown strategy: ${strategy}`,
        conflict
      };
    }

    try {
      const result = this.strategies[strategy](conflict);
      return {
        success: true,
        conflict,
        strategy,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        conflict,
        strategy
      };
    }
  }

  /**
   * Resolve by keeping new configuration
   */
  _resolveByNew(conflict) {
    return {
      decision: 'keep-new',
      message: `Keeping new configuration for ${conflict.field}`,
      recommendedField: 'new',
      conflict
    };
  }

  /**
   * Resolve by keeping old configuration
   */
  _resolveByOld(conflict) {
    return {
      decision: 'keep-old',
      message: `Keeping old configuration for ${conflict.field}`,
      recommendedField: 'old',
      conflict
    };
  }

  /**
   * Resolve by merging configurations
   */
  _resolveByMerge(conflict) {
    const merged = {
      decision: 'merge',
      message: `Merging configurations for ${conflict.field}`,
      recommendedField: 'merged'
    };

    // Handle permission merge
    if (conflict.type === 'permission') {
      const perms1 = conflict.values.config1 || [];
      const perms2 = conflict.values.config2 || [];
      merged.recommendedField = Array.from(new Set([...perms1, ...perms2]));
    }

    return merged;
  }

  /**
   * Resolve by custom resolver
   */
  _resolveByCustom(conflict, customResolver) {
    if (!customResolver) {
      return this._resolveByMerge(conflict);
    }

    return customResolver(conflict);
  }

  /**
   * Auto-resolve all conflicts
   * @param {Object[]} conflicts - List of conflicts
   * @param {string} defaultStrategy - Default strategy
   * @returns {Object} Resolution result
   */
  autoResolve(conflicts, defaultStrategy = 'merge') {
    const results = [];
    const unresolved = [];

    for (const conflict of conflicts) {
      const resolution = this.resolve(conflict, defaultStrategy);
      if (resolution.success) {
        results.push(resolution);
      } else {
        unresolved.push(conflict);
      }
    }

    return {
      success: unresolved.length === 0,
      results,
      unresolved: unresolved.length > 0,
      count: results.length,
      unresolvedCount: unresolved.length
    };
  }

  /**
   * Log conflict
   */
  _logConflict(config1, config2, conflicts) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      config1: { id: config1.id, name: config1.name },
      config2: { id: config2.id, name: config2.name },
      conflicts: conflicts.map(c => ({
        type: c.type,
        severity: c.severity,
        message: c.message
      }))
    };

    this.conflictLog.push(logEntry);

    // Limit log size
    if (this.conflictLog.length > 1000) {
      this.conflictLog.shift();
    }

    if (this.config.logConflicts) {
      console.log(`[ConflictDetector] Logged ${conflicts.length} conflicts`, logEntry);
    }
  }

  /**
   * Get conflict statistics
   */
  getStats() {
    return {
      totalConflicts: this.conflictLog.length,
      conflictsByType: this._countByType(),
      conflictsBySeverity: this._countBySeverity(),
      lastConflicts: this.conflictLog.slice(-10)
    };
  }

  /**
   * Count conflicts by type
   */
  _countByType() {
    const counts = {};
    for (const entry of this.conflictLog) {
      for (const conflict of entry.conflicts) {
        counts[conflict.type] = (counts[conflict.type] || 0) + 1;
      }
    }
    return counts;
  }

  /**
   * Count conflicts by severity
   */
  _countBySeverity() {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const entry of this.conflictLog) {
      for (const conflict of entry.conflicts) {
        counts[conflict.severity] = (counts[conflict.severity] || 0) + 1;
      }
    }
    return counts;
  }

  /**
   * Add custom resolver
   * @param {string} name - Resolver name
   * @param {Function} resolver - Resolver function
   */
  addCustomResolver(name, resolver) {
    this.config.customResolvers.set(name, resolver);
    console.log(`[ConflictDetector] ✅ Added custom resolver: ${name}`);
  }

  /**
   * Clear conflict log
   */
  clearLog() {
    this.conflictLog = [];
    console.log('[ConflictDetector] ✅ Conflict log cleared');
  }
}

module.exports = ConflictDetector;
