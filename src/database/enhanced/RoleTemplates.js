/**
 * RoleTemplates - 角色模板模块
 * Created: 2026-04-09
 * Function: 角色模板定义、角色创建、角色复制
 */

class RoleTemplates {
  constructor() {
    // 模板列表
    this.templates = new Map();
    
    // 用户自定义模板
    this.customTemplates = new Map();
    
    // 模板统计
    this.stats = {
      totalTemplates: 0,
      systemTemplates: 0,
      customTemplates: 0,
      usageCount: 0
    };
    
    console.log('[RoleTemplates] Initialized');
    console.log('[RoleTemplates] Templates loaded:', this.templates.size);
    
    // 初始化系统模板
    this._initializeSystemTemplates();
  }

  /**
   * 初始化系统模板
   */
  _initializeSystemTemplates() {
    // 管理员模板
    this.templates.set('admin_full', {
      id: 'admin_full',
      name: 'Full Administrator',
      description: '完整管理员权限 - 所有权限',
      permissions: [
        'agent:create',
        'agent:read',
        'agent:update',
        'agent:delete',
        'agent:deploy',
        'agent:undeploy',
        'agent:audit',
        'permission:create',
        'permission:read',
        'permission:update',
        'permission:delete',
        'permission:manage',
        'config:create',
        'config:read',
        'config:update',
        'config:delete',
        'config:manage',
        'system:admin',
        'health:monitor',
        'health:diagnose'
      ],
      inheritFrom: null,
      isSystem: true,
      createdAt: new Date().toISOString(),
      usageCount: 0
    });

    // 操作员模板
    this.templates.set('operator_standard', {
      id: 'operator_standard',
      name: 'Standard Operator',
      description: '标准操作员权限 - 操作权限',
      permissions: [
        'agent:read',
        'agent:start',
        'agent:stop',
        'agent:restart',
        'agent:logs',
        'agent:health',
        'permission:read',
        'config:read',
        'health:monitor'
      ],
      inheritFrom: null,
      isSystem: true,
      createdAt: new Date().toISOString(),
      usageCount: 0
    });

    // 观察者模板
    this.templates.set('observer_readonly', {
      id: 'observer_readonly',
      name: 'Read-only Observer',
      description: '只读观察者 - 只读权限',
      permissions: [
        'agent:read',
        'agent:health',
        'agent:logs:readonly',
        'permission:read',
        'config:read:readonly',
        'health:status',
        'audit:read'
      ],
      inheritFrom: null,
      isSystem: true,
      createdAt: new Date().toISOString(),
      usageCount: 0
    });

    // 开发者模板
    this.templates.set('developer', {
      id: 'developer',
      name: 'Developer',
      description: '开发者权限 - 开发和测试权限',
      permissions: [
        'agent:create',
        'agent:read',
        'agent:update',
        'agent:delete',
        'agent:deploy',
        'agent:logs',
        'agent:test',
        'permission:read',
        'config:create',
        'config:read',
        'config:update',
        'health:status'
      ],
      inheritFrom: null,
      isSystem: true,
      createdAt: new Date().toISOString(),
      usageCount: 0
    });

    // DevOps 模板
    this.templates.set('devops', {
      id: 'devops',
      name: 'DevOps Engineer',
      description: 'DevOps 工程师 - 部署和运维权限',
      permissions: [
        'agent:read',
        'agent:deploy',
        'agent:undeploy',
        'agent:restart',
        'agent:logs',
        'agent:health',
        'agent:monitor',
        'permission:read',
        'config:read',
        'config:update',
        'health:monitor',
        'health:diagnose'
      ],
      inheritFrom: null,
      isSystem: true,
      createdAt: new Date().toISOString(),
      usageCount: 0
    });

    // 安全审计员模板
    this.templates.set('security_auditor', {
      id: 'security_auditor',
      name: 'Security Auditor',
      description: '安全审计员 - 审计和合规权限',
      permissions: [
        'agent:read',
        'agent:audit',
        'permission:read',
        'permission:audit',
        'config:read',
        'config:audit',
        'audit:read',
        'audit:export',
        'compliance:check'
      ],
      inheritFrom: null,
      isSystem: true,
      createdAt: new Date().toISOString(),
      usageCount: 0
    });

    // 只读模板
    this.templates.set('readonly', {
      id: 'readonly',
      name: 'Read Only',
      description: '只读访问 - 只能查看',
      permissions: [
        'agent:read',
        'permission:read',
        'config:read:readonly',
        'health:status',
        'audit:read'
      ],
      inheritFrom: null,
      isSystem: true,
      createdAt: new Date().toISOString(),
      usageCount: 0
    });

    // 自定义模板
    this.templates.set('custom_basic', {
      id: 'custom_basic',
      name: 'Basic Custom Role',
      description: '基础自定义角色 - 最小权限',
      permissions: [],
      inheritFrom: null,
      isSystem: false,
      createdAt: new Date().toISOString(),
      usageCount: 0
    });

    // 更新统计
    this.stats.totalTemplates = this.templates.size;
    this.stats.systemTemplates = this.templates.size;
    
    console.log(`[RoleTemplates] ✅ Loaded ${this.stats.totalTemplates} system templates`);
  }

  /**
   * 创建角色（从模板）
   * @param {Object} options - 选项
   * @returns {Object} 创建结果
   */
  createRoleFromTemplate(options) {
    const {
      templateId,
      roleId,
      roleName,
      description,
      overrides = {},
      userId = 'system'
    } = options;

    // 查找模板
    const template = this.getTemplate(templateId);
    if (!template) {
      return {
        success: false,
        error: `Template ${templateId} not found`,
        templateId
      };
    }

    // 检查是否已存在同名角色
    if (this.templates.has(roleId) || this.customTemplates.has(roleId)) {
      return {
        success: false,
        error: `Role ${roleId} already exists`,
        roleId
      };
    }

    // 创建新角色
    const newRole = {
      id: roleId,
      name: roleName || template.name,
      description: description || template.description,
      permissions: [...template.permissions],
      inheritFrom: template.inheritFrom,
      isSystem: false,
      isCustom: true,
      createdBy: userId,
      createdFromTemplate: templateId,
      createdAt: new Date().toISOString(),
      usageCount: 0,
      metadata: {
        ...template.metadata,
        ...overrides.metadata
      }
    };

    // 应用权限覆盖
    if (overrides.permissions) {
      newRole.permissions = overrides.permissions;
    }

    // 存储自定义模板
    this.customTemplates.set(roleId, newRole);

    // 更新统计
    this.stats.customTemplates++;
    this.stats.totalTemplates++;

    console.log(`[RoleTemplates] ✅ Created role ${roleId} from template ${templateId}`);

    return {
      success: true,
      role: newRole,
      templateId,
      timestamp: newRole.createdAt
    };
  }

  /**
   * 复制角色
   * @param {string} sourceRoleId - 源角色 ID
   * @param {Object} options - 选项
   * @returns {Object} 复制结果
   */
  copyRole(sourceRoleId, options) {
    const sourceRole = this.getRole(sourceRoleId);
    if (!sourceRole) {
      return {
        success: false,
        error: `Role ${sourceRoleId} not found`,
        sourceRoleId
      };
    }

    const {
      roleId = `${sourceRoleId}_copy`,
      roleName = `${sourceRole.name} (Copy)`,
      description = sourceRole.description
    } = options;

    // 检查是否已存在
    if (this.templates.has(roleId) || this.customTemplates.has(roleId)) {
      return {
        success: false,
        error: `Role ${roleId} already exists`,
        roleId
      };
    }

    // 创建复制的角色
    const newRole = {
      ...sourceRole,
      id: roleId,
      name: roleName,
      description: description,
      isSystem: false,
      isCustom: true,
      copiedFrom: sourceRoleId,
      copiedAt: new Date().toISOString(),
      createdBy: 'system',
      usageCount: 0
    };

    // 存储自定义模板
    this.customTemplates.set(roleId, newRole);

    // 更新统计
    this.stats.customTemplates++;
    this.stats.totalTemplates++;

    console.log(`[RoleTemplates] ✅ Copied role ${sourceRoleId} to ${roleId}`);

    return {
      success: true,
      role: newRole,
      sourceRoleId,
      timestamp: newRole.copiedAt
    };
  }

  /**
   * 获取模板
   * @param {string} templateId - 模板 ID
   * @returns {Object|null} 模板
   */
  getTemplate(templateId) {
    // 检查系统模板
    let template = this.templates.get(templateId);
    if (template) {
      return template;
    }

    // 检查自定义模板
    template = this.customTemplates.get(templateId);
    if (template) {
      return template;
    }

    return null;
  }

  /**
   * 获取角色
   * @param {string} roleId - 角色 ID
   * @returns {Object|null} 角色
   */
  getRole(roleId) {
    // 检查系统模板
    let role = this.templates.get(roleId);
    if (role) {
      return role;
    }

    // 检查自定义模板
    role = this.customTemplates.get(roleId);
    if (role) {
      return role;
    }

    return null;
  }

  /**
   * 获取所有模板
   * @param {Object} filters - 过滤条件
   * @returns {Array} 模板列表
   */
  getAllTemplates(filters = {}) {
    let templates = [];

    // 添加系统模板
    for (const template of this.templates.values()) {
      templates.push(template);
    }

    // 添加自定义模板
    if (filters.includeCustom !== false) {
      for (const template of this.customTemplates.values()) {
        templates.push(template);
      }
    }

    // 应用过滤
    if (filters.isSystem !== undefined) {
      templates = templates.filter(t => t.isSystem === filters.isSystem);
    }

    if (filters.includeSystem !== false) {
      templates = templates.filter(t => !t.isSystem || filters.includeSystem === true);
    }

    if (filters.permissionsCountMin) {
      templates = templates.filter(t => t.permissions.length >= filters.permissionsCountMin);
    }

    if (filters.permissionsCountMax) {
      templates = templates.filter(t => t.permissions.length <= filters.permissionsCountMax);
    }

    // 排序
    templates.sort((a, b) => a.name.localeCompare(b.name));

    return templates;
  }

  /**
   * 创建自定义模板
   * @param {Object} template - 模板定义
   * @returns {Object} 创建结果
   */
  createCustomTemplate(template) {
    const {
      templateId,
      name,
      description,
      permissions = [],
      inheritFrom,
      metadata = {}
    } = template;

    // 检查 ID 是否已存在
    if (this.templates.has(templateId) || this.customTemplates.has(templateId)) {
      return {
        success: false,
        error: `Template ${templateId} already exists`,
        templateId
      };
    }

    // 创建新模板
    const newTemplate = {
      id: templateId,
      name,
      description,
      permissions,
      inheritFrom,
      isSystem: false,
      isCustom: true,
      metadata,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    };

    // 存储自定义模板
    this.customTemplates.set(templateId, newTemplate);

    // 更新统计
    this.stats.customTemplates++;
    this.stats.totalTemplates++;

    console.log(`[RoleTemplates] ✅ Created custom template ${templateId}`);

    return {
      success: true,
      template: newTemplate,
      timestamp: newTemplate.createdAt
    };
  }

  /**
   * 更新自定义模板
   * @param {string} templateId - 模板 ID
   * @param {Object} updates - 更新内容
   * @returns {Object} 更新结果
   */
  updateCustomTemplate(templateId, updates) {
    // 检查是否自定义模板
    const template = this.customTemplates.get(templateId);
    if (!template) {
      return {
        success: false,
        error: `Template ${templateId} not found (or is system template)`,
        templateId
      };
    }

    // 应用更新
    const updated = {
      ...template,
      ...updates,
      lastModified: new Date().toISOString(),
      modifiedBy: updates.modifiedBy || 'system'
    };

    // 更新自定义模板
    this.customTemplates.set(templateId, updated);

    console.log(`[RoleTemplates] ✅ Updated custom template ${templateId}`);

    return {
      success: true,
      template: updated,
      timestamp: updated.lastModified
    };
  }

  /**
   * 删除自定义模板
   * @param {string} templateId - 模板 ID
   * @returns {Object} 删除结果
   */
  deleteCustomTemplate(templateId) {
    // 检查是否自定义模板
    const template = this.customTemplates.get(templateId);
    if (!template) {
      return {
        success: false,
        error: `Template ${templateId} not found (or is system template)`,
        templateId
      };
    }

    // 删除自定义模板
    this.customTemplates.delete(templateId);

    // 更新统计
    this.stats.customTemplates--;
    this.stats.totalTemplates--;

    console.log(`[RoleTemplates] ❌ Deleted custom template ${templateId}`);

    return {
      success: true,
      templateId,
      deletedAt: new Date().toISOString()
    };
  }

  /**
   * 增加模板使用计数
   * @param {string} templateId - 模板 ID
   */
  incrementUsage(templateId) {
    const template = this.getTemplate(templateId);
    if (!template) {
      return;
    }

    template.usageCount = (template.usageCount || 0) + 1;
    this.stats.usageCount++;

    console.log(`[RoleTemplates] ✅ Template ${templateId} usage count: ${template.usageCount}`);
  }

  /**
   * 获取模板使用统计
   * @returns {Object} 使用统计
   */
  getUsageStats() {
    const allTemplates = [
      ...Array.from(this.templates.values()),
      ...Array.from(this.customTemplates.values())
    ];

    const sorted = allTemplates
      .filter(t => t.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount);

    return {
      totalUsage: this.stats.usageCount,
      templatesByUsage: sorted.map(t => ({
        id: t.id,
        name: t.name,
        usageCount: t.usageCount,
        isSystem: t.isSystem
      }))
    };
  }

  /**
   * 备份模板
   * @param {string} filePath - 文件路径
   * @returns {Object} 备份结果
   */
  exportTemplates(filePath) {
    const exportData = {
      systemTemplates: Array.from(this.templates.values()),
      customTemplates: Array.from(this.customTemplates.values()),
      statistics: this.stats,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        totalTemplates: this.stats.totalTemplates
      }
    };

    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

    console.log(`[RoleTemplates] ✅ Templates exported to ${filePath}`);

    return exportData;
  }

  /**
   * 导入模板
   * @param {string} filePath - 文件路径
   * @returns {Object} 导入结果
   */
  importTemplates(filePath) {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const importedSystem = [];
    const importedCustom = [];

    // 导入系统模板
    for (const template of data.systemTemplates || []) {
      if (!this.templates.has(template.id)) {
        this.templates.set(template.id, template);
        importedSystem.push(template.id);
      }
    }

    // 导入自定义模板
    for (const template of data.customTemplates || []) {
      if (!this.templates.has(template.id) && !this.customTemplates.has(template.id)) {
        this.customTemplates.set(template.id, template);
        importedCustom.push(template.id);
      }
    }

    // 更新统计
    this.stats.totalTemplates += importedSystem.length + importedCustom.length;
    this.stats.systemTemplates = this.templates.size;
    this.stats.customTemplates += importedCustom.length;

    console.log(`[RoleTemplates] ✅ Imported ${importedSystem.length} system and ${importedCustom.length} custom templates from ${filePath}`);

    return {
      success: true,
      importedSystem,
      importedCustom,
      totalImported: importedSystem.length + importedCustom.length
    };
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      systemTemplateCount: this.templates.size,
      customTemplateCount: this.customTemplates.size,
      templates: {
        total: this.stats.totalTemplates,
        system: this.stats.systemTemplates,
        custom: this.stats.customTemplates
      }
    };
  }

  /**
   * 推荐模板
   * @param {Object} options - 选项
   * @returns {Array} 推荐列表
   */
  recommendTemplates(options = {}) {
    const {
      permissions,
      minPermissionCount = 0,
      maxPermissionCount = 1000,
      includeCustom = false
    } = options;

    let templates = this.getAllTemplates({
      includeCustom: includeCustom ? true : false
    });

    // 过滤权限数量
    templates = templates.filter(t => 
      t.permissions.length >= minPermissionCount && 
      t.permissions.length <= maxPermissionCount
    );

    // 根据权限匹配度排序
    templates = templates
      .map(t => {
        let score = 0;
        
        // 如果有指定权限，计算匹配度
        if (permissions) {
          const matching = permissions.filter(p => t.permissions.includes(p)).length;
          score = matching;
        }

        return {
          ...t,
          matchScore: score
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return templates.slice(0, 10); // 最多返回 10 个推荐
  }
}

module.exports = RoleTemplates;
