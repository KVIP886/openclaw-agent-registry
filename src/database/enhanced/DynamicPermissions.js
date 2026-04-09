/**
 * DynamicPermissions - 动态权限模块
 * Created: 2026-04-09
 * Function: 条件授权规则、上下文感知权限、细粒度访问控制
 */

class DynamicPermissions {
  constructor() {
    // 动态规则表
    this.rules = new Map(); // ruleId -> rule
    this.ruleIndex = new Map(); // permission -> [ruleIds]
    
    // 规则统计
    this.stats = {
      totalRules: 0,
      activeRules: 0,
      evaluations: 0,
      successes: 0,
      failures: 0
    };
    
    console.log('[DynamicPermissions] Initialized');
    console.log('[DynamicPermissions] Dynamic rules loaded:', this.rules.size);
  }

  /**
   * 创建动态权限规则
   * @param {Object} rule - 规则定义
   * @returns {Object} 规则创建结果
   */
  createRule(rule) {
    const {
      ruleId,
      permission,
      condition,
      description,
      priority = 100,
      enabled = true,
      metadata = {}
    } = rule;

    if (this.rules.has(ruleId)) {
      return { success: false, error: `Rule ${ruleId} already exists`, ruleId };
    }

    // 验证规则格式
    if (!this._validateRule(rule)) {
      return { success: false, error: 'Invalid rule format' };
    }

    // 创建规则
    const ruleObj = {
      ruleId,
      permission,
      condition,
      description,
      priority,
      enabled,
      metadata,
      createdAt: new Date().toISOString(),
      createdBy: metadata.createdBy || 'system',
      lastModified: new Date().toISOString()
    };

    // 添加到规则表
    this.rules.set(ruleId, ruleObj);
    
    // 更新权限索引
    if (!this.ruleIndex.has(permission)) {
      this.ruleIndex.set(permission, []);
    }
    this.ruleIndex.get(permission).push(ruleId);

    // 更新统计
    this.stats.totalRules++;
    if (enabled) this.stats.activeRules++;

    console.log(`[DynamicPermissions] ✅ Created rule: ${ruleId} for ${permission}`);

    return {
      success: true,
      rule: ruleObj,
      timestamp: ruleObj.createdAt
    };
  }

  /**
   * 更新规则
   * @param {string} ruleId - 规则 ID
   * @param {Object} updates - 更新内容
   * @returns {Object} 更新结果
   */
  updateRule(ruleId, updates) {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return { success: false, error: `Rule ${ruleId} not found` };
    }

    // 应用更新
    const updated = {
      ...rule,
      ...updates,
      lastModified: new Date().toISOString(),
      modifiedBy: updates.modifiedBy || 'system'
    };

    // 检查权限变更
    if (updates.permission && updates.permission !== rule.permission) {
      // 从旧权限索引中移除
      const oldPermissions = this.ruleIndex.get(rule.permission);
      const index = oldPermissions.indexOf(ruleId);
      if (index > -1) {
        oldPermissions.splice(index, 1);
      }

      // 添加到新权限索引
      if (!this.ruleIndex.has(updates.permission)) {
        this.ruleIndex.set(updates.permission, []);
      }
      this.ruleIndex.get(updates.permission).push(ruleId);
    }

    // 更新规则表
    this.rules.set(ruleId, updated);

    // 更新统计
    if (updated.enabled !== rule.enabled) {
      this.stats.activeRules += updated.enabled ? 1 : -1;
    }

    console.log(`[DynamicPermissions] ✅ Updated rule: ${ruleId}`);

    return {
      success: true,
      rule: updated,
      timestamp: updated.lastModified
    };
  }

  /**
   * 删除规则
   * @param {string} ruleId - 规则 ID
   * @returns {Object} 删除结果
   */
  deleteRule(ruleId) {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return { success: false, error: `Rule ${ruleId} not found` };
    }

    // 从权限索引中移除
    const permissions = this.ruleIndex.get(rule.permission);
    const index = permissions.indexOf(ruleId);
    if (index > -1) {
      permissions.splice(index, 1);
    }

    // 删除规则
    this.rules.delete(ruleId);

    // 更新统计
    this.stats.totalRules--;
    if (rule.enabled) this.stats.activeRules--;

    console.log(`[DynamicPermissions] ❌ Deleted rule: ${ruleId}`);

    return {
      success: true,
      ruleId,
      deletedAt: new Date().toISOString()
    };
  }

  /**
   * 检查权限（动态评估）
   * @param {Object} context - 权限检查上下文
   * @returns {Object} 权限检查结果
   */
  async checkPermission(context) {
    const {
      userId,
      permission,
      resourceId,
      action,
      attributes = {}
    } = context;

    const startTime = Date.now();
    this.stats.evaluations++;

    // 获取该权限的所有规则
    const applicableRules = this.ruleIndex.get(permission) || [];
    if (applicableRules.length === 0) {
      console.log(`[DynamicPermissions] ⚠️ No rules found for permission: ${permission}`);
      return {
        allowed: false,
        reason: 'No applicable rules',
        permission,
        context,
        evaluationTime: Date.now() - startTime
      };
    }

    // 按优先级排序规则
    const sortedRules = applicableRules
      .map(ruleId => this.rules.get(ruleId))
      .filter(rule => rule && rule.enabled)
      .sort((a, b) => a.priority - b.priority);

    // 评估每条规则
    for (const rule of sortedRules) {
      const result = await this._evaluateRule(rule, context);
      
      if (result.matched) {
        this.stats.evaluations++;
        if (result.allowed) {
          this.stats.successes++;
        } else {
          this.stats.failures++;
        }

        return {
          allowed: result.allowed,
          reason: result.reason,
          matchedRule: rule.ruleId,
          permission,
          context,
          evaluationTime: Date.now() - startTime
        };
      }
    }

    // 没有规则匹配
    this.stats.evaluations++;
    this.stats.failures++;

    return {
      allowed: false,
      reason: 'No matching rules found',
      permission,
      context,
      evaluationTime: Date.now() - startTime
    };
  }

  /**
   * 评估规则
   * @param {Object} rule - 规则定义
   * @param {Object} context - 上下文
   * @returns {Object} 评估结果
   */
  async _evaluateRule(rule, context) {
    const { userId, resourceId, action, attributes } = context;

    try {
      // 构建评估环境
      const evalContext = {
        user: { id: userId },
        resource: { id: resourceId },
        action,
        attributes,
        time: new Date(),
        now: Date.now()
      };

      // 解析并评估条件
      const condition = rule.condition;
      let result;

      // 智能条件评估
      if (typeof condition === 'string') {
        // 字符串条件 - 简化评估
        result = this._evaluateConditionString(condition, evalContext);
      } else if (typeof condition === 'object') {
        // 对象条件 - 结构化评估
        result = this._evaluateConditionObject(condition, evalContext);
      } else {
        console.warn(`[DynamicPermissions] Invalid condition type: ${typeof condition}`);
        return { matched: false };
      }

      // 如果匹配，返回结果
      if (result.matched) {
        return {
          matched: true,
          allowed: result.allowed,
          reason: result.reason
        };
      }

      return { matched: false };

    } catch (error) {
      console.error(`[DynamicPermissions] Error evaluating rule ${rule.ruleId}:`, error);
      return { matched: false, error: error.message };
    }
  }

  /**
   * 评估字符串条件
   */
  _evaluateConditionString(condition, context) {
    // 简单字符串条件解析
    // 支持：equals, contains, startsWith, endsWith, regex
    
    try {
      if (condition.startsWith('equals:')) {
        const [field, value] = condition.substring(7).split(':');
        return {
          matched: context[field] === value,
          allowed: true,
          reason: `Field ${field} equals ${value}`
        };
      }
      
      if (condition.startsWith('contains:')) {
        const [field, value] = condition.substring(9).split(':');
        return {
          matched: context[field] && context[field].includes(value),
          allowed: true,
          reason: `Field ${field} contains ${value}`
        };
      }
      
      if (condition.startsWith('startsWith:')) {
        const [field, value] = condition.substring(12).split(':');
        return {
          matched: context[field] && context[field].startsWith(value),
          allowed: true,
          reason: `Field ${field} starts with ${value}`
        };
      }
      
      if (condition.startsWith('endsWith:')) {
        const [field, value] = condition.substring(9).split(':');
        return {
          matched: context[field] && context[field].endsWith(value),
          allowed: true,
          reason: `Field ${field} ends with ${value}`
        };
      }
      
      if (condition.startsWith('regex:')) {
        const [field, pattern] = condition.substring(6).split(':');
        const regex = new RegExp(pattern);
        return {
          matched: regex.test(context[field]),
          allowed: true,
          reason: `Field ${field} matches ${pattern}`
        };
      }

      // 默认：返回不匹配
      return { matched: false };
      
    } catch (error) {
      console.error(`[DynamicPermissions] Error evaluating condition:`, error);
      return { matched: false, error: error.message };
    }
  }

  /**
   * 评估对象条件
   */
  _evaluateConditionObject(condition, context) {
    const { field, operator, value } = condition;
    
    const fieldValue = context[field];
    let matched = false;

    switch (operator) {
      case 'eq':
        matched = fieldValue === value;
        break;
      case 'neq':
        matched = fieldValue !== value;
        break;
      case 'gt':
        matched = fieldValue > value;
        break;
      case 'gte':
        matched = fieldValue >= value;
        break;
      case 'lt':
        matched = fieldValue < value;
        break;
      case 'lte':
        matched = fieldValue <= value;
        break;
      case 'in':
        matched = value.includes(fieldValue);
        break;
      case 'notIn':
        matched = !value.includes(fieldValue);
        break;
      case 'contains':
        matched = fieldValue && fieldValue.includes(value);
        break;
      case 'startsWith':
        matched = fieldValue && fieldValue.startsWith(value);
        break;
      case 'endsWith':
        matched = fieldValue && fieldValue.endsWith(value);
        break;
      case 'regex':
        matched = new RegExp(value).test(fieldValue);
        break;
      default:
        console.warn(`[DynamicPermissions] Unknown operator: ${operator}`);
        return { matched: false };
    }

    return {
      matched,
      allowed: matched,
      reason: `Condition ${field} ${operator} ${value} ${matched ? 'met' : 'not met'}`
    };
  }

  /**
   * 验证规则格式
   */
  _validateRule(rule) {
    const { ruleId, permission, condition, priority } = rule;

    if (!ruleId || typeof ruleId !== 'string') {
      return false;
    }

    if (!permission || typeof permission !== 'string') {
      return false;
    }

    if (!condition) {
      return false;
    }

    if (priority && (typeof priority !== 'number' || priority < 0 || priority > 1000)) {
      return false;
    }

    return true;
  }

  /**
   * 获取规则列表
   * @param {Object} filters - 过滤条件
   * @returns {Array} 规则列表
   */
  getRules(filters = {}) {
    let rules = Array.from(this.rules.values());

    if (filters.permission) {
      rules = rules.filter(r => r.permission === filters.permission);
    }

    if (filters.enabled !== undefined) {
      rules = rules.filter(r => r.enabled === filters.enabled);
    }

    if (filters.priorityMin) {
      rules = rules.filter(r => r.priority >= filters.priorityMin);
    }

    if (filters.priorityMax) {
      rules = rules.filter(r => r.priority <= filters.priorityMax);
    }

    return rules;
  }

  /**
   * 获取权限的所有规则
   * @param {string} permission - 权限名称
   * @returns {Array} 规则列表
   */
  getRulesForPermission(permission) {
    const ruleIds = this.ruleIndex.get(permission) || [];
    return ruleIds
      .map(ruleId => this.rules.get(ruleId))
      .filter(rule => rule);
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      rulesByPermission: Object.fromEntries(
        Array.from(this.ruleIndex.entries()).map(([perm, ruleIds]) => [
          perm,
          ruleIds.length
        ])
      ),
      activeRules: this.stats.activeRules,
      evaluationRate: this.stats.evaluations > 0 
        ? (this.stats.successes / this.stats.evaluations) * 100 
        : 0
    };
  }

  /**
   * 备份规则
   * @param {string} filePath - 文件路径
   * @returns {Object} 备份结果
   */
  exportRules(filePath) {
    const fs = require('fs');
    const backup = {
      rules: Array.from(this.rules.values()),
      stats: this.stats,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

    console.log(`[DynamicPermissions] ✅ Rules exported to ${filePath}`);

    return backup;
  }

  /**
   * 导入规则
   * @param {string} filePath - 文件路径
   * @returns {Object} 导入结果
   */
  importRules(filePath) {
    const fs = require('fs');
    const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const imported = [];
    for (const rule of backup.rules) {
      const result = this.createRule(rule);
      if (result.success) {
        imported.push(rule.ruleId);
      }
    }

    console.log(`[DynamicPermissions] ✅ Imported ${imported.length} rules from ${filePath}`);

    return {
      success: true,
      imported,
      count: imported.length
    };
  }
}

module.exports = DynamicPermissions;
