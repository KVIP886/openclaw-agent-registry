/**
 * VersionControl - 版本控制模块
 * Created: 2026-04-09
 * Function: 版本编号、版本历史、版本回滚
 */

const MemoryManager = require('./MemoryManager');

class VersionControl {
  constructor(memoryManager, db) {
    this.memory = memoryManager;
    this.db = db;
    
    // 版本映射表
    this.versions = new Map(); // table -> {id: versionId}
    this.history = new Map(); // table -> [version1, version2, ...]
    
    console.log('[VersionControl] Initialized');
    console.log('[VersionControl] Using MemoryManager for snapshots');
  }

  /**
   * 获取表的当前版本号
   * @param {string} table - 表名
   * @returns {number} 版本号
   */
  getCurrentVersion(table) {
    if (!this.history.has(table)) {
      return 0;
    }
    return this.history.get(table).length;
  }

  /**
   * 创建新版本
   * @param {string} table - 表名
   * @param {string} action - 操作类型 (create, update, delete)
   * @param {Array|Object} data - 数据
   * @param {Object} metadata - 元数据
   * @returns {Object} 版本对象
   */
  async createVersion(table, action, data, metadata = {}) {
    const startTime = Date.now();
    
    // 获取当前版本号
    const currentVersion = this.getCurrentVersion(table);
    const newVersion = currentVersion + 1;
    
    // 创建快照
    const snapshot = this.memory.createSnapshot(table, action, data, {
      user: metadata.user || 'system',
      sessionId: metadata.sessionId,
      version: newVersion,
      prevVersion: currentVersion
    });
    
    // 存储历史
    if (!this.history.has(table)) {
      this.history.set(table, []);
    }
    
    const history = this.history.get(table);
    history.push({
      version: newVersion,
      timestamp: snapshot.timestamp,
      action,
      data: data,
      metadata: snapshot.metadata
    });
    
    this.history.set(table, history);
    
    // 记录到内存管理器
    this.memory.recordPerformance('createVersion', Date.now() - startTime);
    
    console.log(`[VersionControl] ✅ Version ${newVersion} created for ${table} (${action})`);
    return {
      table,
      version: newVersion,
      snapshotId: snapshot.id,
      timestamp: snapshot.timestamp
    };
  }

  /**
   * 获取指定版本的数据
   * @param {string} table - 表名
   * @param {number} version - 版本号
   * @returns {Object|null} 版本对象
   */
  getVersion(table, version) {
    if (!this.history.has(table)) {
      return null;
    }
    
    const history = this.history.get(table);
    const versionObj = history.find(v => v.version === version);
    
    return versionObj || null;
  }

  /**
   * 获取当前版本的数据
   * @param {string} table - 表名
   * @returns {Object|null} 当前版本对象
   */
  getCurrentVersionData(table) {
    const version = this.getCurrentVersion(table);
    return this.getVersion(table, version);
  }

  /**
   * 获取所有版本历史
   * @param {string} table - 表名
   * @param {number} fromVersion - 起始版本
   * @param {number} toVersion - 结束版本
   * @returns {Array} 版本数组
   */
  getHistory(table, fromVersion = 1, toVersion = null) {
    if (!this.history.has(table)) {
      return [];
    }
    
    let history = this.history.get(table);
    
    if (toVersion) {
      history = history.filter(v => v.version <= toVersion);
    }
    
    return history.filter(v => v.version >= fromVersion);
  }

  /**
   * 回滚到指定版本
   * @param {string} table - 表名
   * @param {number} targetVersion - 目标版本
   * @param {Object} metadata - 元数据
   * @returns {Object} 回滚结果
   */
  async rollback(table, targetVersion, metadata = {}) {
    const startTime = Date.now();
    
    // 获取目标版本数据
    const target = this.getVersion(table, targetVersion);
    if (!target) {
      throw new Error(`Version ${targetVersion} not found for table ${table}`);
    }
    
    // 获取当前版本
    const currentVersion = this.getCurrentVersion(table);
    
    // 回滚操作
    await this.rollbackData(table, target.data, targetVersion, {
      user: metadata.user || 'system',
      reason: metadata.reason || 'rollback',
      fromVersion: currentVersion,
      toVersion: targetVersion
    });
    
    // 记录回滚事件
    const snapshot = this.memory.createSnapshot('audit', 'rollback', {
      table,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      user: metadata.user || 'system'
    }, {
      user: metadata.user || 'system',
      timestamp: new Date().toISOString()
    });
    
    this.memory.recordPerformance('rollback', Date.now() - startTime);
    
    console.log(`[VersionControl] ✅ Rolled back ${table} from v${currentVersion} to v${targetVersion}`);
    
    return {
      success: true,
      table,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      timestamp: snapshot.timestamp
    };
  }

  /**
   * 回滚数据到目标版本
   * @param {string} table - 表名
   * @param {Object} data - 目标数据
   * @param {number} targetVersion - 目标版本
   * @param {Object} metadata - 元数据
   */
  async rollbackData(table, data, targetVersion, metadata) {
    // 根据操作类型处理数据
    if (metadata.action === 'delete') {
      // 恢复删除的数据
      if (Array.isArray(data)) {
        await this.addRecords(table, data, { ...metadata, action: 'create' });
      } else {
        await this.addRecord(table, data, { ...metadata, action: 'create' });
      }
    } else if (metadata.action === 'update') {
      // 更新数据
      await this.updateRecord(table, data, { ...metadata, action: 'update' });
    } else {
      // 直接替换数据
      await this.replaceData(table, data, { ...metadata, action: 'update' });
    }
  }

  /**
   * 替换整个表的数据
   * @param {string} table - 表名
   * @param {Array} data - 数据数组
   * @param {Object} metadata - 元数据
   */
  async replaceData(table, data, metadata) {
    if (metadata && metadata.prevData) {
      // 先删除旧数据
      for (const record of metadata.prevData) {
        await this.deleteRecord(table, record.id, { user: metadata.user });
      }
    }
    
    // 添加新数据
    for (const record of data) {
      await this.addRecord(table, record, { user: metadata.user });
    }
  }

  /**
   * 检查冲突
   * @param {string} table - 表名
   * @param {Object} newVersion - 新版本数据
   * @returns {Object|null} 冲突对象或 null
   */
  checkConflict(table, newVersion) {
    const current = this.getCurrentVersionData(table);
    if (!current) {
      return null;
    }
    
    // 检查版本号冲突
    if (newVersion.baseVersion && newVersion.baseVersion !== current.version) {
      return {
        type: 'version_conflict',
        table,
        expectedVersion: current.version,
        receivedVersion: newVersion.baseVersion,
        message: `Version conflict: expected v${current.version}, received v${newVersion.baseVersion}`
      };
    }
    
    return null;
  }

  /**
   * 获取版本差异
   * @param {string} table - 表名
   * @param {number} fromVersion - 起始版本
   * @param {number} toVersion - 结束版本
   * @returns {Object} 差异对象
   */
  async getDiff(table, fromVersion, toVersion) {
    const fromData = this.getVersion(table, fromVersion)?.data;
    const toData = this.getVersion(table, toVersion)?.data;
    
    if (!fromData || !toData) {
      return { error: 'Version not found' };
    }
    
    const added = [];
    const removed = [];
    const modified = [];
    
    // 简化版差异计算
    const fromIds = new Set(Array.isArray(fromData) ? fromData.map(r => r.id) : [fromData.id]);
    const toIds = new Set(Array.isArray(toData) ? toData.map(r => r.id) : [toData.id]);
    
    // 新增
    toIds.forEach(id => {
      if (!fromIds.has(id)) {
        added.push(Array.isArray(toData) ? toData.find(r => r.id === id) : toData);
      }
    });
    
    // 删除
    fromIds.forEach(id => {
      if (!toIds.has(id)) {
        removed.push(Array.isArray(fromData) ? fromData.find(r => r.id === id) : fromData);
      }
    });
    
    // 修改
    toIds.forEach(id => {
      if (fromIds.has(id)) {
        const fromRecord = Array.isArray(fromData) ? fromData.find(r => r.id === id) : fromData;
        const toRecord = Array.isArray(toData) ? toData.find(r => r.id === id) : toData;
        
        if (JSON.stringify(fromRecord) !== JSON.stringify(toRecord)) {
          modified.push({
            id,
            from: fromRecord,
            to: toRecord
          });
        }
      }
    });
    
    return {
      table,
      fromVersion,
      toVersion,
      added,
      removed,
      modified
    };
  }

  /**
   * 清理旧版本
   * @param {string} table - 表名
   * @param {number} keepCount - 保留版本数
   */
  cleanupVersions(table, keepCount = 10) {
    if (!this.history.has(table)) {
      return 0;
    }
    
    const history = this.history.get(table);
    const removedCount = history.length - keepCount;
    
    if (removedCount > 0) {
      this.history.set(table, history.slice(-keepCount));
      console.log(`[VersionControl] 🧹 Cleaned up ${removedCount} versions from ${table}`);
    }
    
    return removedCount;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const stats = {
      tables: {},
      totalVersions: 0
    };
    
    for (const [table, history] of this.history.entries()) {
      stats.tables[table] = {
        versionCount: history.length,
        latestVersion: history[history.length - 1]?.version || 0
      };
      stats.totalVersions += history.length;
    }
    
    return stats;
  }

  /**
   * 备份版本历史
   * @param {string} table - 表名
   * @param {string} filePath - 文件路径
   */
  backupHistory(table, filePath) {
    const history = this.getHistory(table);
    const backup = {
      table,
      versionCount: history.length,
      history,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    };
    
    fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
    console.log(`[VersionControl] ✅ History backed up to ${filePath}`);
    return backup;
  }

  /**
   * 恢复版本历史
   * @param {string} filePath - 文件路径
   */
  restoreHistory(filePath) {
    const fs = require('fs');
    const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!backup.history || !Array.isArray(backup.history)) {
      throw new Error('Invalid backup file format');
    }
    
    const table = backup.table;
    if (!this.history.has(table)) {
      this.history.set(table, []);
    }
    
    const existing = this.history.get(table);
    const imported = backup.history.filter(h => !existing.find(e => e.version === h.version));
    
    this.history.set(table, [...existing, ...imported]);
    console.log(`[VersionControl] ✅ History restored: ${imported.length} new versions`);
    
    return imported.length;
  }
}

module.exports = VersionControl;
