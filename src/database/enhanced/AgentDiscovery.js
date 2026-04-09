/**
 * AgentDiscovery - Agent 发现模块
 * Created: 2026-04-09
 * Function: Agent 自动发现、服务注册、健康检查
 */

const MemoryManager = require('./enhanced/MemoryManager');
const VersionControl = require('./enhanced/VersionControl');
const SyncEngine = require('./enhanced/SyncEngine');

class AgentDiscovery {
  constructor(memoryManager, versionControl, syncEngine, db) {
    this.memory = memoryManager;
    this.versionControl = versionControl;
    this.syncEngine = syncEngine;
    this.db = db;
    
    // 服务注册表
    this.registrationIndex = new Map(); // agent_id -> registration
    this.discoveryIndex = new Map(); // service_type -> [agent_ids]
    this.healthIndex = new Map(); // agent_id -> health_status
    
    // 发现配置
    this.config = {
      healthCheckInterval: 30000, // 30 秒
      registrationTimeout: 60000, // 1 分钟
      discoveryMethods: ['self-register', 'dns-sd', 'broadcast'],
      autoDeregister: true
    };
    
    // 注册监听器
    this.listeners = {
      onRegister: [],
      onDeregister: [],
      onHealthChange: []
    };
    
    console.log('[AgentDiscovery] Initialized');
    console.log('[AgentDiscovery] Auto-discovery methods:', this.config.discoveryMethods);
    console.log('[AgentDiscovery] Health check interval:', this.config.healthCheckInterval, 'ms');
    
    // 启动健康检查
    this.startHealthCheck();
  }

  /**
   * 注册 Agent
   * @param {Object} registration - 注册信息
   * @returns {Object} 注册结果
   */
  async registerAgent(registration) {
    const startTime = Date.now();
    
    const { agentId, serviceName, endpoint, metadata, services } = registration;
    
    // 检查重复注册
    if (this.registrationIndex.has(agentId)) {
      console.log(`[AgentDiscovery] ⚠️ Agent ${agentId} already registered, updating...`);
      return this.updateAgentRegistration(agentId, registration);
    }
    
    // 创建注册记录
    const registrationRecord = {
      agentId,
      serviceName,
      endpoint,
      metadata: metadata || {},
      services: services || [],
      registeredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.config.registrationTimeout).toISOString(),
      status: 'active',
      healthStatus: 'unknown',
      lastHealthCheck: null
    };
    
    // 添加到索引
    this.registrationIndex.set(agentId, registrationRecord);
    
    // 添加到服务类型索引
    for (const service of registrationRecord.services) {
      if (!this.discoveryIndex.has(service)) {
        this.discoveryIndex.set(service, []);
      }
      this.discoveryIndex.get(service).push(agentId);
    }
    
    // 创建版本记录
    await this.versionControl.createVersion('agent_discovery', 'register', registrationRecord, {
      user: 'system',
      sessionId: `discovery-${Date.now()}`
    });
    
    // 记录到内存管理器
    this.memory.recordPerformance('registerAgent', Date.now() - startTime);
    
    // 触发监听器
    this.notifyListeners('onRegister', registrationRecord);
    
    console.log(`[AgentDiscovery] ✅ Agent ${agentId} registered: ${serviceName} @ ${endpoint}`);
    
    return {
      success: true,
      agentId,
      serviceName,
      registrationId: this.getRegistrationId(agentId),
      timestamp: registrationRecord.registeredAt
    };
  }

  /**
   * 更新 Agent 注册信息
   * @param {string} agentId - Agent ID
   * @param {Object} registration - 更新信息
   * @returns {Object} 更新结果
   */
  async updateAgentRegistration(agentId, registration) {
    const existing = this.registrationIndex.get(agentId);
    if (!existing) {
      return { success: false, error: 'Agent not found', agentId };
    }
    
    // 更新注册信息
    const updated = {
      ...existing,
      ...registration,
      registeredAt: existing.registeredAt, // 保留原始注册时间
      expiresAt: new Date(Date.now() + this.config.registrationTimeout).toISOString(),
      status: 'active'
    };
    
    this.registrationIndex.set(agentId, updated);
    
    // 重新构建服务索引
    this.rebuildServiceIndex(agentId, updated.services);
    
    // 创建版本记录
    await this.versionControl.createVersion('agent_discovery', 'update', updated, {
      user: 'system',
      sessionId: `discovery-${Date.now()}`
    });
    
    console.log(`[AgentDiscovery] ✅ Agent ${agentId} registration updated`);
    
    return {
      success: true,
      agentId,
      updated,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 注销 Agent
   * @param {string} agentId - Agent ID
   * @returns {Object} 注销结果
   */
  async deregisterAgent(agentId) {
    const existing = this.registrationIndex.get(agentId);
    if (!existing) {
      return { success: false, error: 'Agent not found', agentId };
    }
    
    // 从索引中移除
    this.removeFromServiceIndex(agentId);
    
    // 标记为已注销
    existing.status = 'deregistered';
    existing.deregisteredAt = new Date().toISOString();
    
    // 创建版本记录
    await this.versionControl.createVersion('agent_discovery', 'deregister', existing, {
      user: 'system',
      sessionId: `discovery-${Date.now()}`
    });
    
    // 触发监听器
    this.notifyListeners('onDeregister', existing);
    
    console.log(`[AgentDiscovery] ❌ Agent ${agentId} deregistered`);
    
    return {
      success: true,
      agentId,
      deregisteredAt: existing.deregisteredAt
    };
  }

  /**
   * 根据 Agent ID 查找 Agent
   * @param {string} agentId - Agent ID
   * @returns {Object|null} Agent 注册信息
   */
  findAgent(agentId) {
    const registration = this.registrationIndex.get(agentId);
    if (!registration) {
      return null;
    }
    
    // 检查是否过期
    if (registration.status === 'expired' || new Date(registration.expiresAt) < new Date()) {
      this.handleExpiredRegistration(agentId);
      return null;
    }
    
    return {
      ...registration,
      healthStatus: this.getHealthStatus(agentId)
    };
  }

  /**
   * 根据服务类型查找 Agent
   * @param {string} serviceType - 服务类型
   * @param {Object} filters - 过滤条件
   * @returns {Array} Agent ID 列表
   */
  findAgentsByService(serviceType, filters = {}) {
    const agentIds = this.discoveryIndex.get(serviceType) || [];
    
    if (filters.status) {
      const filtered = agentIds.filter(id => {
        const reg = this.registrationIndex.get(id);
        return reg && reg.status === filters.status;
      });
      return filtered;
    }
    
    return agentIds;
  }

  /**
   * 获取所有已注册的 Agent
   * @param {Object} filters - 过滤条件
   * @returns {Array} 注册信息列表
   */
  getAllAgents(filters = {}) {
    const agents = Array.from(this.registrationIndex.values());
    
    if (filters.status) {
      return agents.filter(a => a.status === filters.status);
    }
    
    if (filters.activeOnly) {
      return agents.filter(a => a.status === 'active' && new Date(a.expiresAt) >= new Date());
    }
    
    return agents;
  }

  /**
   * 注册 Agent 健康状态
   * @param {string} agentId - Agent ID
   * @param {Object} healthStatus - 健康状态
   * @returns {Object} 健康状态记录
   */
  registerHealthStatus(agentId, healthStatus) {
    const existing = this.registrationIndex.get(agentId);
    if (!existing) {
      return { success: false, error: 'Agent not found', agentId };
    }
    
    const healthRecord = {
      agentId,
      status: healthStatus.status || 'unknown',
      details: healthStatus.details || {},
      timestamp: new Date().toISOString(),
      checks: healthStatus.checks || []
    };
    
    this.healthIndex.set(agentId, healthRecord);
    existing.healthStatus = healthStatus.status;
    existing.lastHealthCheck = healthRecord.timestamp;
    
    // 创建版本记录
    this.versionControl.createVersion('health_check', 'health_status', healthRecord, {
      user: 'system',
      sessionId: `health-${Date.now()}`
    });
    
    // 触发监听器
    this.notifyListeners('onHealthChange', { agentId, healthStatus: healthRecord });
    
    console.log(`[AgentDiscovery] ✅ Health status updated for ${agentId}: ${healthStatus.status}`);
    
    return {
      success: true,
      agentId,
      healthRecord,
      timestamp: healthRecord.timestamp
    };
  }

  /**
   * 获取 Agent 健康状态
   * @param {string} agentId - Agent ID
   * @returns {Object|null} 健康状态
   */
  getHealthStatus(agentId) {
    const record = this.healthIndex.get(agentId);
    if (!record) {
      return null;
    }
    
    // 检查健康状态是否过期
    const now = new Date();
    const lastCheck = new Date(record.timestamp);
    const age = now - lastCheck;
    
    if (age > this.config.healthCheckInterval * 2) {
      return { status: 'unknown', message: 'Health check timeout' };
    }
    
    return { status: record.status, details: record.details };
  }

  /**
   * 健康检查调度器
   */
  startHealthCheck() {
    console.log('[AgentDiscovery] Starting health check scheduler...');
    
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
    
    console.log('[AgentDiscovery] ✅ Health check scheduler started');
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      console.log('[AgentDiscovery] Health check scheduler stopped');
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthChecks() {
    console.log('[AgentDiscovery] Performing health checks...');
    
    const checks = [];
    
    for (const [agentId, registration] of this.registrationIndex.entries()) {
      // 检查是否过期
      if (new Date(registration.expiresAt) < new Date()) {
        if (registration.status !== 'expired') {
          registration.status = 'expired';
          this.rebuildServiceIndex(agentId, []); // 清空服务索引
          this.notifyListeners('onDeregister', registration);
          console.log(`[AgentDiscovery] ⏰ Agent ${agentId} expired`);
        }
        continue;
      }
      
      // 检查健康状态超时
      if (registration.status === 'active') {
        const healthRecord = this.healthIndex.get(agentId);
        const lastCheck = healthRecord ? new Date(healthRecord.timestamp) : null;
        
        if (!lastCheck || (new Date() - lastCheck) > this.config.healthCheckInterval * 2) {
          // 健康检查超时
          this.healthIndex.set(agentId, {
            agentId,
            status: 'timeout',
            details: { message: 'Health check timeout', lastSuccessfulCheck: lastCheck?.toISOString() },
            timestamp: new Date().toISOString()
          });
          
          this.notifyListeners('onHealthChange', { agentId, healthStatus: 'timeout' });
          console.log(`[AgentDiscovery] ⏰ Agent ${agentId} health check timeout`);
        }
      }
      
      checks.push(agentId);
    }
    
    console.log(`[AgentDiscovery] ✅ Completed health checks for ${checks.length} agents`);
  }

  /**
   * 添加服务索引
   */
  addToServiceIndex(serviceType, agentId) {
    if (!this.discoveryIndex.has(serviceType)) {
      this.discoveryIndex.set(serviceType, []);
    }
    
    if (!this.discoveryIndex.get(serviceType).includes(agentId)) {
      this.discoveryIndex.get(serviceType).push(agentId);
    }
  }

  /**
   * 从服务索引中移除
   */
  removeFromServiceIndex(agentId) {
    for (const [serviceType, agents] of this.discoveryIndex.entries()) {
      const index = agents.indexOf(agentId);
      if (index > -1) {
        agents.splice(index, 1);
      }
    }
  }

  /**
   * 重建服务索引
   */
  rebuildServiceIndex(agentId, services) {
    this.removeFromServiceIndex(agentId);
    
    for (const service of services) {
      this.addToServiceIndex(service, agentId);
    }
  }

  /**
   * 处理过期的注册
   */
  handleExpiredRegistration(agentId) {
    const registration = this.registrationIndex.get(agentId);
    if (registration && registration.status === 'active') {
      registration.status = 'expired';
      this.rebuildServiceIndex(agentId, []);
      this.notifyListeners('onDeregister', registration);
    }
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
        console.error(`[AgentDiscovery] Error in listener ${event}:`, error);
      }
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const total = this.registrationIndex.size;
    const active = Array.from(this.registrationIndex.values()).filter(a => a.status === 'active' && new Date(a.expiresAt) >= new Date()).length;
    const expired = total - active;
    
    return {
      totalAgents: total,
      activeAgents: active,
      expiredAgents: expired,
      services: this.discoveryIndex.size,
      healthChecks: this.healthIndex.size
    };
  }

  /**
   * 获取注册 ID
   */
  getRegistrationId(agentId) {
    return `reg-${agentId}-${Date.now()}`;
  }
}

module.exports = AgentDiscovery;
