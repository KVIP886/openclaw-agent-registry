/**
 * Copilot - Conflict Resolver
 * Created: 2026-04-10 (Week 4 Day 4)
 * Function: Intelligent conflict resolution and priority management
 */

class ConflictResolver {
  constructor(options = {}) {
    // Priority management
    this.priorities = this._initializePriorities();
    
    // Resolution strategies
    this.strategies = {
      new: this._strategyNew.bind(this),
      old: this._strategyOld.bind(this),
      merge: this._strategyMerge.bind(this),
      custom: this._strategyCustom.bind(this),
      auto: this._strategyAuto.bind(this),
      user: this._strategyUser.bind(this)
    };

    // Configuration
    this.config = {
      defaultStrategy: options.defaultStrategy || 'auto',
      autoResolve: options.autoResolve !== false,
      requireConfirmation: options.requireConfirmation !== false,
      priorityEnabled: options.priorityEnabled !== false,
      customResolvers: new Map()
    };

    // Resolution history
    this.resolutionHistory = [];

    console.log('[ConflictResolver] Initialized');
    console.log('[ConflictResolver] Strategies:', Object.keys(this.strategies).length);
    console.log('[ConflictResolver] Priorities:', Object.keys(this.priorities).length);
  }

  /**
   * Initialize priority definitions
   */
  _initializePriorities() {
    return {
      // User-based priorities
      'user:admin': {
        name: 'Admin User',
        priority: 100,
        canOverride: true,
        groups: ['admin', 'administrator']
      },
      'user:developer': {
        name: 'Developer',
        priority: 70,
        canOverride: true,
        groups: ['developer', 'dev']
      },
      'user:operator': {
        name: 'Operator',
        priority: 50,
        canOverride: false,
        groups: ['operator', 'ops']
      },
      'user:viewer': {
        name: 'Viewer',
        priority: 20,
        canOverride: false,
        groups: ['viewer', 'guest']
      },

      // Action-based priorities
      'action:deploy': {
        name: 'Deployment',
        priority: 90,
        canOverride: true,
        actions: ['agent:deploy', 'agent:undeploy']
      },
      'action:delete': {
        name: 'Deletion',
        priority: 100,
        canOverride: true,
        actions: ['agent:delete', 'agent:remove']
      },
      'action:update': {
        name: 'Update',
        priority: 80,
        canOverride: true,
        actions: ['agent:update', 'agent:modify']
      },
      'action:create': {
        name: 'Creation',
        priority: 60,
        canOverride: false,
        actions: ['agent:create', 'agent:add']
      },
      'action:read': {
        name: 'Read',
        priority: 10,
        canOverride: false,
        actions: ['agent:read', 'agent:view']
      },

      // Domain-based priorities
      'domain:security': {
        name: 'Security Domain',
        priority: 95,
        canOverride: true,
        domains: ['security', 'compliance']
      },
      'domain:devops': {
        name: 'DevOps Domain',
        priority: 80,
        canOverride: true,
        domains: ['devops', 'operations']
      },
      'domain:monitoring': {
        name: 'Monitoring Domain',
        priority: 75,
        canOverride: false,
        domains: ['monitoring', 'alerts']
      },
      'domain:analytics': {
        name: 'Analytics Domain',
        priority: 60,
        canOverride: false,
        domains: ['analytics', 'data']
      },
      'domain:general': {
        name: 'General Domain',
        priority: 30,
        canOverride: false,
        domains: ['general']
      },

      // Status-based priorities
      'status:production': {
        name: 'Production Status',
        priority: 95,
        canOverride: true,
        statuses: ['production', 'live', 'active']
      },
      'status:staging': {
        name: 'Staging Status',
        priority: 70,
        canOverride: false,
        statuses: ['staging', 'test', 'develop']
      },
      'status:testing': {
        name: 'Testing Status',
        priority: 50,
        canOverride: false,
        statuses: ['testing', 'qa']
      },
      'status:draft': {
        name: 'Draft Status',
        priority: 10,
        canOverride: false,
        statuses: ['draft', 'in-progress']
      }
    };
  }

  /**
   * Resolve conflicts with priority awareness
   * @param {Object[]} conflicts - List of conflicts
   * @param {Object[]} configs - Configuration objects
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result
   */
  resolveWithPriority(conflicts, configs, options = {}) {
    const startTime = Date.now();

    if (!conflicts || conflicts.length === 0) {
      return {
        success: true,
        resolved: [],
        unresolved: [],
        resolutionTime: Date.now() - startTime
      };
    }

    const results = [];
    const unresolved = [];

    for (const conflict of conflicts) {
      const result = this._resolveWithPriority(conflict, configs, options);
      if (result.success) {
        results.push(result);
      } else {
        unresolved.push({ conflict, ...result });
      }
    }

    const resolutionTime = Date.now() - startTime;

    console.log(`[ConflictResolver] Resolved ${results.length} conflicts in ${resolutionTime}ms`);

    return {
      success: unresolved.length === 0,
      resolved: results,
      unresolved: unresolved.length > 0,
      resolutionTime,
      count: results.length,
      unresolvedCount: unresolved.length,
      conflicts,
      stats: this._calculateStats(results, unresolved)
    };
  }

  /**
   * Resolve single conflict with priority
   */
  _resolveWithPriority(conflict, configs, options) {
    // Determine priority for each config
    const priority1 = this._calculatePriority(configs.config1, options.context1);
    const priority2 = this._calculatePriority(configs.config2, options.context2);

    console.log(`[ConflictResolver] Conflict ${conflict.type}: Priority ${priority1.level} vs ${priority2.level}`);

    // If priorities are equal, use strategy
    if (priority1.level === priority2.level) {
      return this._resolveByStrategy(conflict, options.strategy);
    }

    // Higher priority wins
    const winner = priority1.level > priority2.level ? 'config1' : 'config2';
    const loser = winner === 'config1' ? 'config2' : 'config1';

    console.log(`[ConflictResolver] Winner: ${winner} (priority ${priority1.level} > ${priority2.level})`);

    return {
      success: true,
      conflict,
      winner,
      loser,
      priority: {
        [winner]: priority1,
        [loser]: priority2
      },
      decision: `Priority ${priority1.level} > ${priority2.level} - ${winner} wins`,
      resolutionTime: Date.now() - startTime
    };
  }

  /**
   * Calculate priority for a configuration
   */
  _calculatePriority(config, context = {}) {
    let basePriority = 0;
    let factors = [];

    // User-based priority
    if (context.userGroup) {
      const userPriority = this._getUserPriority(context.userGroup);
      basePriority += userPriority;
      factors.push(`user:${context.userGroup} (+${userPriority})`);
    }

    // Action-based priority
    if (context.action) {
      const actionPriority = this._getActionPriority(context.action);
      basePriority += actionPriority;
      factors.push(`action:${context.action} (+${actionPriority})`);
    }

    // Domain-based priority
    if (config.domain) {
      const domainPriority = this._getDomainPriority(config.domain);
      basePriority += domainPriority;
      factors.push(`domain:${config.domain} (+${domainPriority})`);
    }

    // Status-based priority
    if (config.status) {
      const statusPriority = this._getStatusPriority(config.status);
      basePriority += statusPriority;
      factors.push(`status:${config.status} (+${statusPriority})`);
    }

    // Determine level
    let level = 'low';
    if (basePriority >= 80) {
      level = 'critical';
    } else if (basePriority >= 60) {
      level = 'high';
    } else if (basePriority >= 30) {
      level = 'medium';
    }

    return {
      level,
      score: basePriority,
      factors: factors.join(', ')
    };
  }

  /**
   * Get user priority
   */
  _getUserPriority(userGroup) {
    const user = this.priorities[`user:${userGroup}`];
    return user ? user.priority : 0;
  }

  /**
   * Get action priority
   */
  _getActionPriority(action) {
    const actionPrio = this.priorities[`action:${action}`];
    return actionPrio ? actionPrio.priority : 0;
  }

  /**
   * Get domain priority
   */
  _getDomainPriority(domain) {
    const domainPrio = Object.keys(this.priorities)
      .filter(k => k.startsWith('domain:'))
      .find(key => this.priorities[key].domains.includes(domain));

    if (domainPrio) {
      return this.priorities[domainPrio].priority;
    }

    // Default for known domains
    const defaultPriorities = {
      security: 95,
      compliance: 95,
      devops: 80,
      operations: 80,
      monitoring: 75,
      analytics: 60,
      general: 30
    };

    return defaultPriorities[domain] || 0;
  }

  /**
   * Get status priority
   */
  _getStatusPriority(status) {
    const statusPrio = Object.keys(this.priorities)
      .filter(k => k.startsWith('status:'))
      .find(key => this.priorities[key].statuses.includes(status));

    if (statusPrio) {
      return this.priorities[statusPrio].priority;
    }

    // Default for known statuses
    const defaultPriorities = {
      production: 95,
      live: 95,
      active: 95,
      staging: 70,
      test: 70,
      develop: 70,
      testing: 50,
      qa: 50,
      draft: 10,
      'in-progress': 10
    };

    return defaultPriorities[status] || 0;
  }

  /**
   * Resolve by strategy
   */
  _resolveByStrategy(conflict, strategy) {
    if (!this.strategies[strategy]) {
      return {
        success: false,
        error: `Unknown strategy: ${strategy}`,
        conflict
      };
    }

    try {
      return this.strategies[strategy](conflict);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        conflict
      };
    }
  }

  /**
   * Strategy: Keep new configuration
   */
  _strategyNew(conflict) {
    return {
      success: true,
      conflict,
      decision: 'keep-new',
      message: 'Keeping new configuration',
      resolution: {
        winner: 'config2',
        loser: 'config1',
        reason: 'Strategy: new wins'
      }
    };
  }

  /**
   * Strategy: Keep old configuration
   */
  _strategyOld(conflict) {
    return {
      success: true,
      conflict,
      decision: 'keep-old',
      message: 'Keeping old configuration',
      resolution: {
        winner: 'config1',
        loser: 'config2',
        reason: 'Strategy: old wins'
      }
    };
  }

  /**
   * Strategy: Merge configurations
   */
  _strategyMerge(conflict) {
    const merged = {
      success: true,
      conflict,
      decision: 'merge',
      message: 'Merging configurations',
      resolution: {}
    };

    // Handle permission merge
    if (conflict.type === 'permission') {
      const perms1 = conflict.values.config1 || [];
      const perms2 = conflict.values.config2 || [];
      merged.resolution = {
        winner: 'merged',
        mergedPerms: Array.from(new Set([...perms1, ...perms2]))
      };
    }

    // Handle version merge
    if (conflict.type === 'version') {
      const version1 = conflict.values.config1;
      const version2 = conflict.values.config2;
      const parts1 = version1.split('.').map(Number);
      const parts2 = version2.split('.').map(Number);

      // Higher version wins
      const newerVersion = parts2[0] > parts1[0] ||
        (parts2[0] === parts1[0] && parts2[1] > parts1[1]) ||
        (parts2[0] === parts1[0] && parts2[1] === parts1[1] && parts2[2] > parts1[2])
        ? version2 : version1;

      merged.resolution = {
        winner: 'higher-version',
        version: newerVersion
      };
    }

    return merged;
  }

  /**
   * Strategy: Custom resolver
   */
  _strategyCustom(conflict) {
    const customResolver = this.config.customResolvers.get('default');
    if (!customResolver) {
      return this._strategyMerge(conflict);
    }

    const result = customResolver(conflict);
    return {
      success: true,
      conflict,
      decision: 'custom',
      resolution: result
    };
  }

  /**
   * Strategy: Auto-resolve based on heuristics
   */
  _strategyAuto(conflict) {
    // Check for critical conflicts (ID, permission)
    if (conflict.severity === 'high') {
      if (conflict.type === 'permission') {
        return this._strategyMerge(conflict);
      }
      if (conflict.type === 'version') {
        return this._strategyNew(conflict);
      }
    }

    // Medium conflicts: merge if possible
    if (conflict.severity === 'medium') {
      if (conflict.type === 'name') {
        return this._strategyNew(conflict);
      }
      if (conflict.type === 'service') {
        return this._strategyMerge(conflict);
      }
    }

    // Low conflicts: keep new
    return this._strategyNew(conflict);
  }

  /**
   * Strategy: User selection
   */
  _strategyUser(conflict) {
    return {
      success: true,
      conflict,
      decision: 'user-pending',
      message: 'Waiting for user decision',
      resolution: {
        requiresHumanInput: true,
        options: conflict.resolutionOptions
      }
    };
  }

  /**
   * Calculate resolution statistics
   */
  _calculateStats(resolved, unresolved) {
    const byDecision = {};
    const byConflictType = {};

    for (const result of resolved) {
      const decision = result.decision;
      byDecision[decision] = (byDecision[decision] || 0) + 1;

      const conflictType = result.conflict.type;
      byConflictType[conflictType] = (byConflictType[conflictType] || 0) + 1;
    }

    return {
      totalResolved: resolved.length,
      totalUnresolved: unresolved.length,
      successRate: resolved.length / (resolved.length + unresolved.length),
      byDecision,
      byConflictType
    };
  }

  /**
   * Add custom resolver
   * @param {string} name - Resolver name
   * @param {Function} resolver - Resolver function
   */
  addCustomResolver(name, resolver) {
    this.config.customResolvers.set(name, resolver);
    console.log(`[ConflictResolver] ✅ Added custom resolver: ${name}`);
  }

  /**
   * Set default strategy
   */
  setDefaultStrategy(strategy) {
    if (!this.strategies[strategy]) {
      throw new Error(`Unknown strategy: ${strategy}`);
    }

    this.config.defaultStrategy = strategy;
    console.log(`[ConflictResolver] ✅ Default strategy set to: ${strategy}`);
  }

  /**
   * Get resolution history
   */
  getHistory(limit = 100) {
    return this.resolutionHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.resolutionHistory = [];
    console.log('[ConflictResolver] ✅ History cleared');
  }

  /**
   * Enable/disable auto-resolve
   */
  setAutoResolve(enabled) {
    this.config.autoResolve = enabled;
    console.log(`[ConflictResolver] ✅ Auto-resolve ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get statistics
   */
  getStats() {
    const totalResolved = this.resolutionHistory.filter(r => r.success).length;
    const totalFailed = this.resolutionHistory.filter(r => !r.success).length;

    return {
      totalResolutions: this.resolutionHistory.length,
      successCount: totalResolved,
      failureCount: totalFailed,
      successRate: this.resolutionHistory.length > 0
        ? (totalResolved / this.resolutionHistory.length * 100).toFixed(2) + '%'
        : '0.00%',
      strategies: Object.keys(this.strategies).length,
      priorities: Object.keys(this.priorities).length
    };
  }
}

module.exports = ConflictResolver;
