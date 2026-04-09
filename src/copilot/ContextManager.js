/**
 * Copilot - Context Manager
 * Created: 2026-04-10 (Week 4 Day 2)
 * Function: Intelligent context management and retrieval
 */

class ContextManager {
  constructor(options = {}) {
    // Context storage
    this.contexts = new Map(); // user_id -> context
    this.systemContext = this._initializeSystemContext();
    
    // Context cache (LRU)
    this.cache = new Map();
    this.cacheMaxSize = options.cacheMaxSize || 1000;
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
    
    // Context indexing for fast lookup
    this.indexes = {
      byUser: new Map(), // user_id -> [context_ids]
      byDomain: new Map(), // domain -> [user_ids]
      byPermission: new Map(), // permission -> [user_ids]
      byAgent: new Map() // agent_id -> [user_ids]
    };
    
    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      cacheSize: 0,
      totalRetrievals: 0
    };
    
    console.log('[ContextManager] Initialized');
    console.log('[ContextManager] Cache max size:', this.cacheMaxSize);
    console.log('[ContextManager] Cache TTL:', this.cacheTTL, 'ms');
  }

  /**
   * Initialize system context
   */
  _initializeSystemContext() {
    return {
      id: 'system',
      name: 'System Context',
      constraints: {
        maxAgentsPerUser: 100,
        maxPermissions: 50,
        allowedDomains: ['devops', 'analytics', 'monitoring', 'operations', 'general'],
        requireReviewFor: ['agent:deploy', 'agent:delete', 'permission:manage'],
        autoApprovalFor: ['agent:read', 'health:status', 'agent:health']
      },
      policies: {
        minimumPermissions: ['agent:read'],
        requireDescription: true,
        requireDomain: true,
        maxVersionLength: 20
      },
      metadata: {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        createdBy: 'system'
      }
    };
  }

  /**
   * Update user context
   * @param {Object} contextUpdate - Context update
   * @returns {Object} Update result
   */
  updateUserContext(contextUpdate) {
    const {
      userId,
      roles = [],
      permissions = [],
      preferences = {},
      recentAgents = [],
      metadata = {}
    } = contextUpdate;

    // Create or update user context
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, this._createUserContext(userId));
    }

    const userContext = this.contexts.get(userId);
    
    // Update fields
    userContext.roles = roles;
    userContext.permissions = permissions;
    userContext.preferences = { ...userContext.preferences, ...preferences };
    userContext.recentAgents = recentAgents;
    userContext.lastAccessed = new Date().toISOString();
    userContext.metadata = { ...userContext.metadata, ...metadata };

    // Update indexes
    this._updateUserIndexes(userId, userContext);

    // Clear cache
    this._invalidateCacheForUser(userId);

    console.log(`[ContextManager] ✅ Updated context for user ${userId}`);

    return {
      success: true,
      userId,
      context: userContext,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create user context
   */
  _createUserContext(userId) {
    return {
      id: userId,
      userId,
      roles: [],
      permissions: [],
      preferences: {
        autoApprove: false,
        defaultDomain: 'general',
        showSuggestions: true,
        maxSuggestions: 5
      },
      recentAgents: [],
      lastAccessed: new Date().toISOString(),
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0'
      },
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Update user indexes
   */
  _updateUserIndexes(userId, context) {
    // Update domain index
    if (context.preferences?.defaultDomain) {
      const domain = context.preferences.defaultDomain;
      if (!this.indexes.byDomain.has(domain)) {
        this.indexes.byDomain.set(domain, new Set());
      }
      this.indexes.byDomain.get(domain).add(userId);
    }

    // Update permission index
    for (const permission of context.permissions) {
      if (!this.indexes.byPermission.has(permission)) {
        this.indexes.byPermission.set(permission, new Set());
      }
      this.indexes.byPermission.get(permission).add(userId);
    }

    // Update agent index
    for (const agentId of context.recentAgents) {
      if (!this.indexes.byAgent.has(agentId)) {
        this.indexes.byAgent.set(agentId, new Set());
      }
      this.indexes.byAgent.get(agentId).add(userId);
    }

    // Update user index
    if (!this.indexes.byUser.has(userId)) {
      this.indexes.byUser.set(userId, []);
    }
    this.indexes.byUser.get(userId).push('context');
  }

  /**
   * Get context for user
   * @param {string} userId - User ID
   * @returns {Object|null} User context
   */
  getUserContext(userId) {
    const cacheKey = `user:${userId}`;
    
    // Check cache
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;

    const context = this.contexts.get(userId);
    if (!context) {
      return null;
    }

    // Add to cache
    this._addToCache(cacheKey, context);

    return context;
  }

  /**
   * Get system context
   * @returns {Object} System context
   */
  getSystemContext() {
    const cacheKey = 'system:context';
    
    // Check cache
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;

    const context = this.systemContext;

    // Add to cache
    this._addToCache(cacheKey, context);

    return context;
  }

  /**
   * Merge user and system context
   * @param {string} userId - User ID
   * @returns {Object} Merged context
   */
  getFullContext(userId) {
    const userContext = this.getUserContext(userId);
    const systemContext = this.getSystemContext();

    if (!userContext) {
      return systemContext;
    }

    return {
      user: userContext,
      system: systemContext,
      merged: {
        userId,
        roles: userContext.roles,
        permissions: userContext.permissions,
        preferences: userContext.preferences,
        constraints: systemContext.constraints,
        policies: systemContext.policies,
        metadata: {
          ...systemContext.metadata,
          userLastAccessed: userContext.lastAccessed
        }
      }
    };
  }

  /**
   * Check if user has permission
   * @param {string} userId - User ID
   * @param {string} permission - Permission to check
   * @returns {Object} Permission check result
   */
  checkPermission(userId, permission) {
    const context = this.getUserContext(userId);
    if (!context) {
      return {
        hasPermission: false,
        reason: 'User not found'
      };
    }

    // Check explicit permission
    if (context.permissions.includes(permission)) {
      return {
        hasPermission: true,
        permission,
        grantedBy: 'explicit'
      };
    }

    // Check role-based permission (simplified)
    if (context.roles.includes('admin')) {
      return {
        hasPermission: true,
        permission,
        grantedBy: 'role'
      };
    }

    return {
      hasPermission: false,
      permission,
      reason: 'Permission not granted'
    };
  }

  /**
   * Get user's effective permissions
   * @param {string} userId - User ID
   * @returns {Array} Effective permissions
   */
  getEffectivePermissions(userId) {
    const context = this.getUserContext(userId);
    if (!context) {
      return [];
    }

    const allPermissions = new Set(context.permissions);

    // Add role-based permissions (simplified)
    if (context.roles.includes('admin')) {
      allPermissions.add('system:admin');
      allPermissions.add('permission:*');
    } else if (context.roles.includes('operator')) {
      allPermissions.add('agent:deploy');
      allPermissions.add('agent:monitor');
    }

    return Array.from(allPermissions);
  }

  /**
   * Get context suggestions
   * @param {string} userId - User ID
   * @param {Object} query - Query parameters
   * @returns {Array} Suggestions
   */
  getContextSuggestions(userId, query = {}) {
    const userContext = this.getUserContext(userId);
    const suggestions = [];

    if (!userContext) {
      return [];
    }

    // Domain suggestions
    if (query.domain === undefined) {
      const domainSuggestions = this._suggestDomains(userId);
      suggestions.push(...domainSuggestions);
    }

    // Permission suggestions
    if (query.permissions === undefined || query.permissions === true) {
      const permissionSuggestions = this._suggestPermissions(userId);
      suggestions.push(...permissionSuggestions);
    }

    // Recent agent suggestions
    if (query.recentAgents !== false) {
      const agentSuggestions = this._suggestRecentAgents(userId);
      suggestions.push(...agentSuggestions);
    }

    return suggestions;
  }

  /**
   * Suggest domains based on user history
   */
  _suggestDomains(userId) {
    const userContext = this.getUserContext(userId);
    if (!userContext) return [];

    const suggestions = [];

    // Suggest default domain if set
    if (userContext.preferences?.defaultDomain) {
      suggestions.push({
        type: 'domain',
        message: `Your default domain is: ${userContext.preferences.defaultDomain}`,
        priority: 'high'
      });
    }

    // Suggest based on permissions
    const domainPermissions = {
      devops: ['agent:deploy', 'agent:monitor'],
      analytics: ['data:read', 'data:analyze'],
      monitoring: ['health:status', 'alert:trigger']
    };

    for (const [domain, permissions] of Object.entries(domainPermissions)) {
      if (userContext.permissions.some(p => permissions.includes(p))) {
        suggestions.push({
          type: 'domain',
          message: `Based on your permissions, consider domain: ${domain}`,
          priority: 'medium'
        });
        break;
      }
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Suggest permissions based on user history
   */
  _suggestPermissions(userId) {
    const userContext = this.getUserContext(userId);
    if (!userContext) return [];

    const suggestions = [];

    // Check if user has minimal permissions
    if (!userContext.permissions.includes('agent:read')) {
      suggestions.push({
        type: 'permission',
        message: 'Consider adding agent:read permission for basic access',
        priority: 'high'
      });
    }

    // Check for admin role
    if (userContext.roles.includes('admin') && !userContext.permissions.includes('system:admin')) {
      suggestions.push({
        type: 'permission',
        message: 'Admin role detected, ensure you have system:admin permission',
        priority: 'high'
      });
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Suggest recent agents
   */
  _suggestRecentAgents(userId) {
    const userContext = this.getUserContext(userId);
    if (!userContext || !userContext.recentAgents?.length) {
      return [];
    }

    const suggestions = [];

    suggestions.push({
      type: 'recent',
      message: `You recently worked with ${userContext.recentAgents.length} agents`,
      priority: 'medium',
      data: {
        recentAgents: userContext.recentAgents.slice(0, 5)
      }
    });

    return suggestions;
  }

  /**
   * Add agent to user's recent agents
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   */
  addRecentAgent(userId, agentId) {
    const userContext = this.getUserContext(userId);
    if (!userContext) {
      return { success: false, error: 'User not found' };
    }

    // Remove if already exists
    userContext.recentAgents = userContext.recentAgents.filter(a => a !== agentId);

    // Add to front
    userContext.recentAgents.unshift(agentId);

    // Limit to 20 recent agents
    if (userContext.recentAgents.length > 20) {
      userContext.recentAgents = userContext.recentAgents.slice(0, 20);
    }

    // Update index
    if (!this.indexes.byAgent.has(agentId)) {
      this.indexes.byAgent.set(agentId, new Set());
    }
    this.indexes.byAgent.get(agentId).add(userId);

    console.log(`[ContextManager] ✅ Added agent ${agentId} to user ${userId} recent agents`);

    return {
      success: true,
      userId,
      agentId,
      recentCount: userContext.recentAgents.length
    };
  }

  /**
   * Get users by domain
   * @param {string} domain - Domain name
   * @returns {Array} User IDs
   */
  getUsersByDomain(domain) {
    const userSet = this.indexes.byDomain.get(domain);
    return userSet ? Array.from(userSet) : [];
  }

  /**
   * Get users by permission
   * @param {string} permission - Permission name
   * @returns {Array} User IDs
   */
  getUsersByPermission(permission) {
    const userSet = this.indexes.byPermission.get(permission);
    return userSet ? Array.from(userSet) : [];
  }

  /**
   * Get users by agent
   * @param {string} agentId - Agent ID
   * @returns {Array} User IDs
   */
  getUsersByAgent(agentId) {
    const userSet = this.indexes.byAgent.get(agentId);
    return userSet ? Array.from(userSet) : [];
  }

  /**
   * Invalidate cache for user
   */
  _invalidateCacheForUser(userId) {
    const keysToRemove = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`user:${userId}`)) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Add to cache
   */
  _addToCache(key, data) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.cacheMaxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTTL
    });

    this.stats.cacheSize = this.cache.size;
  }

  /**
   * Get from cache
   */
  _getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const totalUsers = this.contexts.size;
    const totalRetrievals = this.stats.hits + this.stats.misses;
    const hitRate = totalRetrievals > 0 ? (this.stats.hits / totalRetrievals * 100) : 0;

    return {
      totalUsers,
      cacheSize: this.stats.cacheSize,
      totalRetrievals,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100 + '%',
      indexes: {
        byDomain: this.indexes.byDomain.size,
        byPermission: this.indexes.byPermission.size,
        byAgent: this.indexes.byAgent.size
      }
    };
  }

  /**
   * Clear all context
   */
  clearAll() {
    this.contexts.clear();
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      cacheSize: 0,
      totalRetrievals: 0
    };

    console.log('[ContextManager] ✅ All context cleared');
  }
}

module.exports = ContextManager;
