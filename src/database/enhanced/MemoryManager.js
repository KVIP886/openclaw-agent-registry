/**
 * MemoryManager - 内存状态管理
 * Created: 2026-04-09
 * Function: 数据快照管理、变更追踪、性能监控
 */

const fs = require('fs');
const path = require('path');

class MemoryManager {
  constructor(options = {}) {
    this.snapshots = new Map(); // 快照存储 (key: table_name, value: [snapshot1, snapshot2, ...])
    this.changes = new Map();   // 变更历史 (key: table_name, value: [change1, change2, ...])
    this.performance = new Map(); // 性能数据 (key: operation, value: {count, totalMs, avgMs})
    
    this.maxSnapshots = options.maxSnapshots || 100; // 最大快照数
    this.snapshotInterval = options.snapshotInterval || 1000; // 自动快照间隔 (ms)
    this.enablePerformance = options.enablePerformance !== false; // 是否启用性能监控
    
    this.autoSnapshotTimer = null;
    
    console.log('[MemoryManager] Initialized');
    console.log('[MemoryManager] Max snapshots:', this.maxSnapshots);
    console.log('[MemoryManager] Auto-snapshot interval:', this.snapshotInterval, 'ms');
  }

  /**
   * 创建数据快照
   * @param {string} table - 表名 (agents, permissions, etc.)
   * @param {string} action - 操作类型 (create, update, delete)
   * @param {Object} data - 数据对象
   * @param {Object} metadata - 元数据 (user, timestamp, etc.)
   * @returns {Object} 快照对象
   */
  createSnapshot(table, action, data, metadata = {}) {
    const startTime = Date.now();
    
    const snapshot = {
      id: this.generateSnapshotId(table),
      timestamp: new Date().toISOString(),
      action,
      data: JSON.parse(JSON.stringify(data)), // 深拷贝
      metadata: {
        user: metadata.user || 'system',
        sessionId: metadata.sessionId || null,
        source: metadata.source || 'api',
        ...metadata
      },
      prevData: metadata.prevData || null,
      version: this.getVersion(table)
    };

    // 存储快照
    if (!this.snapshots.has(table)) {
      this.snapshots.set(table, []);
    }
    
    const snapshots = this.snapshots.get(table);
    snapshots.push(snapshot);
    
    // 清理旧快照
    if (snapshots.length > this.maxSnapshots) {
      snapshots.shift();
    }
    
    this.snapshots.set(table, snapshots);
    
    // 记录变更
    this.recordChange(table, action, data, metadata);
    
    if (this.enablePerformance) {
      this.recordPerformance(table, 'createSnapshot', Date.now() - startTime);
    }
    
    console.log(`[MemoryManager] ✅ Snapshot created: ${snapshot.id} (${table}.${action})`);
    return snapshot;
  }

  /**
   * 获取表的最新版本
   * @param {string} table - 表名
   * @returns {number} 版本号
   */
  getVersion(table) {
    if (!this.snapshots.has(table)) {
      return 0;
    }
    return this.snapshots.get(table).length;
  }

  /**
   * 获取所有历史快照
   * @param {string} table - 表名
   * @param {number} fromVersion - 起始版本 (可选)
   * @param {number} toVersion - 结束版本 (可选)
   * @returns {Array} 快照数组
   */
  getSnapshots(table, fromVersion = 1, toVersion = null) {
    if (!this.snapshots.has(table)) {
      return [];
    }
    
    let snapshots = this.snapshots.get(table);
    
    if (toVersion && toVersion < snapshots.length) {
      snapshots = snapshots.slice(0, toVersion);
    }
    
    return snapshots.filter(s => s.id >= fromVersion);
  }

  /**
   * 获取单个版本快照
   * @param {string} table - 表名
   * @param {number} version - 版本号
   * @returns {Object|null} 快照对象
   */
  getSnapshot(table, version) {
    const snapshots = this.getSnapshots(table);
    return snapshots.find(s => s.id === version) || null;
  }

  /**
   * 获取变更记录
   * @param {string} table - 表名
   * @param {string} action - 操作类型过滤 (可选)
   * @returns {Array} 变更数组
   */
  getChanges(table, action = null) {
    if (!this.changes.has(table)) {
      return [];
    }
    
    let changes = this.changes.get(table);
    
    if (action) {
      changes = changes.filter(c => c.action === action);
    }
    
    return changes;
  }

  /**
   * 获取性能统计
   * @param {string} operation - 操作类型 (可选)
   * @returns {Object} 性能数据
   */
  getPerformance(operation = null) {
    if (operation) {
      const data = this.performance.get(operation);
      return data || { count: 0, totalMs: 0, avgMs: 0 };
    }
    
    const stats = {};
    for (const [op, data] of this.performance.entries()) {
      stats[op] = {
        count: data.count,
        totalMs: data.totalMs,
        avgMs: data.avgMs
      };
    }
    
    return stats;
  }

  /**
   * 启用性能监控
   */
  enablePerformanceMonitoring() {
    this.enablePerformance = true;
    console.log('[MemoryManager] Performance monitoring enabled');
  }

  /**
   * 禁用性能监控
   */
  disablePerformanceMonitoring() {
    this.enablePerformance = false;
    console.log('[MemoryManager] Performance monitoring disabled');
  }

  /**
   * 生成快照 ID
   * @param {string} table - 表名
   * @returns {number} 快照 ID
   */
  generateSnapshotId(table) {
    return this.getVersion(table) + 1;
  }

  /**
   * 记录变更
   * @param {string} table - 表名
   * @param {string} action - 操作类型
   * @param {Object} data - 数据对象
   * @param {Object} metadata - 元数据
   */
  recordChange(table, action, data, metadata) {
    if (!this.changes.has(table)) {
      this.changes.set(table, []);
    }
    
    const change = {
      timestamp: new Date().toISOString(),
      action,
      data: JSON.parse(JSON.stringify(data)),
      metadata: {
        user: metadata.user || 'system',
        ...metadata
      }
    };
    
    const changes = this.changes.get(table);
    changes.push(change);
    
    // 限制变更历史
    if (changes.length > 1000) {
      changes.shift();
    }
    
    this.changes.set(table, changes);
  }

  /**
   * 记录性能数据
   * @param {string} operation - 操作名称
   * @param {number} durationMs - 耗时 (ms)
   */
  recordPerformance(operation, durationMs) {
    if (!this.performance.has(operation)) {
      this.performance.set(operation, {
        count: 0,
        totalMs: 0,
        avgMs: 0
      });
    }
    
    const stats = this.performance.get(operation);
    stats.count++;
    stats.totalMs += durationMs;
    stats.avgMs = stats.totalMs / stats.count;
    
    this.performance.set(operation, stats);
  }

  /**
   * 开始自动快照
   */
  startAutoSnapshot() {
    if (this.autoSnapshotTimer) {
      console.warn('[MemoryManager] Auto-snapshot already running');
      return;
    }
    
    console.log('[MemoryManager] Starting auto-snapshot timer...');
    
    this.autoSnapshotTimer = setInterval(() => {
      this.createAutoSnapshot();
    }, this.snapshotInterval);
    
    console.log('[MemoryManager] Auto-snapshot started');
  }

  /**
   * 停止自动快照
   */
  stopAutoSnapshot() {
    if (!this.autoSnapshotTimer) {
      console.warn('[MemoryManager] Auto-snapshot not running');
      return;
    }
    
    clearInterval(this.autoSnapshotTimer);
    this.autoSnapshotTimer = null;
    console.log('[MemoryManager] Auto-snapshot stopped');
  }

  /**
   * 创建自动快照
   */
  createAutoSnapshot() {
    const snapshot = {
      id: 'auto-' + Date.now(),
      timestamp: new Date().toISOString(),
      action: 'auto',
      type: 'checkpoint',
      metadata: {
        source: 'auto-snapshot',
        reason: 'periodic-checkpoint'
      }
    };
    
    console.log(`[MemoryManager] 🔄 Auto-snapshot: ${snapshot.id}`);
  }

  /**
   * 导出快照到文件
   * @param {string} table - 表名
   * @param {string} filePath - 文件路径
   */
  exportSnapshots(table, filePath) {
    const snapshots = this.getSnapshots(table);
    const data = {
      table,
      totalSnapshots: snapshots.length,
      snapshots,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[MemoryManager] ✅ Snapshots exported to ${filePath}`);
    return data;
  }

  /**
   * 导入快照从文件
   * @param {string} filePath - 文件路径
   */
  importSnapshots(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data.snapshots || !Array.isArray(data.snapshots)) {
      throw new Error('Invalid snapshot file format');
    }
    
    const table = data.table;
    if (!this.snapshots.has(table)) {
      this.snapshots.set(table, []);
    }
    
    // 合并快照
    const existingSnapshots = this.snapshots.get(table);
    const importedSnapshots = data.snapshots.filter(s => {
      return !existingSnapshots.find(e => e.id === s.id);
    });
    
    this.snapshots.set(table, [...existingSnapshots, ...importedSnapshots]);
    
    console.log(`[MemoryManager] ✅ Snapshots imported: ${importedSnapshots.length} new snapshots`);
    return importedSnapshots.length;
  }

  /**
   * 清理快照
   * @param {string} table - 表名
   * @param {number} keepCount - 保留的快照数
   */
  cleanupSnapshots(table, keepCount = 10) {
    if (!this.snapshots.has(table)) {
      return 0;
    }
    
    const snapshots = this.snapshots.get(table);
    const removedCount = snapshots.length - keepCount;
    
    if (removedCount > 0) {
      this.snapshots.set(table, snapshots.slice(-keepCount));
      console.log(`[MemoryManager] 🧹 Cleaned up ${removedCount} snapshots from ${table}`);
    }
    
    return removedCount;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const stats = {
      totalSnapshots: 0,
      tables: {},
      performance: {}
    };
    
    for (const [table, snapshots] of this.snapshots.entries()) {
      stats.tables[table] = {
        snapshotCount: snapshots.length,
        version: snapshots.length
      };
      stats.totalSnapshots += snapshots.length;
    }
    
    if (this.enablePerformance) {
      stats.performance = this.getPerformance();
    }
    
    return stats;
  }
}

module.exports = MemoryManager;
