/**
 * PermissionAuditor - 权限审计模块
 * Created: 2026-04-09
 * Function: 权限使用审计、违规检测、审计报告
 */

const fs = require('fs');
const path = require('path');

class PermissionAuditor {
  constructor(options = {}) {
    // 审计日志
    this.auditLogs = [];
    this.maxLogs = options.maxLogs || 10000;
    
    // 审计报告
    this.reports = new Map();
    
    // 审计配置
    this.config = {
      enabled: options.enabled !== false,
      logLevel: options.logLevel || 'info', // error, warn, info, debug
      autoArchive: options.autoArchive || true,
      archiveInterval: options.archiveInterval || 86400000, // 24 小时
      alertOnViolation: options.alertOnViolation || true
    };
    
    // 审计规则
    this.rules = {
      unauthorizedAccess: [], // 未授权访问
      privilegeEscalation: [], // 权限提升
      suspiciousActivity: [], // 可疑活动
      complianceViolation: [] // 合规违规
    };
    
    // 统计
    this.stats = {
      totalEvents: 0,
      violations: 0,
      warnings: 0,
      info: 0,
      alerts: 0
    };
    
    console.log('[PermissionAuditor] Initialized');
    console.log('[PermissionAuditor] Enabled:', this.config.enabled);
    console.log('[PermissionAuditor] Log level:', this.config.logLevel);
    
    // 启动自动归档
    this.startAutoArchive();
  }

  /**
   * 记录审计事件
   * @param {Object} event - 审计事件
   * @returns {Object} 记录结果
   */
  logEvent(event) {
    if (!this.config.enabled) {
      return { success: false, error: 'Auditing is disabled' };
    }

    const {
      userId,
      action,
      resource,
      permission,
      result,
      details = {},
      context = {}
    } = event;

    // 创建审计记录
    const auditRecord = {
      eventId: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      permission,
      result: result || 'success',
      details,
      context,
      severity: this._determineSeverity(result, details)
    };

    // 添加到日志
    this.auditLogs.push(auditRecord);

    // 限制日志数量
    if (this.auditLogs.length > this.maxLogs) {
      this.auditLogs.shift();
    }

    // 更新统计
    this.stats.totalEvents++;
    if (auditRecord.severity === 'error') this.stats.violations++;
    else if (auditRecord.severity === 'warn') this.stats.warnings++;
    else this.stats.info++;

    // 检查违规
    this._checkViolations(auditRecord);

    // 生成日志消息
    const message = this._generateLogMessage(auditRecord);
    this._log(message);

    return {
      success: true,
      eventId: auditRecord.eventId,
      timestamp: auditRecord.timestamp,
      severity: auditRecord.severity
    };
  }

  /**
   * 检查违规
   * @param {Object} record - 审计记录
   */
  _checkViolations(record) {
    const { userId, action, resource, permission, result, severity } = record;

    // 未授权访问
    if (result === 'denied' && severity === 'error') {
      this.rules.unauthorizedAccess.push({
        eventId: record.eventId,
        timestamp: record.timestamp,
        userId,
        action,
        resource,
        permission,
        details: record.details
      });

      // 触发警报
      if (this.config.alertOnViolation) {
        this._triggerAlert('unauthorized_access', record);
      }
    }

    // 权限提升检测
    if (action === 'permission:grant' && userId !== 'system') {
      this.rules.privilegeEscalation.push({
        eventId: record.eventId,
        timestamp: record.timestamp,
        userId,
        action,
        resource,
        permission,
        details: record.details
      });
    }

    // 可疑活动检测
    if (this._isSuspiciousActivity(record)) {
      this.rules.suspiciousActivity.push({
        eventId: record.eventId,
        timestamp: record.timestamp,
        userId,
        action,
        resource,
        permission,
        details: record.details
      });

      if (this.config.alertOnViolation) {
        this._triggerAlert('suspicious_activity', record);
      }
    }
  }

  /**
   * 判断是否是可疑活动
   */
  _isSuspiciousActivity(record) {
    const { action, result, details } = record;

    // 短时间内多次失败
    if (result === 'denied') {
      const recentFailures = this.auditLogs
        .slice(-100)
        .filter(log => log.userId === record.userId && log.result === 'denied')
        .length;

      if (recentFailures >= 5) {
        return true;
      }
    }

    // 非工作时间访问
    const timestamp = new Date(record.timestamp);
    const hour = timestamp.getHours();
    if (hour < 6 || hour > 22) {
      if (action === 'agent:delete' || action === 'permission:manage') {
        return true;
      }
    }

    // 高频操作
    const recentOps = this.auditLogs
      .slice(-100)
      .filter(log => log.userId === record.userId && log.action === action);

    if (recentOps.length >= 20) {
      return true;
    }

    return false;
  }

  /**
   * 确定严重性级别
   */
  _determineSeverity(result, details) {
    if (result === 'denied') return 'error';
    if (result === 'warning') return 'warn';
    if (details.warning) return 'warn';
    return 'info';
  }

  /**
   * 生成日志消息
   */
  _generateLogMessage(record) {
    const { timestamp, userId, action, resource, permission, result, severity } = record;

    const timestampStr = new Date(timestamp).toISOString();
    const message = `${timestampStr} [${severity.toUpperCase()}] User ${userId} - ${action} on ${resource} (${permission}) - ${result}`;

    return message;
  }

  /**
   * 生成日志（根据配置级别）
   */
  _log(message) {
    const { logLevel } = this.config;

    if (logLevel === 'error' && message.includes('[ERROR]')) {
      console.error(`[PermissionAuditor] ${message}`);
    } else if (logLevel === 'warn' && (message.includes('[WARN]') || message.includes('[ERROR]'))) {
      console.warn(`[PermissionAuditor] ${message}`);
    } else if (logLevel === 'info' || logLevel === 'debug') {
      console.log(`[PermissionAuditor] ${message}`);
    }
  }

  /**
   * 触发警报
   * @param {string} type - 警报类型
   * @param {Object} record - 记录
   */
  _triggerAlert(type, record) {
    this.stats.alerts++;

    console.log(`[PermissionAuditor] 🚨 ALERT: ${type} - User ${record.userId} at ${record.timestamp}`);

    // 这里可以集成邮件、Slack、钉钉等通知
  }

  /**
   * 查询审计日志
   * @param {Object} filters - 过滤条件
   * @returns {Array} 审计日志列表
   */
  getAuditLogs(filters = {}) {
    let logs = [...this.auditLogs];

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action);
    }

    if (filters.permission) {
      logs = logs.filter(log => log.permission === filters.permission);
    }

    if (filters.result) {
      logs = logs.filter(log => log.result === filters.result);
    }

    if (filters.severity) {
      logs = logs.filter(log => log.severity === filters.severity);
    }

    if (filters.startTime) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startTime));
    }

    if (filters.endTime) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endTime));
    }

    if (filters.limit) {
      logs = logs.slice(-filters.limit);
    }

    return logs;
  }

  /**
   * 获取违规列表
   * @param {string} type - 违规类型
   * @returns {Array} 违规列表
   */
  getViolations(type = 'all') {
    if (type === 'all') {
      return {
        unauthorizedAccess: this.rules.unauthorizedAccess,
        privilegeEscalation: this.rules.privilegeEscalation,
        suspiciousActivity: this.rules.suspiciousActivity,
        complianceViolation: this.rules.complianceViolation
      };
    }

    return this.rules[type] || [];
  }

  /**
   * 生成审计报告
   * @param {Object} options - 报告选项
   * @returns {Object} 审计报告
   */
  generateReport(options = {}) {
    const {
      startDate,
      endDate,
      type = 'summary' // summary, detailed, violation
    } = options;

    const reportId = `report-${Date.now()}`;
    const now = new Date();

    let logs = this.auditLogs;

    // 过滤时间范围
    if (startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate));
    }

    if (endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate));
    }

    // 生成报告
    const report = {
      reportId,
      type,
      generatedAt: now.toISOString(),
      generatedBy: 'PermissionAuditor v1.0',
      period: {
        start: startDate || 'all time',
        end: endDate || 'now'
      },
      summary: this._generateReportSummary(logs),
      violations: this._generateViolationsReport(),
      activity: this._generateActivityReport(logs),
      recommendations: this._generateRecommendations(logs)
    };

    // 保存报告
    this.reports.set(reportId, report);

    console.log(`[PermissionAuditor] ✅ Generated report: ${reportId}`);

    return report;
  }

  /**
   * 生成报告摘要
   */
  _generateReportSummary(logs) {
    const total = logs.length;
    const successes = logs.filter(l => l.result === 'success').length;
    const denials = logs.filter(l => l.result === 'denied').length;
    const warnings = logs.filter(l => l.severity === 'warn').length;
    const errors = logs.filter(l => l.severity === 'error').length;

    return {
      totalEvents: total,
      successes,
      denials,
      warnings,
      errors,
      successRate: total > 0 ? (successes / total * 100).toFixed(2) : 0,
      denialRate: total > 0 ? (denials / total * 100).toFixed(2) : 0
    };
  }

  /**
   * 生成违规报告
   */
  _generateViolationsReport() {
    const violations = {
      unauthorizedAccess: this.rules.unauthorizedAccess.length,
      privilegeEscalation: this.rules.privilegeEscalation.length,
      suspiciousActivity: this.rules.suspiciousActivity.length
    };

    const totalViolations = Object.values(violations).reduce((a, b) => a + b, 0);

    return {
      ...violations,
      total: totalViolations,
      mostCommon: this._findMostCommonViolation()
    };
  }

  /**
   * 生成活动报告
   */
  _generateActivityReport(logs) {
    // 用户活动统计
    const userActivity = new Map();
    for (const log of logs) {
      if (!userActivity.has(log.userId)) {
        userActivity.set(log.userId, {
          userId: log.userId,
          total: 0,
          successes: 0,
          denials: 0
        });
      }

      const user = userActivity.get(log.userId);
      user.total++;
      if (log.result === 'success') user.successes++;
      if (log.result === 'denied') user.denials++;
    }

    // 权限使用统计
    const permissionUsage = new Map();
    for (const log of logs) {
      if (!permissionUsage.has(log.permission)) {
        permissionUsage.set(log.permission, {
          permission: log.permission,
          total: 0,
          successes: 0,
          denials: 0
        });
      }

      const perm = permissionUsage.get(log.permission);
      perm.total++;
      if (log.result === 'success') perm.successes++;
      if (log.result === 'denied') perm.denials++;
    }

    return {
      users: Array.from(userActivity.values()).sort((a, b) => b.total - a.total),
      permissions: Array.from(permissionUsage.values()).sort((a, b) => b.total - a.total)
    };
  }

  /**
   * 生成推荐
   */
  _generateRecommendations(logs) {
    const recommendations = [];

    // 高失败权限推荐
    for (const log of logs) {
      if (log.result === 'denied') {
        recommendations.push({
          type: 'denied_permission',
          severity: 'warn',
          permission: log.permission,
          userId: log.userId,
          message: `Permission ${log.permission} denied for user ${log.userId}`,
          suggestion: 'Review permission assignment or access policy'
        });
      }
    }

    // 去重
    const unique = [];
    const seen = new Set();
    for (const rec of recommendations) {
      const key = `${rec.type}-${rec.permission}-${rec.userId}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rec);
      }
    }

    return unique.slice(0, 10); // 最多 10 条推荐
  }

  /**
   * 查找最常见的违规
   */
  _findMostCommonViolation() {
    const violations = this.getViolations();
    const counts = {
      unauthorizedAccess: 0,
      privilegeEscalation: 0,
      suspiciousActivity: 0
    };

    for (const key of Object.keys(counts)) {
      counts[key] = violations[key].length;
    }

    const mostCommon = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0];

    return mostCommon[1] > 0 ? mostCommon[0] : 'none';
  }

  /**
   * 导出审计日志
   * @param {string} filePath - 文件路径
   * @returns {Object} 导出结果
   */
  exportLogs(filePath) {
    const exportData = {
      logs: this.auditLogs,
      statistics: this.stats,
      violations: this.getViolations(),
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        totalCount: this.auditLogs.length
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

    console.log(`[PermissionAuditor] ✅ Audit logs exported to ${filePath}`);

    return exportData;
  }

  /**
   * 导入审计日志
   * @param {string} filePath - 文件路径
   * @returns {Object} 导入结果
   */
  importLogs(filePath) {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const imported = [];
    for (const log of data.logs) {
      this.auditLogs.push(log);
      imported.push(log.eventId);
    }

    console.log(`[PermissionAuditor] ✅ Imported ${imported.length} audit logs from ${filePath}`);

    return {
      success: true,
      imported: imported.length
    };
  }

  /**
   * 归档日志
   * @returns {Object} 归档结果
   */
  archiveLogs() {
    if (this.auditLogs.length === 0) {
      return { success: false, error: 'No logs to archive' };
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const archiveId = `archive-${timestamp}`;
    const archivePath = path.join(process.cwd(), 'audit_archive', `${archiveId}.json`);

    // 创建归档目录
    const archiveDir = path.dirname(archivePath);
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const archiveData = {
      archiveId,
      archivedAt: new Date().toISOString(),
      logCount: this.auditLogs.length,
      logs: [...this.auditLogs]
    };

    fs.writeFileSync(archivePath, JSON.stringify(archiveData, null, 2));

    // 清空日志
    this.auditLogs = [];

    console.log(`[PermissionAuditor] ✅ Archived ${archiveData.logCount} logs to ${archivePath}`);

    return {
      success: true,
      archiveId,
      archivePath,
      archivedCount: archiveData.logCount
    };
  }

  /**
   * 启动自动归档
   */
  startAutoArchive() {
    if (!this.config.autoArchive) {
      console.log('[PermissionAuditor] Auto-archive disabled');
      return;
    }

    console.log('[PermissionAuditor] Starting auto-archive scheduler...');

    this.archiveTimer = setInterval(() => {
      this.archiveLogs();
    }, this.config.archiveInterval);

    console.log('[PermissionAuditor] ✅ Auto-archive scheduler started');
  }

  /**
   * 停止自动归档
   */
  stopAutoArchive() {
    if (this.archiveTimer) {
      clearInterval(this.archiveTimer);
      this.archiveTimer = null;
      console.log('[PermissionAuditor] Auto-archive scheduler stopped');
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      logCount: this.auditLogs.length,
      violations: {
        unauthorizedAccess: this.rules.unauthorizedAccess.length,
        privilegeEscalation: this.rules.privilegeEscalation.length,
        suspiciousActivity: this.rules.suspiciousActivity.length
      },
      reports: this.reports.size,
      enabled: this.config.enabled
    };
  }
}

module.exports = PermissionAuditor;
