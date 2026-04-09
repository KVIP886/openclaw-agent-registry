/**
 * DiscoveryIndex - 发现索引优化模块
 * Created: 2026-04-09
 * Function: 快速查找索引、缓存、增量更新
 */

class DiscoveryIndex {
  constructor() {
    // 主索引：agent_id -> registration
    this.primaryIndex = new Map();
    
    // 辅助索引（用于快速查找）
    this.serviceIndex = new Map(); // service -> [agent_ids]
    this.healthIndex = new Map(); // agent_id -> health_status
    this.statusIndex = new Map(); // status -> [agent_ids]
    this.metadataIndex = new Map(); // metadata_key -> Map(value -> [agent_ids])
    
    // 缓存
    this.cache = new Map(); // cache_key -> {data, expiresAt}
    this.cacheTTL = 5000; // 5 秒缓存
    
    // 统计
    this.stats = {
      hits: 0,
      misses: 0,
      cacheSize: 0
    };
    
    // 变更监听器
    this.listeners = {
      onPrimaryUpdate: [],
      onCacheInvalid: []
    };
    
    console.log('[DiscoveryIndex] Initialized');
    console.log('[DiscoveryIndex] Cache TTL:', this.cacheTTL, 'ms');
    console.log('[DiscoveryIndex] Indexes:', this.getStats().indexCount);
  }

  /**
   * 添加/更新注册信息
   * @param {Object} registration - 注册信息
   * @returns {Object} 更新结果
   */
  updateRegistration(registration) {
    const { agentId, serviceName, status = 'active', healthStatus, metadata = {} } = registration;
    
    const startTime = Date.now();
    
    // 从主索引中移除旧的
    if (this.primaryIndex.has(agentId)) {
      this.removeFromAllIndexes(agentId);
    }
    
    // 添加到主索引
    this.primaryIndex.set(agentId, registration);
    
    // 添加到辅助索引
    this.addToServiceIndex(serviceName, agentId);
    this.addToStatusIndex(status, agentId);
    this.addToHealthIndex(agentId, healthStatus);
    this.addToMetadataIndex(metadata, agentId);
    
    // 清除缓存
    this.invalidateCacheForAgent(agentId);
    
    // 更新统计
    this.stats.hits += 0;
    this.stats.cacheSize = this.primaryIndex.size;
    
    // 触发监听器
    this.notifyListeners('onPrimaryUpdate', { agentId, action: 'update', duration: Date.now() - startTime });
    
    return {
      success: true,
      agentId,
      action: 'update',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 删除注册信息
   * @param {string} agentId - Agent ID
   * @returns {Object} 删除结果
   */
  removeRegistration(agentId) {
    const registration = this.primaryIndex.get(agentId);
    if (!registration) {
      return { success: false, error: 'Not found', agentId };
    }
    
    const startTime = Date.now();
    
    // 从所有索引中移除
    this.removeFromAllIndexes(agentId);
    
    // 从主索引中删除
    this.primaryIndex.delete(agentId);
    
    // 清除缓存
    this.invalidateCacheForAgent(agentId);
    
    // 更新统计
    this.stats.cacheSize = this.primaryIndex.size;
    
    // 触发监听器
    this.notifyListeners('onPrimaryUpdate', { agentId, action: 'delete', duration: Date.now() - startTime });
    
    return {
      success: true,
      agentId,
      action: 'delete',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 根据 Agent ID 查找
   * @param {string} agentId - Agent ID
   * @returns {Object|null} 注册信息
   */
  getRegistration(agentId) {
    // 检查缓存
    const cacheKey = `agent:${agentId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.stats.hits++;
      return cached;
    }
    
    this.stats.misses++;
    
    const registration = this.primaryIndex.get(agentId);
    if (!registration) {
      return null;
    }
    
    // 添加到缓存
    this.addToCache(cacheKey, registration);
    
    return registration;
  }

  /**
   * 根据服务名称查找
   * @param {string} serviceName - 服务名称
   * @returns {Array} Agent ID 列表
   */
  getAgentsByService(serviceName) {
    // 检查缓存
    const cacheKey = `service:${serviceName}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.stats.hits++;
      return cached;
    }
    
    this.stats.misses++;
    
    const agentIds = this.serviceIndex.get(serviceName) || [];
    
    // 添加到缓存
    this.addToCache(cacheKey, agentIds);
    
    return agentIds;
  }

  /**
   * 根据状态查找
   * @param {string} status - 状态
   * @returns {Array} Agent ID 列表
   */
  getAgentsByStatus(status) {
    // 检查缓存
    const cacheKey = `status:${status}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.stats.hits++;
      return cached;
    }
    
    this.stats.misses++;
    
    const agentIds = this.statusIndex.get(status) || [];
    
    // 添加到缓存
    this.addToCache(cacheKey, agentIds);
    
    return agentIds;
  }

  /**
   * 根据健康状态查找
   * @param {string} status - 健康状态
   * @returns {Array} Agent ID 列表
   */
  getAgentsByHealthStatus(status) {
    // 检查缓存
    const cacheKey = `health:${status}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.stats.hits++;
      return cached;
    }
    
    this.stats.misses++;
    
    const agentIds = Array.from(this.healthIndex.entries())
      .filter(([_, h]) => h === status)
      .map(([agentId, _]) => agentId);
    
    // 添加到缓存
    this.addToCache(cacheKey, agentIds);
    
    return agentIds;
  }

  /**
   * 根据元数据查找
   * @param {string} key - 元数据键
   * @param {string} value - 元数据值
   * @returns {Array} Agent ID 列表
   */
  getAgentsByMetadata(key, value) {
    // 检查缓存
    const cacheKey = `metadata:${key}:${value}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.stats.hits++;
      return cached;
    }
    
    this.stats.misses++;
    
    const metadataIndex = this.metadataIndex.get(key);
    const agentIds = metadataIndex ? metadataIndex.get(value) || [] : [];
    
    // 添加到缓存
    this.addToCache(cacheKey, agentIds);
    
    return agentIds;
  }

  /**
   * 获取所有注册
   * @param {Object} filters - 过滤条件
   * @returns {Array} 注册列表
   */
  getAllRegistations(filters = {}) {
    const registrations = Array.from(this.primaryIndex.values());
    
    if (filters.status) {
      return registrations.filter(r => r.status === filters.status);
    }
    
    if (filters.activeOnly) {
      return registrations.filter(r => r.status === 'active' && new Date(r.expiresAt) >= new Date());
    }
    
    return registrations;
  }

  /**
   * 添加到服务索引
   */
  addToServiceIndex(serviceName, agentId) {
    if (!serviceName) return;
    
    if (!this.serviceIndex.has(serviceName)) {
      this.serviceIndex.set(serviceName, []);
    }
    
    const agentIds = this.serviceIndex.get(serviceName);
    if (!agentIds.includes(agentId)) {
      agentIds.push(agentId);
    }
  }

  /**
   * 添加到状态索引
   */
  addToStatusIndex(status, agentId) {
    if (!status) return;
    
    if (!this.statusIndex.has(status)) {
      this.statusIndex.set(status, []);
    }
    
    const agentIds = this.statusIndex.get(status);
    if (!agentIds.includes(agentId)) {
      agentIds.push(agentId);
    }
  }

  /**
   * 添加到健康索引
   */
  addToHealthIndex(agentId, healthStatus) {
    if (!healthStatus) return;
    
    if (!this.healthIndex.has(agentId)) {
      this.healthIndex.set(agentId, healthStatus);
    }
    
    this.healthIndex.set(agentId, healthStatus);
  }

  /**
   * 添加到元数据索引
   */
  addToMetadataIndex(metadata, agentId) {
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value !== 'object') {
        if (!this.metadataIndex.has(key)) {
          this.metadataIndex.set(key, new Map());
        }
        
        const valueMap = this.metadataIndex.get(key);
        if (!valueMap.has(value)) {
          valueMap.set(value, []);
        }
        
        const agentIds = valueMap.get(value);
        if (!agentIds.includes(agentId)) {
          agentIds.push(agentId);
        }
      }
    }
  }

  /**
   * 从所有索引中移除
   */
  removeFromAllIndexes(agentId) {
    // 从服务索引中移除
    for (const [serviceName, agentIds] of this.serviceIndex.entries()) {
      const index = agentIds.indexOf(agentId);
      if (index > -1) {
        agentIds.splice(index, 1);
      }
    }
    
    // 从状态索引中移除
    for (const [status, agentIds] of this.statusIndex.entries()) {
      const index = agentIds.indexOf(agentId);
      if (index > -1) {
        agentIds.splice(index, 1);
      }
    }
    
    // 从健康索引中移除
    this.healthIndex.delete(agentId);
    
    // 从元数据索引中移除
    for (const [key, valueMap] of this.metadataIndex.entries()) {
      for (const [value, agentIds] of valueMap.entries()) {
        const index = agentIds.indexOf(agentId);
        if (index > -1) {
          agentIds.splice(index, 1);
        }
      }
    }
  }

  /**
   * 添加到缓存
   */
  addToCache(key, data) {
    const cacheEntry = {
      data,
      expiresAt: Date.now() + this.cacheTTL
    };
    this.cache.set(key, cacheEntry);
  }

  /**
   * 从缓存获取
   */
  getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    
    if (Date.now() >= entry.expiresAt) {
      // 缓存过期
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * 无效缓存
   */
  invalidateCacheForAgent(agentId) {
    const keysToRemove = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(`agent:${agentId}`)) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      this.cache.delete(key);
    }
    
    this.notifyListeners('onCacheInvalid', { agentId, keysRemoved: keysToRemove.length });
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    this.cache.clear();
    console.log('[DiscoveryIndex] ✅ Cache cleared');
  }

  /**
   * 注册监听器
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * 移除监听器
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * 触发监听器
   */
  notifyListeners(event, data) {
    const callbacks = this.listeners[event] || [];
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error(`[DiscoveryIndex] Error in listener ${event}:`, error);
      }
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    let metadataIndexCount = 0;
    for (const valueMap of this.metadataIndex.values()) {
      metadataIndexCount += valueMap.size;
    }
    
    return {
      primaryIndexSize: this.primaryIndex.size,
      serviceIndexSize: this.serviceIndex.size,
      statusIndexSize: this.statusIndex.size,
      healthIndexSize: this.healthIndex.size,
      metadataIndexSize: metadataIndexCount,
      indexCount: this.primaryIndex.size + this.serviceIndex.size + this.statusIndex.size,
      cacheSize: this.cache.size,
      cacheHits: this.stats.hits,
      cacheMisses: this.stats.misses,
      hitRate: (this.stats.hits + this.stats.misses) > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
        : 0
    };
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const keysToRemove = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      this.cache.delete(key);
    }
    
    const removed = keysToRemove.length;
    if (removed > 0) {
      console.log(`[DiscoveryIndex] 🧹 Cleaned up ${removed} expired cache entries`);
    }
    
    return removed;
  }

  /**
   * 启动自动缓存清理
   */
  startAutoCleanup() {
    console.log('[DiscoveryIndex] Starting auto-cleanup scheduler...');
    
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredCache();
    }, 30000); // 每 30 秒清理一次
    
    console.log('[DiscoveryIndex] ✅ Auto-cleanup scheduler started');
  }

  /**
   * 停止自动缓存清理
   */
  stopAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('[DiscoveryIndex] Auto-cleanup scheduler stopped');
    }
  }
}

module.exports = DiscoveryIndex;
