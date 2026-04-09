/**
 * ConflictResolver - 冲突检测与解决模块
 * Created: 2026-04-09
 * Function: 冲突检测、自动解决、冲突报告
 */

const MemoryManager = require('./MemoryManager');

class ConflictResolver {
  constructor(memoryManager, db) {
    this.memory = memoryManager;
    this.db = db;
    
    // 冲突日志
    this.conflictLog = []; // 冲突记录
    this.conflictResolutionRules = []; // 解决规则
    
    // 默认规则
    this.setupDefaultRules();
    
    console.log('[ConflictResolver] Initialized');
    console.log('[ConflictResolver] Conflict log size:', this.conflictLog.length);
    console.log('[ConflictResolver] Active rules:', this.conflictResolutionRules.length);
  }

  /**
   * 设置默认冲突解决规则
   */
  setupDefaultRules() {
    // 规则 1: 时间优先 (最后写入获胜)
    this.conflictResolutionRules.push({
      id: 'timestamp_last_wins',
      name: '时间优先 - 最后写入获胜',
      priority: 1,
      check: (a, b) => a.timestamp > b.timestamp,
      apply: (target, source) => source
    });

    // 规则 2: 用户权限优先 (管理员获胜)
    this.conflictResolutionRules.push({
      id: 'admin_priority',
      name: '管理员优先',
      priority: 2,
      check: (a, b) => {
        const aAdmin = a.metadata?.userRole === 'admin' || a.metadata?.user === 'admin';
        const bAdmin = b.metadata?.userRole === 'admin' || b.metadata?.user === 'admin';
        return aAdmin && !bAdmin;
      },
      apply: (target, source) => target
    });

    // 规则 3: 版本号优先 (高版本获胜)
    this.conflictResolutionRules.push({
      id: 'version_priority',
      name: '版本号优先',
      priority: 3,
      check: (a, b) => a.version > b.version,
      apply: (target, source) => target
    });

    // 规则 4: 内容优先 (合并获胜)
    this.conflictResolutionRules.push({
      id: 'content_merge',
      name: '内容合并',
      priority: 4,
      check: (a, b) => {
        // 简单的合并策略：保留所有字段
        return true;
      },
      apply: (target, source) => {
        return { ...target, ...source };
      }
    });

    console.log('[ConflictResolver] ✅ Loaded 4 default resolution rules');
  }

  /**
   * 检测冲突
   * @param {string} table - 表名
   * @param {Object} newVersion - 新版本数据
   * @param {Object} metadata - 元数据
   * @returns {Object|null} 冲突对象或 null
   */
  detectConflict(table, newVersion, metadata = {}) {
    const startTime = Date.now();
    
    // 获取当前版本
    const currentVersion = this.memory.getVersion(table);
    if (currentVersion === 0) {
      return null; // 无冲突，首次创建
    }
    
    // 检查版本号冲突
    const versionConflict = this.checkVersionConflict(table, newVersion, currentVersion);
    if (versionConflict) {
      this.logConflict('version', table, newVersion, currentVersion, versionConflict, metadata);
      this.memory.recordPerformance('detectConflict', Date.now() - startTime);
      return versionConflict;
    }
    
    // 检查内容冲突 (可选)
    const contentConflict = this.checkContentConflict(table, newVersion, currentVersion, metadata);
    if (contentConflict) {
      this.logConflict('content', table, newVersion, currentVersion, contentConflict, metadata);
      this.memory.recordPerformance('detectConflict', Date.now() - startTime);
      return contentConflict;
    }
    
    this.memory.recordPerformance('detectConflict', Date.now() - startTime);
    return null; // 无冲突
  }

  /**
   * 检查版本号冲突
   * @param {string} table - 表名
   * @param {Object} newVersion - 新版本数据
   * @param {number} currentVersion - 当前版本号
   * @returns {Object|null} 冲突对象
   */
  checkVersionConflict(table, newVersion, currentVersion) {
    const baseVersion = newVersion.baseVersion;
    
    if (!baseVersion) {
      return null; // 未指定基线版本，无法检测
    }
    
    // 乐观锁：期望的基线版本与当前版本不一致
    if (baseVersion !== currentVersion) {
      return {
        type: 'version_conflict',
        table,
        expectedVersion: baseVersion,
        currentVersion,
        timestamp: new Date().toISOString(),
        message: `Version conflict: expected v${baseVersion}, but current is v${currentVersion}`,
        canAutoResolve: true,
        resolution: 'version_priority'
      };
    }
    
    return null;
  }

  /**
   * 检查内容冲突
   * @param {string} table - 表名
   * @param {Object} newVersion - 新版本数据
   * @param {number} currentVersion - 当前版本号
   * @param {Object} metadata - 元数据
   * @returns {Object|null} 冲突对象
   */
  checkContentConflict(table, newVersion, currentVersion, metadata) {
    const current = this.memory.getSnapshot(table, currentVersion);
    if (!current) {
      return null;
    }
    
    // 简单的内容冲突检测
    if (newVersion.force === false && this.isSignificantChange(current.data, newVersion.data)) {
      return {
        type: 'content_conflict',
        table,
        baseVersion: currentVersion,
        timestamp: new Date().toISOString(),
        message: 'Significant content change detected, manual review recommended',
        canAutoResolve: false,
        resolution: 'manual_review'
      };
    }
    
    return null;
  }

  /**
   * 检查是否是重大变更
   * @param {Object} original - 原始数据
   * @param {Object} updated - 更新后的数据
   * @returns {boolean} 是否是重大变更
   */
  isSignificantChange(original, updated) {
    // 简单策略：字段数量变化超过 50% 或关键字段变化
    const originalKeys = Object.keys(original || {});
    const updatedKeys = Object.keys(updated || {});
    
    const keyChange = Math.abs(originalKeys.length - updatedKeys.length);
    const keyRatio = keyChange / Math.max(originalKeys.length, updatedKeys.length, 1);
    
    return keyRatio > 0.5;
  }

  /**
   * 自动解决冲突
   * @param {string} table - 表名
   * @param {Object} conflict - 冲突对象
   * @param {Object} metadata - 元数据
   * @returns {Object} 解决结果
   */
  autoResolve(table, conflict, metadata = {}) {
    const startTime = Date.now();
    
    // 获取当前版本
    const currentVersion = this.memory.getVersion(table);
    const current = this.memory.getSnapshot(table, currentVersion);
    
    // 根据冲突类型选择解决策略
    const rule = this.conflictResolutionRules.find(r => r.id === conflict.resolution);
    
    if (!rule) {
      return {
        success: false,
        error: 'No resolution rule found for conflict type',
        conflict
      };
    }
    
    // 应用解决规则
    let resolvedData;
    if (conflict.type === 'version_conflict') {
      resolvedData = rule.apply(current?.data, { ...current?.data, ...metadata });
    } else {
      resolvedData = rule.apply(conflict.target, conflict.source);
    }
    
    // 创建新版本
    const resolvedVersion = await this.createResolvedVersion(table, resolvedData, conflict, {
      user: metadata.user || 'system',
      resolution: rule.id
    });
    
    this.memory.recordPerformance('autoResolve', Date.now() - startTime);
    
    console.log(`[ConflictResolver] ✅ Auto-resolved ${conflict.type} using rule: ${rule.id}`);
    
    return {
      success: true,
      table,
      conflictId: conflict.id,
      resolution: rule.id,
      newVersion: resolvedVersion,
      timestamp: resolvedVersion.timestamp
    };
  }

  /**
   * 创建已解决冲突的版本
   * @param {string} table - 表名
   * @param {Object} data - 解决后的数据
   * @param {Object} conflict - 冲突对象
   * @param {Object} metadata - 元数据
   * @returns {Object} 版本对象
   */
  async createResolvedVersion(table, data, conflict, metadata) {
    const snapshot = this.memory.createSnapshot(table, 'resolve_conflict', data, {
      user: metadata.user,
      sessionId: metadata.sessionId,
      reason: `resolved ${conflict.type} using ${conflict.resolution}`,
      parentVersions: [conflict.currentVersion, conflict.baseVersion]
    });
    
    console.log(`[ConflictResolver] ✅ Created resolved version ${snapshot.id}`);
    
    return {
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      table,
      version: snapshot.version
    };
  }

  /**
   * 记录冲突
   * @param {string} type - 冲突类型
   * @param {string} table - 表名
   * @param {Object} newVersion - 新版本数据
   * @param {number} currentVersion - 当前版本号
   * @param {Object} conflict - 冲突对象
   * @param {Object} metadata - 元数据
   */
  logConflict(type, table, newVersion, currentVersion, conflict, metadata) {
    const conflictEntry = {
      id: `conflict-${Date.now()}`,
      type,
      table,
      baseVersion: newVersion.baseVersion,
      currentVersion,
      conflict,
      metadata: {
        user: metadata.user || 'system',
        timestamp: new Date().toISOString(),
        ...metadata
      },
      resolution: null,
      resolved: false
    };
    
    this.conflictLog.push(conflictEntry);
    
    // 限制日志数量
    if (this.conflictLog.length > 1000) {
      this.conflictLog.shift();
    }
    
    console.log(`[ConflictResolver] 🚫 Conflict logged: ${conflictEntry.id} (${type} on ${table})`);
  }

  /**
   * 获取冲突日志
   * @param {string} table - 表名 (可选)
   * @param {string} type - 冲突类型 (可选)
   * @returns {Array} 冲突日志数组
   */
  getConflictLog(table = null, type = null) {
    let log = [...this.conflictLog];
    
    if (table) {
      log = log.filter(entry => entry.table === table);
    }
    
    if (type) {
      log = log.filter(entry => entry.type === type);
    }
    
    return log;
  }

  /**
   * 标记冲突已解决
   * @param {string} conflictId - 冲突 ID
   * @param {string} resolution - 解决方式
   * @returns {Object} 更新后的冲突记录
   */
  markResolved(conflictId, resolution) {
    const entry = this.conflictLog.find(e => e.id === conflictId);
    if (!entry) {
      throw new Error(`Conflict ${conflictId} not found`);
    }
    
    entry.resolution = resolution;
    entry.resolved = true;
    entry.resolvedAt = new Date().toISOString();
    
    console.log(`[ConflictResolver] ✅ Marked conflict ${conflictId} as resolved: ${resolution}`);
    
    return entry;
  }

  /**
   * 解决未解决的冲突
   * @param {string} table - 表名
   * @param {string} resolution - 解决方式 (optional)
   * @returns {Array} 已解决的冲突
   */
  resolveUnresolvedConflicts(table = null, resolution = null) {
    const unresolved = this.getConflictLog(table, resolution);
    const resolved = [];
    
    for (const conflict of unresolved) {
      if (!conflict.resolved) {
        try {
          const result = this.autoResolve(conflict.table, conflict, {
            user: conflict.metadata.user,
            resolution: conflict.resolution
          });
          
          if (result.success) {
            this.markResolved(conflict.id, conflict.resolution);
            resolved.push(result);
          }
        } catch (error) {
          console.error(`[ConflictResolver] ❌ Failed to resolve conflict ${conflict.id}:`, error);
        }
      }
    }
    
    return resolved;
  }

  /**
   * 清理已解决的冲突
   * @param {number} keepCount - 保留的已解决冲突数
   * @returns {number} 清理的数量
   */
  cleanupResolvedConflicts(keepCount = 50) {
    const before = this.conflictLog.length;
    this.conflictLog = this.conflictLog.filter(e => !e.resolved || this.conflictLog.filter(e2 => e2.id === e.id && e2.resolved).length <= keepCount);
    
    // 简化：只保留最近的 keepCount 个已解决冲突
    const resolved = this.conflictLog.filter(e => e.resolved);
    const unresolved = this.conflictLog.filter(e => !e.resolved);
    
    this.conflictLog = [...unresolved, ...resolved.slice(-keepCount)];
    
    const removed = before - this.conflictLog.length;
    console.log(`[ConflictResolver] 🧹 Cleaned up ${removed} old conflicts`);
    
    return removed;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const total = this.conflictLog.length;
    const resolved = this.conflictLog.filter(e => e.resolved).length;
    const unresolved = total - resolved;
    
    const byType = {};
    for (const entry of this.conflictLog) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
    }
    
    return {
      totalConflicts: total,
      resolvedConflicts: resolved,
      unresolvedConflicts: unresolved,
      resolutionRate: resolved / total,
      byType,
      activeRules: this.conflictResolutionRules.length
    };
  }
}

module.exports = ConflictResolver;
