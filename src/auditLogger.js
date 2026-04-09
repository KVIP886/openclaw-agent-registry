/**
 * Audit Logger Module
 * Comprehensive Audit Logging System
 * Created: 2026-04-09
 */

const fs = require('fs');
const path = require('path');

class AuditLogger {
  constructor(options = {}) {
    this.logDir = options.logDir || path.join(__dirname, '..', 'logs');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 10;
    this.logs = new Map();
    this.rotationSchedule = options.rotationSchedule || 'daily';
    this._initializeLogger();
  }

  /**
   * 初始化日志系统
   */
  _initializeLogger() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 记录审计日志
   */
  async log(eventId, action, user, details = {}) {
    const logEntry = {
      id: this._generateLogId(),
      eventId,
      timestamp: new Date().toISOString(),
      user,
      action,
      details: details || {},
      metadata: {
        ip: details.ip || 'unknown',
        userAgent: details.userAgent || 'unknown',
        sessionId: details.sessionId || null
      }
    };

    // 保存到内存
    const logKey = `${user}_${action}_${logEntry.timestamp}`;
    this.logs.set(logKey, logEntry);

    // 异步写入文件
    this._writeToFile(logEntry);

    // 触发事件
    this.emit('audit_logged', logEntry);

    return logEntry;
  }

  /**
   * 写入文件（异步）
   */
  async _writeToFile(logEntry) {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `audit_${today}.log`);
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      await fs.promises.appendFile(logFile, logLine);
      
      // 检查是否需要轮转
      await this._checkRotation(logFile);
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * 检查日志轮转
   */
  async _checkRotation(logFile) {
    try {
      const stats = await fs.promises.stat(logFile);
      
      if (stats.size > this.maxFileSize) {
        await this._rotateLogs();
      }
    } catch (error) {
      // 文件不存在或其他错误，忽略
    }
  }

  /**
   * 日志轮转
   */
  async _rotateLogs() {
    try {
      const files = await fs.promises.readdir(this.logDir);
      const logFiles = files.filter(f => f.startsWith('audit_') && f.endsWith('.log'));
      
      // 删除最旧的日志
      if (logFiles.length >= this.maxFiles) {
        const oldestFile = await this._getOldestLog(logFiles);
        if (oldestFile) {
          await fs.promises.unlink(path.join(this.logDir, oldestFile));
        }
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  /**
   * 获取最旧日志文件
   */
  async _getOldestLog(files) {
    let oldestFile = null;
    let oldestTime = Infinity;

    for (const file of files) {
      try {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.promises.stat(filePath);
        if (stats.mtimeMs < oldestTime) {
          oldestTime = stats.mtimeMs;
          oldestFile = file;
        }
      } catch (error) {
        // 忽略错误
      }
    }

    return oldestFile;
  }

  /**
   * 生成日志 ID
   */
  _generateLogId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 查询日志
   */
  async query(options = {}) {
    const {
      userId,
      action,
      startDate,
      endDate,
      limit = 100
    } = options;

    let filteredLogs = Array.from(this.logs.values());

    if (userId) {
      filteredLogs = filteredLogs.filter(log => 
        log.user.id === userId || log.user.username === userId
      );
    }

    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    if (startDate) {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= start
      );
    }

    if (endDate) {
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= end
      );
    }

    // 按时间排序，最新的在前
    filteredLogs.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    return filteredLogs.slice(0, limit);
  }

  /**
   * 导出日志
   */
  async export(options = {}) {
    const logs = await this.query(options);
    return {
      logs,
      count: logs.length,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    const logs = Array.from(this.logs.values());
    
    const stats = {
      total: logs.length,
      byAction: {},
      byUser: {},
      last24Hours: 0
    };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    logs.forEach(log => {
      // 按动作统计
      const action = log.action;
      stats.byAction[action] = (stats.byAction[action] || 0) + 1;

      // 按用户统计
      const userId = log.user.id || log.user.username || 'unknown';
      stats.byUser[userId] = (stats.byUser[userId] || 0) + 1;

      // 最近 24 小时
      if (new Date(log.timestamp) >= yesterday) {
        stats.last24Hours++;
      }
    });

    return stats;
  }

  /**
   * 清空日志
   */
  clear() {
    this.logs.clear();
    return true;
  }

  /**
   * 事件发射器
   */
  emit(event, data) {
    console.log(`[AUDIT] ${event}:`, data);
  }

  /**
   * 记录用户登录
   */
  async login(userId, username, success, details = {}) {
    return this.log('system', 'login', {
      id: userId,
      username
    }, {
      ...details,
      success
    });
  }

  /**
   * 记录用户登出
   */
  async logout(userId, username, details = {}) {
    return this.log('system', 'logout', {
      id: userId,
      username
    }, details);
  }

  /**
   * 记录权限变更
   */
  async permissionChange(userId, resourceId, permission, action, details = {}) {
    return this.log('system', 'permission_change', {
      id: userId
    }, {
      resourceId,
      permission,
      action,
      ...details
    });
  }

  /**
   * 记录配置变更
   */
  async configChange(userId, configKey, oldValue, newValue, details = {}) {
    return this.log('system', 'config_change', {
      id: userId
    }, {
      configKey,
      oldValue,
      newValue,
      ...details
    });
  }
}

module.exports = AuditLogger;
