/**
 * SyncEngine - 多设备同步引擎
 * Created: 2026-04-09
 * Function: 跨设备同步、同步状态监控、断点续传
 */

const MemoryManager = require('./MemoryManager');
const VersionControl = require('./VersionControl');

class SyncEngine {
  constructor(memoryManager, versionControl, options = {}) {
    this.memory = memoryManager;
    this.versionControl = versionControl;
    
    // 同步配置
    this.config = {
      autoSync: options.autoSync !== false,
      syncInterval: options.syncInterval || 5000, // 5 秒同步一次
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      syncDirection: options.syncDirection || 'bidirectional', // bidirectional, push, pull
      conflictResolution: options.conflictResolution || 'timestamp_last_wins',
      ...options
    };
    
    // 同步状态
    this.syncQueue = new Map(); // table -> [syncJob1, syncJob2, ...]
    this.syncStatus = new Map(); // table -> {lastSync, status, errors, ...}
    this.deviceIds = new Set(); // 已知的设备 ID
    this.pendingSyncs = new Map(); // table -> Map(deviceId -> pendingData)
    
    // 同步任务
    this.syncTimer = null;
    this.syncInProgress = new Map(); // table -> boolean
    
    // 监听器
    this.syncListeners = [];
    
    console.log('[SyncEngine] Initialized');
    console.log('[SyncEngine] Auto-sync:', this.config.autoSync);
    console.log('[SyncEngine] Sync interval:', this.config.syncInterval, 'ms');
    console.log('[SyncEngine] Conflict resolution:', this.config.conflictResolution);
    
    if (this.config.autoSync) {
      this.startAutoSync();
    }
  }

  /**
   * 启动自动同步
   */
  startAutoSync() {
    if (this.syncTimer) {
      console.warn('[SyncEngine] Auto-sync already running');
      return;
    }
    
    console.log('[SyncEngine] Starting auto-sync timer...');
    
    this.syncTimer = setInterval(() => {
      this.triggerAutoSync();
    }, this.config.syncInterval);
    
    console.log('[SyncEngine] Auto-sync started');
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (!this.syncTimer) {
      console.warn('[SyncEngine] Auto-sync not running');
      return;
    }
    
    clearInterval(this.syncTimer);
    this.syncTimer = null;
    console.log('[SyncEngine] Auto-sync stopped');
  }

  /**
   * 触发自动同步
   */
  async triggerAutoSync() {
    const tables = ['agents', 'permissions', 'deployments', 'configs', 'events', 'auditLogs'];
    
    for (const table of tables) {
      if (!this.syncInProgress.get(table)) {
        await this.syncTable(table);
      }
    }
  }

  /**
   * 同步指定表
   * @param {string} table - 表名
   * @param {string} targetDevice - 目标设备 ID (可选)
   * @returns {Object} 同步结果
   */
  async syncTable(table, targetDevice = null) {
    const startTime = Date.now();
    
    if (this.syncInProgress.get(table)) {
      console.log(`[SyncEngine] 🔄 Sync already in progress for ${table}`);
      return {
        success: false,
        table,
        error: 'Sync already in progress',
        duration: Date.now() - startTime
      };
    }
    
    try {
      this.syncInProgress.set(table, true);
      
      // 获取当前版本
      const currentVersion = this.versionControl.getCurrentVersion(table);
      
      // 检查需要同步的数据
      const syncData = this.getSyncData(table, targetDevice);
      
      if (!syncData || syncData.length === 0) {
        console.log(`[SyncEngine] ✅ No sync needed for ${table}`);
        return {
          success: true,
          table,
          version: currentVersion,
          synced: false,
          duration: Date.now() - startTime
        };
      }
      
      // 执行同步
      const result = await this.executeSync(table, syncData, targetDevice);
      
      // 更新同步状态
      this.updateSyncStatus(table, result);
      
      console.log(`[SyncEngine] ✅ Sync completed for ${table}: ${syncData.length} records synced`);
      
      return {
        success: true,
        table,
        version: currentVersion,
        recordsSynced: syncData.length,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      console.error(`[SyncEngine] ❌ Sync failed for ${table}:`, error);
      
      // 更新同步状态
      this.updateSyncStatus(table, {
        success: false,
        error: error.message,
        retries: this.getSyncRetries(table)
      });
      
      return {
        success: false,
        table,
        error: error.message,
        duration: Date.now() - startTime
      };
      
    } finally {
      this.syncInProgress.set(table, false);
    }
  }

  /**
   * 获取需要同步的数据
   * @param {string} table - 表名
   * @param {string} targetDevice - 目标设备 ID
   * @returns {Array} 同步数据
   */
  getSyncData(table, targetDevice) {
    // 获取变更历史
    const changes = this.memory.getChanges(table);
    if (!changes || changes.length === 0) {
      return [];
    }
    
    // 过滤目标设备的变更
    const targetChanges = targetDevice 
      ? changes.filter(c => c.metadata?.source !== targetDevice)
      : changes;
    
    // 返回最新变更记录
    return targetChanges.slice(-100); // 最多返回 100 条变更记录
  }

  /**
   * 执行同步
   * @param {string} table - 表名
   * @param {Array} syncData - 同步数据
   * @param {string} targetDevice - 目标设备 ID
   * @returns {Object} 同步结果
   */
  async executeSync(table, syncData, targetDevice) {
    let synced = 0;
    let conflicts = 0;
    let errors = 0;
    
    for (const change of syncData) {
      try {
        // 检查版本冲突
        const conflict = this.versionControl.checkConflict(table, {
          baseVersion: change.metadata?.baseVersion,
          data: change.data
        });
        
        if (conflict) {
          // 处理冲突
          await this.resolveSyncConflict(table, change, conflict);
          conflicts++;
          continue;
        }
        
        // 应用变更
        await this.applySyncChange(table, change);
        synced++;
        
        // 触发监听器
        this.notifyListeners('sync', {
          table,
          action: 'apply',
          changeId: change.id
        });
        
      } catch (error) {
        console.error(`[SyncEngine] ❌ Error applying change:`, error);
        errors++;
      }
    }
    
    return {
      synced,
      conflicts,
      errors,
      total: syncData.length
    };
  }

  /**
   * 应用同步变更
   * @param {string} table - 表名
   * @param {Object} change - 变更记录
   */
  async applySyncChange(table, change) {
    // 根据操作类型应用变更
    switch (change.action) {
      case 'create':
        await this.createRecord(table, change.data);
        break;
      case 'update':
        await this.updateRecord(table, change.data);
        break;
      case 'delete':
        await this.deleteRecord(table, change.data.id);
        break;
      default:
        console.warn(`[SyncEngine] Unknown action: ${change.action}`);
    }
  }

  /**
   * 处理同步冲突
   * @param {string} table - 表名
   * @param {Object} change - 变更记录
   * @param {Object} conflict - 冲突对象
   */
  async resolveSyncConflict(table, change, conflict) {
    console.log(`[SyncEngine] 🔄 Resolving conflict: ${conflict.message}`);
    
    const resolution = this.config.conflictResolution;
    
    switch (resolution) {
      case 'timestamp_last_wins':
        // 时间优先，使用较新的版本
        await this.applySyncChange(table, change);
        break;
        
      case 'preserve_target':
        // 保留目标版本，跳过同步
        console.log(`[SyncEngine] Skipping change, target version preserved`);
        break;
        
      case 'merge':
        // 合并版本
        await this.mergeVersion(table, change);
        break;
        
      default:
        // 默认使用最新版本
        await this.applySyncChange(table, change);
    }
  }

  /**
   * 合并版本
   * @param {string} table - 表名
   * @param {Object} change - 变更记录
   */
  async mergeVersion(table, change) {
    console.log(`[SyncEngine] Merging version for ${table}`);
    // 实现版本合并逻辑
  }

  /**
   * 创建记录
   * @param {string} table - 表名
   * @param {Object} data - 数据
   */
  async createRecord(table, data) {
    // 实际实现需要调用数据库
    console.log(`[SyncEngine] Creating record in ${table}:`, data);
  }

  /**
   * 更新记录
   * @param {string} table - 表名
   * @param {Object} data - 数据
   */
  async updateRecord(table, data) {
    // 实际实现需要调用数据库
    console.log(`[SyncEngine] Updating record in ${table}:`, data);
  }

  /**
   * 删除记录
   * @param {string} table - 表名
   * @param {number} id - 记录 ID
   */
  async deleteRecord(table, id) {
    // 实际实现需要调用数据库
    console.log(`[SyncEngine] Deleting record from ${table} with id:`, id);
  }

  /**
   * 更新同步状态
   * @param {string} table - 表名
   * @param {Object} result - 同步结果
   */
  updateSyncStatus(table, result) {
    const status = {
      table,
      lastSync: new Date().toISOString(),
      ...result
    };
    
    this.syncStatus.set(table, status);
    console.log(`[SyncEngine] ✅ Updated sync status for ${table}:`, status);
  }

  /**
   * 获取同步重试次数
   * @param {string} table - 表名
   * @returns {number} 重试次数
   */
  getSyncRetries(table) {
    const status = this.syncStatus.get(table);
    return status?.retries || 0;
  }

  /**
   * 注册同步监听器
   * @param {Function} callback - 回调函数
   */
  onSync(callback) {
    this.syncListeners.push(callback);
  }

  /**
   * 移除同步监听器
   * @param {Function} callback - 回调函数
   */
  offSync(callback) {
    this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
  }

  /**
   * 触发监听器
   * @param {string} event - 事件类型
   * @param {Object} data - 事件数据
   */
  notifyListeners(event, data) {
    for (const listener of this.syncListeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[SyncEngine] Error in listener:', error);
      }
    }
  }

  /**
   * 注册新设备
   * @param {string} deviceId - 设备 ID
   */
  registerDevice(deviceId) {
    if (!this.deviceIds.has(deviceId)) {
      this.deviceIds.add(deviceId);
      console.log(`[SyncEngine] ✅ Device registered: ${deviceId}`);
      return true;
    }
    return false;
  }

  /**
   * 卸载设备
   * @param {string} deviceId - 设备 ID
   */
  unregisterDevice(deviceId) {
    if (this.deviceIds.has(deviceId)) {
      this.deviceIds.delete(deviceId);
      console.log(`[SyncEngine] ❌ Device unregistered: ${deviceId}`);
      return true;
    }
    return false;
  }

  /**
   * 获取同步状态
   * @param {string} table - 表名 (可选)
   * @returns {Object} 同步状态
   */
  getSyncStatus(table = null) {
    if (table) {
      return this.syncStatus.get(table) || null;
    }
    
    const status = {};
    for (const [tableName, tableStatus] of this.syncStatus.entries()) {
      status[tableName] = tableStatus;
    }
    
    return status;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const totalSyncs = [];
    let success = 0;
    let failed = 0;
    
    for (const [table, status] of this.syncStatus.entries()) {
      totalSyncs.push({
        table,
        lastSync: status.lastSync,
        status: status.success ? 'success' : 'failed'
      });
      
      if (status.success) {
        success++;
      } else {
        failed++;
      }
    }
    
    return {
      tablesSynced: this.syncStatus.size,
      totalSyncs,
      successRate: success / (success + failed),
      deviceCount: this.deviceIds.size,
      devices: Array.from(this.deviceIds)
    };
  }

  /**
   * 导出同步状态
   * @param {string} filePath - 文件路径
   */
  exportSyncStatus(filePath) {
    const status = this.getStats();
    const data = {
      tablesSynced: status.tablesSynced,
      syncs: status.totalSyncs,
      successRate: status.successRate,
      devices: status.devices,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    };
    
    fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[SyncEngine] ✅ Sync status exported to ${filePath}`);
    return data;
  }
}

module.exports = SyncEngine;
