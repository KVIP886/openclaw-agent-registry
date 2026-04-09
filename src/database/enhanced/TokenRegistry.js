/**
 * TokenRegistry - Token 生命周期管理模块
 * Created: 2026-04-09
 * Function: Token 注册、追踪、自动续期、过期清理
 */

const jwt = require('jsonwebtoken');

class TokenRegistry {
  constructor(options = {}) {
    this.tokens = new Map(); // token_id -> token_info
    this.userTokens = new Map(); // user_id -> [token_ids]
    this.serviceTokens = new Map(); // service_name -> [token_ids]
    
    this.config = {
      maxTokensPerUser: options.maxTokensPerUser || 100,
      autoRenewThreshold: options.autoRenewThreshold || 0.2, // 剩余 20% 时自动续期
      cleanupInterval: options.cleanupInterval || 3600000, // 1 小时清理一次
      defaultTtl: options.defaultTtl || '1h'
    };
    
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    
    // 清理调度器
    this.cleanupTimer = null;
    
    console.log('[TokenRegistry] Initialized');
    console.log('[TokenRegistry] Max tokens per user:', this.config.maxTokensPerUser);
    console.log('[TokenRegistry] Auto-renew threshold:', this.config.autoRenewThreshold * 100, '%');
    console.log('[TokenRegistry] Cleanup interval:', this.config.cleanupInterval, 'ms');
    
    // 启动自动清理
    this.startCleanup();
  }

  /**
   * 注册新 Token
   * @param {Object} tokenInfo - Token 信息
   * @returns {Object} Token 注册结果
   */
  registerToken(tokenInfo) {
    const { userId, service, token, ttl = this.config.defaultTtl, metadata = {} } = tokenInfo;
    
    // 生成 Token ID
    const tokenId = `token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // 解析 Token 获取过期时间
    let expiresAt;
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        expiresAt = new Date(decoded.exp * 1000);
      }
    } catch (error) {
      console.warn('[TokenRegistry] Could not parse token expiry:', error.message);
      expiresAt = new Date(Date.now() + this.parseTtl(ttl));
    }
    
    // 创建 Token 记录
    const tokenRecord = {
      tokenId,
      userId,
      service,
      tokenHash: this.hashToken(token), // 只存储哈希
      expiresAt,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      usageCount: 0,
      metadata: {
        ...metadata,
        ttl,
        originalExpiresAt: expiresAt.toISOString()
      },
      status: 'active'
    };
    
    // 检查用户 Token 数量限制
    if (this.userTokens.has(userId)) {
      const userTokens = this.userTokens.get(userId);
      if (userTokens.length >= this.config.maxTokensPerUser) {
        // 找到最旧的过期 Token
        const oldest = userTokens
          .map(id => this.tokens.get(id))
          .filter(t => t.status === 'active')
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
        
        if (oldest) {
          console.log(`[TokenRegistry] ⚠️ User ${userId} at max tokens, revoking oldest`);
          this.revokeToken(oldest.tokenId, { reason: 'user_token_limit', revokedBy: 'system' });
        }
      }
    }
    
    // 存储 Token
    this.tokens.set(tokenId, tokenRecord);
    
    // 更新用户索引
    if (!this.userTokens.has(userId)) {
      this.userTokens.set(userId, []);
    }
    this.userTokens.get(userId).push(tokenId);
    
    // 更新服务索引
    if (!this.serviceTokens.has(service)) {
      this.serviceTokens.set(service, []);
    }
    this.serviceTokens.get(service).push(tokenId);
    
    console.log(`[TokenRegistry] ✅ Token registered: ${tokenId} for user ${userId} (service: ${service})`);
    
    return {
      success: true,
      tokenId,
      token: token.token, // 返回原始 token（仅一次）
      expiresAt: tokenRecord.expiresAt,
      createdAt: tokenRecord.createdAt,
      metadata: tokenRecord.metadata
    };
  }

  /**
   * 验证并刷新 Token
   * @param {string} token - Token
   * @returns {Object} 验证结果
   */
  validateAndRefreshToken(token) {
    // 查找 Token
    const tokenRecord = this.findTokenByValue(token);
    if (!tokenRecord) {
      return { valid: false, error: 'Token not found' };
    }
    
    // 检查状态
    if (tokenRecord.status !== 'active') {
      return { valid: false, error: 'Token not active', status: tokenRecord.status };
    }
    
    // 检查过期
    const now = new Date();
    if (now >= tokenRecord.expiresAt) {
      return { valid: false, error: 'Token expired', status: 'expired' };
    }
    
    // 检查是否即将过期
    const remaining = (tokenRecord.expiresAt - now) / (tokenRecord.expiresAt - new Date(tokenRecord.createdAt));
    if (remaining < this.config.autoRenewThreshold) {
      // 自动续期
      console.log(`[TokenRegistry] 🔁 Auto-renewing token ${tokenRecord.tokenId} (remaining: ${remaining * 100}%)`);
      return this.autoRenewToken(tokenRecord.tokenId);
    }
    
    // 更新使用记录
    tokenRecord.lastUsedAt = now.toISOString();
    tokenRecord.usageCount++;
    
    console.log(`[TokenRegistry] ✅ Token ${tokenRecord.tokenId} validated (remaining: ${remaining * 100}%)`);
    
    return {
      valid: true,
      tokenId: tokenRecord.tokenId,
      userId: tokenRecord.userId,
      service: tokenRecord.service,
      expiresAt: tokenRecord.expiresAt,
      metadata: tokenRecord.metadata,
      remainingTime: Math.floor((tokenRecord.expiresAt - now) / 1000)
    };
  }

  /**
   * 手动续期 Token
   * @param {string} tokenId - Token ID
   * @param {Object} options - 续期选项
   * @returns {Object} 续期结果
   */
  renewToken(tokenId, options = {}) {
    const tokenRecord = this.tokens.get(tokenId);
    if (!tokenRecord) {
      return { success: false, error: 'Token not found' };
    }
    
    if (tokenRecord.status !== 'active') {
      return { success: false, error: 'Token not active', status: tokenRecord.status };
    }
    
    // 计算新的过期时间
    const now = new Date();
    const originalDuration = tokenRecord.expiresAt - new Date(tokenRecord.createdAt);
    const remaining = tokenRecord.expiresAt - now;
    const newDuration = options.ttl ? this.parseTtl(options.ttl) : originalDuration;
    const newExpiresAt = new Date(now.getTime() + newDuration);
    
    // 更新 Token
    tokenRecord.expiresAt = newExpiresAt;
    tokenRecord.renewedAt = new Date().toISOString();
    tokenRecord.renewalCount = (tokenRecord.renewalCount || 0) + 1;
    
    // 更新 metadata
    tokenRecord.metadata.originalExpiresAt = tokenRecord.expiresAt.toISOString();
    tokenRecord.metadata.renewedAt = tokenRecord.renewedAt;
    
    console.log(`[TokenRegistry] 🔁 Token ${tokenId} renewed (new expires: ${tokenRecord.expiresAt.toISOString()})`);
    
    return {
      success: true,
      tokenId,
      expiresAt: tokenRecord.expiresAt,
      renewedAt: tokenRecord.renewedAt,
      remaining: Math.floor((tokenRecord.expiresAt - now) / 1000)
    };
  }

  /**
   * 自动续期 Token
   * @param {string} tokenId - Token ID
   * @returns {Object} 续期结果
   */
  autoRenewToken(tokenId) {
    return this.renewToken(tokenId, { autoRenew: true });
  }

  /**
   * 撤销 Token
   * @param {string} tokenId - Token ID
   * @param {Object} metadata - 撤销原因
   * @returns {Object} 撤销结果
   */
  revokeToken(tokenId, metadata = {}) {
    const tokenRecord = this.tokens.get(tokenId);
    if (!tokenRecord) {
      return { success: false, error: 'Token not found' };
    }
    
    if (tokenRecord.status === 'revoked') {
      console.log(`[TokenRegistry] ⚠️ Token ${tokenId} already revoked`);
      return { success: false, error: 'Token already revoked', status: 'revoked' };
    }
    
    // 标记为已撤销
    tokenRecord.status = 'revoked';
    tokenRecord.revokedAt = new Date().toISOString();
    tokenRecord.revokedBy = metadata.revokedBy || 'system';
    tokenRecord.revocationReason = metadata.reason || metadata.revocationReason || 'unspecified';
    
    // 从索引中移除
    this.removeTokenFromIndexes(tokenId);
    
    console.log(`[TokenRegistry] ❌ Token ${tokenId} revoked: ${tokenRecord.revocationReason}`);
    
    return {
      success: true,
      tokenId,
      revokedAt: tokenRecord.revokedAt,
      revokedBy: tokenRecord.revokedBy,
      reason: tokenRecord.revocationReason
    };
  }

  /**
   * 删除 Token（永久删除）
   * @param {string} tokenId - Token ID
   * @returns {Object} 删除结果
   */
  deleteToken(tokenId) {
    const tokenRecord = this.tokens.get(tokenId);
    if (!tokenRecord) {
      return { success: false, error: 'Token not found' };
    }
    
    // 从索引中移除
    this.removeTokenFromIndexes(tokenId);
    
    // 从 Map 中删除
    this.tokens.delete(tokenId);
    
    console.log(`[TokenRegistry] 🗑️ Token ${tokenId} deleted`);
    
    return {
      success: true,
      tokenId,
      deletedAt: new Date().toISOString()
    };
  }

  /**
   * 根据 Token 值查找 Token 记录
   * @param {string} token - Token 值
   * @returns {Object|null} Token 记录
   */
  findTokenByValue(token) {
    const tokenHash = this.hashToken(token);
    
    for (const [tokenId, tokenRecord] of this.tokens.entries()) {
      if (tokenRecord.tokenHash === tokenHash && tokenRecord.status === 'active') {
        return tokenRecord;
      }
    }
    
    return null;
  }

  /**
   * 根据 Token ID 查找 Token 记录
   * @param {string} tokenId - Token ID
   * @returns {Object|null} Token 记录
   */
  findTokenById(tokenId) {
    const tokenRecord = this.tokens.get(tokenId);
    if (!tokenRecord) {
      return null;
    }
    
    // 检查是否过期
    if (tokenRecord.status === 'active' && new Date(tokenRecord.expiresAt) < new Date()) {
      tokenRecord.status = 'expired';
      this.removeTokenFromIndexes(tokenId);
      return { ...tokenRecord, status: 'expired' };
    }
    
    return tokenRecord;
  }

  /**
   * 获取用户的所有 Token
   * @param {string} userId - User ID
   * @param {Object} filters - 过滤条件
   * @returns {Array} Token 列表
   */
  getUserTokens(userId, filters = {}) {
    const tokenIds = this.userTokens.get(userId) || [];
    const tokens = tokenIds
      .map(id => this.tokens.get(id))
      .filter(t => t);
    
    if (filters.status) {
      return tokens.filter(t => t.status === filters.status);
    }
    
    return tokens;
  }

  /**
   * 获取服务的所有 Token
   * @param {string} serviceName - 服务名称
   * @returns {Array} Token 列表
   */
  getServiceTokens(serviceName) {
    const tokenIds = this.serviceTokens.get(serviceName) || [];
    return tokenIds
      .map(id => this.tokens.get(id))
      .filter(t => t);
  }

  /**
   * 清理过期 Token
   * @returns {Object} 清理结果
   */
  cleanupExpiredTokens() {
    const expiredTokens = [];
    const now = new Date();
    
    for (const [tokenId, tokenRecord] of this.tokens.entries()) {
      if (tokenRecord.status === 'active' && now >= tokenRecord.expiresAt) {
        // 标记为过期
        tokenRecord.status = 'expired';
        this.removeTokenFromIndexes(tokenId);
        expiredTokens.push(tokenId);
        
        console.log(`[TokenRegistry] 🗑️ Cleaning up expired token: ${tokenId}`);
      }
    }
    
    console.log(`[TokenRegistry] ✅ Cleaned up ${expiredTokens.length} expired tokens`);
    
    return {
      cleanedCount: expiredTokens.length,
      cleanedTokens: expiredTokens,
      remainingTokens: this.tokens.size
    };
  }

  /**
   * 启动自动清理
   */
  startCleanup() {
    console.log('[TokenRegistry] Starting auto-cleanup scheduler...');
    
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredTokens();
    }, this.config.cleanupInterval);
    
    console.log('[TokenRegistry] ✅ Auto-cleanup scheduler started');
  }

  /**
   * 停止自动清理
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('[TokenRegistry] Auto-cleanup scheduler stopped');
    }
  }

  /**
   * 移除 Token 从索引中
   */
  removeTokenFromIndexes(tokenId) {
    // 从用户索引中移除
    for (const [userId, tokenIds] of this.userTokens.entries()) {
      const index = tokenIds.indexOf(tokenId);
      if (index > -1) {
        tokenIds.splice(index, 1);
      }
    }
    
    // 从服务索引中移除
    for (const [serviceName, tokenIds] of this.serviceTokens.entries()) {
      const index = tokenIds.indexOf(tokenId);
      if (index > -1) {
        tokenIds.splice(index, 1);
      }
    }
  }

  /**
   * 哈希 Token 值
   */
  hashToken(token) {
    // 简单哈希（生产环境应使用更安全的方法）
    return `hash-${require('crypto').createHash('sha256').update(token).digest('hex').substring(0, 16)}`;
  }

  /**
   * 解析 TTL 字符串
   */
  parseTtl(ttl) {
    if (typeof ttl === 'number') {
      return ttl; // 已经是毫秒
    }
    
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid TTL format: ${ttl}`);
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000; // 秒
      case 'm': return value * 60 * 1000; // 分钟
      case 'h': return value * 60 * 60 * 1000; // 小时
      case 'd': return value * 24 * 60 * 60 * 1000; // 天
      default: throw new Error(`Invalid TTL unit: ${unit}`);
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    let active = 0;
    let expired = 0;
    let revoked = 0;
    
    for (const token of this.tokens.values()) {
      switch (token.status) {
        case 'active': active++; break;
        case 'expired': expired++; break;
        case 'revoked': revoked++; break;
      }
    }
    
    return {
      totalTokens: this.tokens.size,
      activeTokens: active,
      expiredTokens: expired,
      revokedTokens: revoked,
      users: this.userTokens.size,
      services: this.serviceTokens.size
    };
  }
}

module.exports = TokenRegistry;
