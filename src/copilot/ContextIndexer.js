/**
 * Copilot - Context Indexer
 * Created: 2026-04-10 (Week 4 Day 2)
 * Function: Fast context lookup and indexing
 */

class ContextIndexer {
  constructor() {
    // Multi-level indexes for fast lookup
    this.indexes = {
      // Primary index: userId -> contextId
      userIndex: new Map(),
      
      // Domain index: domain -> [contextIds]
      domainIndex: new Map(),
      
      // Permission index: permission -> [contextIds]
      permissionIndex: new Map(),
      
      // Role index: role -> [contextIds]
      roleIndex: new Map(),
      
      // Agent index: agentId -> [contextIds]
      agentIndex: new Map(),
      
      // Prefetch index: for frequently accessed data
      prefetchIndex: new Map()
    };

    // Index statistics
    this.stats = {
      indexOperations: 0,
      lookupHits: 0,
      lookupMisses: 0,
      totalIndexedItems: 0
    };

    console.log('[ContextIndexer] Initialized');
    console.log('[ContextIndexer] Indexes:', Object.keys(this.indexes).length);
  }

  /**
   * Index a context
   * @param {Object} context - Context object
   * @returns {Object} Indexing result
   */
  indexContext(context) {
    const startTime = Date.now();
    
    if (!context || !context.id) {
      return {
        success: false,
        error: 'Invalid context'
      };
    }

    const { id, userId, roles, permissions, preferences, recentAgents } = context;

    // Add to user index
    this.indexes.userIndex.set(userId, id);
    this.stats.indexOperations++;

    // Add to domain index
    if (preferences?.defaultDomain) {
      const domain = preferences.defaultDomain;
      if (!this.indexes.domainIndex.has(domain)) {
        this.indexes.domainIndex.set(domain, new Set());
      }
      this.indexes.domainIndex.get(domain).add(id);
      this.stats.indexOperations++;
    }

    // Add to permission index
    if (permissions && Array.isArray(permissions)) {
      for (const permission of permissions) {
        if (!this.indexes.permissionIndex.has(permission)) {
          this.indexes.permissionIndex.set(permission, new Set());
        }
        this.indexes.permissionIndex.get(permission).add(id);
        this.stats.indexOperations++;
      }
    }

    // Add to role index
    if (roles && Array.isArray(roles)) {
      for (const role of roles) {
        if (!this.indexes.roleIndex.has(role)) {
          this.indexes.roleIndex.set(role, new Set());
        }
        this.indexes.roleIndex.get(role).add(id);
        this.stats.indexOperations++;
      }
    }

    // Add to agent index
    if (recentAgents && Array.isArray(recentAgents)) {
      for (const agentId of recentAgents) {
        if (!this.indexes.agentIndex.has(agentId)) {
          this.indexes.agentIndex.set(agentId, new Set());
        }
        this.indexes.agentIndex.get(agentId).add(id);
        this.stats.indexOperations++;
      }
    }

    // Update total count
    this.stats.totalIndexedItems = this.indexes.userIndex.size;

    console.log(`[ContextIndexer] ✅ Indexed context ${id} in ${Date.now() - startTime}ms`);

    return {
      success: true,
      contextId: id,
      indexedIn: Object.keys(this.indexes).length,
      indexingTime: Date.now() - startTime
    };
  }

  /**
   * Unindex a context
   * @param {string} contextId - Context ID to remove
   * @returns {Object} Unindexing result
   */
  unindexContext(contextId) {
    const startTime = Date.now();

    // Find the context first
    let context = null;
    for (const [userId, cid] of this.indexes.userIndex.entries()) {
      if (cid === contextId) {
        context = { userId, id: contextId };
        break;
      }
    }

    if (!context) {
      return {
        success: false,
        error: 'Context not found'
      };
    }

    // Remove from all indexes
    this._removeFromAllIndexes(contextId, context);

    // Update total count
    this.stats.totalIndexedItems = this.indexes.userIndex.size;

    console.log(`[ContextIndexer] ❌ Unindexed context ${contextId} in ${Date.now() - startTime}ms`);

    return {
      success: true,
      contextId,
      unindexedIn: Object.keys(this.indexes).length,
      unindexingTime: Date.now() - startTime
    };
  }

  /**
   * Remove context from all indexes
   */
  _removeFromAllIndexes(contextId, context) {
    const { userId, id, roles, permissions, preferences, recentAgents } = context;

    // Remove from user index
    this.indexes.userIndex.delete(userId);

    // Remove from domain index
    if (preferences?.defaultDomain) {
      const domainIndex = this.indexes.domainIndex.get(preferences.defaultDomain);
      if (domainIndex) {
        domainIndex.delete(id);
        if (domainIndex.size === 0) {
          this.indexes.domainIndex.delete(preferences.defaultDomain);
        }
      }
    }

    // Remove from permission index
    if (permissions && Array.isArray(permissions)) {
      for (const permission of permissions) {
        const permIndex = this.indexes.permissionIndex.get(permission);
        if (permIndex) {
          permIndex.delete(id);
          if (permIndex.size === 0) {
            this.indexes.permissionIndex.delete(permission);
          }
        }
      }
    }

    // Remove from role index
    if (roles && Array.isArray(roles)) {
      for (const role of roles) {
        const roleIndex = this.indexes.roleIndex.get(role);
        if (roleIndex) {
          roleIndex.delete(id);
          if (roleIndex.size === 0) {
            this.indexes.roleIndex.delete(role);
          }
        }
      }
    }

    // Remove from agent index
    if (recentAgents && Array.isArray(recentAgents)) {
      for (const agentId of recentAgents) {
        const agentIndex = this.indexes.agentIndex.get(agentId);
        if (agentIndex) {
          agentIndex.delete(id);
          if (agentIndex.size === 0) {
            this.indexes.agentIndex.delete(agentId);
          }
        }
      }
    }
  }

  /**
   * Get context by userId
   * @param {string} userId - User ID
   * @returns {Object|null} Context
   */
  getByUserId(userId) {
    const contextId = this.indexes.userIndex.get(userId);
    if (!contextId) {
      this.stats.lookupMisses++;
      return null;
    }

    this.stats.lookupHits++;
    return { id: contextId, source: 'userIndex' };
  }

  /**
   * Get contexts by domain
   * @param {string} domain - Domain name
   * @returns {Array} Context IDs
   */
  getByDomain(domain) {
    const contextIds = this.indexes.domainIndex.get(domain);
    if (!contextIds) {
      this.stats.lookupMisses++;
      return [];
    }

    this.stats.lookupHits++;
    return Array.from(contextIds);
  }

  /**
   * Get contexts by permission
   * @param {string} permission - Permission name
   * @returns {Array} Context IDs
   */
  getByPermission(permission) {
    const contextIds = this.indexes.permissionIndex.get(permission);
    if (!contextIds) {
      this.stats.lookupMisses++;
      return [];
    }

    this.stats.lookupHits++;
    return Array.from(contextIds);
  }

  /**
   * Get contexts by role
   * @param {string} role - Role name
   * @returns {Array} Context IDs
   */
  getByRole(role) {
    const contextIds = this.indexes.roleIndex.get(role);
    if (!contextIds) {
      this.stats.lookupMisses++;
      return [];
    }

    this.stats.lookupHits++;
    return Array.from(contextIds);
  }

  /**
   * Get contexts by agent
   * @param {string} agentId - Agent ID
   * @returns {Array} Context IDs
   */
  getByAgent(agentId) {
    const contextIds = this.indexes.agentIndex.get(agentId);
    if (!contextIds) {
      this.stats.lookupMisses++;
      return [];
    }

    this.stats.lookupHits++;
    return Array.from(contextIds);
  }

  /**
   * Batch lookup
   * @param {Array} userIds - User IDs to lookup
   * @returns {Object} Lookup results
   */
  batchLookup(userIds) {
    const results = {};
    let hits = 0;
    let misses = 0;

    for (const userId of userIds) {
      const result = this.getByUserId(userId);
      if (result) {
        results[userId] = result;
        hits++;
      } else {
        misses++;
      }
    }

    this.stats.lookupHits += hits;
    this.stats.lookupMisses += misses;

    return {
      results,
      hits,
      misses,
      total: userIds.length,
      hitRate: hits / userIds.length
    };
  }

  /**
   * Get all contexts in domain
   * @param {string} domain - Domain name
   * @returns {Array} Context IDs
   */
  getAllInDomain(domain) {
    return this.getByDomain(domain);
  }

  /**
   * Get all contexts with permission
   * @param {string} permission - Permission name
   * @returns {Array} Context IDs
   */
  getAllWithPermission(permission) {
    return this.getByPermission(permission);
  }

  /**
   * Get all contexts with role
   * @param {string} role - Role name
   * @returns {Array} Context IDs
   */
  getAllWithRole(role) {
    return this.getByRole(role);
  }

  /**
   * Get intersection of contexts
   * @param {Array} contextLists - Lists of context IDs
   * @returns {Array} Intersected context IDs
   */
  getIntersection(contextLists) {
    if (!contextLists || contextLists.length === 0) {
      return [];
    }

    // Convert first list to Set
    let result = new Set(contextLists[0]);

    // Intersect with subsequent lists
    for (let i = 1; i < contextLists.length; i++) {
      const list = new Set(contextLists[i]);
      result = new Set([...result].filter(x => list.has(x)));
    }

    return Array.from(result);
  }

  /**
   * Get union of contexts
   * @param {Array} contextLists - Lists of context IDs
   * @returns {Array} Union of context IDs
   */
  getUnion(contextLists) {
    if (!contextLists || contextLists.length === 0) {
      return [];
    }

    const result = new Set();

    for (const list of contextLists) {
      for (const id of list) {
        result.add(id);
      }
    }

    return Array.from(result);
  }

  /**
   * Refresh indexes
   * @param {Array} contexts - All contexts to re-index
   */
  refreshIndexes(contexts) {
    const startTime = Date.now();

    // Clear all indexes
    for (const key of Object.keys(this.indexes)) {
      this.indexes[key].clear();
    }
    this.stats.indexOperations = 0;

    // Re-index all contexts
    for (const context of contexts) {
      this.indexContext(context);
    }

    console.log(`[ContextIndexer] ✅ Refreshed ${contexts.length} indexes in ${Date.now() - startTime}ms`);
  }

  /**
   * Get index statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const totalIndexedItems = this.stats.totalIndexedItems;
    const totalRetrievals = this.stats.lookupHits + this.stats.lookupMisses;
    const hitRate = totalRetrievals > 0 
      ? Math.round((this.stats.lookupHits / totalRetrievals) * 10000) / 100 
      : 0;

    return {
      indexOperations: this.stats.indexOperations,
      totalIndexedItems,
      lookupHits: this.stats.lookupHits,
      lookupMisses: this.stats.lookupMisses,
      hitRate: hitRate + '%',
      indexes: {
        userIndex: this.indexes.userIndex.size,
        domainIndex: this.indexes.domainIndex.size,
        permissionIndex: this.indexes.permissionIndex.size,
        roleIndex: this.indexes.roleIndex.size,
        agentIndex: this.indexes.agentIndex.size
      },
      retrievalStats: {
        totalRetrievals,
        hitRate: hitRate + '%',
        missRate: (100 - hitRate) + '%'
      }
    };
  }

  /**
   * Get index health
   * @returns {Object} Health status
   */
  getHealth() {
    const indexes = this.indexes;
    const health = {
      overall: 'healthy',
      checks: []
    };

    // Check if all indexes are synchronized
    const userCount = indexes.userIndex.size;
    const totalInAllIndexes = 
      indexes.domainIndex.size + 
      indexes.permissionIndex.size + 
      indexes.roleIndex.size + 
      indexes.agentIndex.size;

    // Check if any index is too large (potential performance issue)
    for (const [name, index] of Object.entries(indexes)) {
      if (name !== 'userIndex' && index.size > 1000) {
        health.checks.push({
          check: `${name} index size`,
          status: 'warning',
          message: `${name} index has ${index.size} entries`
        });

        if (health.overall !== 'critical') {
          health.overall = 'warning';
        }
      }
    }

    if (health.checks.length === 0) {
      health.checks.push({
        check: 'index health',
        status: 'ok',
        message: 'All indexes within normal ranges'
      });
    }

    return health;
  }
}

module.exports = ContextIndexer;
