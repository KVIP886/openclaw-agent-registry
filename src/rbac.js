/**
 * RBAC Permission Manager Module
 * Role-Based Access Control System
 * Created: 2026-04-09
 */

class RBACManager {
  constructor() {
    this.roles = new Map();
    this.users = new Map();
    this.permissions = new Map();
    this._initializeDefaultRoles();
  }

  /**
   * 初始化默认角色
   */
  _initializeDefaultRoles() {
    // agent_admin 角色 - 管理员权限
    this.roles.set('agent_admin', {
      id: 'agent_admin',
      name: 'Agent Administrator',
      description: 'Agent 管理员 - 完整权限',
      permissions: [
        'agent:create',
        'agent:read',
        'agent:update',
        'agent:delete',
        'agent:deploy',
        'agent:undeploy',
        'agent:audit',
        'permission:manage',
        'config:manage',
        'system:admin',
        'health:monitor'
      ],
      children: ['agent_operator'],
      createdAt: new Date().toISOString()
    });

    // agent_operator 角色 - 操作员权限
    this.roles.set('agent_operator', {
      id: 'agent_operator',
      name: 'Agent Operator',
      description: 'Agent 操作员 - 操作权限',
      permissions: [
        'agent:read',
        'agent:start',
        'agent:stop',
        'agent:logs',
        'agent:health',
        'permission:read',
        'config:read',
        'health:monitor'
      ],
      children: ['agent_observer'],
      createdAt: new Date().toISOString()
    });

    // agent_observer 角色 - 观察者权限
    this.roles.set('agent_observer', {
      id: 'agent_observer',
      name: 'Agent Observer',
      description: 'Agent 观察员 - 只读权限',
      permissions: [
        'agent:read',
        'agent:health',
        'agent:logs:readonly',
        'permission:read',
        'config:read:readonly',
        'health:status'
      ],
      children: [],
      createdAt: new Date().toISOString()
    });

    // user 角色 - 普通用户
    this.roles.set('user', {
      id: 'user',
      name: 'Standard User',
      description: '普通用户',
      permissions: [
        'agent:read:own'
      ],
      children: [],
      createdAt: new Date().toISOString()
    });

    // 注册所有角色及其权限
    for (const [roleId, role] of this.roles) {
      this.permissions.set(roleId, role.permissions);
    }
  }

  /**
   * 创建新角色
   */
  createRole(roleId, roleName, description, permissions, inheritFrom = null) {
    if (this.roles.has(roleId)) {
      throw new Error(`Role ${roleId} already exists`);
    }

    const role = {
      id: roleId,
      name: roleName,
      description,
      permissions,
      children: inheritFrom ? [inheritFrom] : [],
      createdAt: new Date().toISOString()
    };

    this.roles.set(roleId, role);
    this.permissions.set(roleId, permissions);

    return {
      success: true,
      role
    };
  }

  /**
   * 获取角色详细信息
   */
  getRole(roleId) {
    return this.roles.get(roleId) || null;
  }

  /**
   * 获取所有角色
   */
  getAllRoles() {
    return Array.from(this.roles.values());
  }

  /**
   * 分配角色给用户
   */
  assignRoleToUser(userId, roleId) {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role ${roleId} does not exist`);
    }

    if (!this.users.has(userId)) {
      this.users.set(userId, {
        id: userId,
        roles: [],
        permissions: [],
        createdAt: new Date().toISOString()
      });
    }

    const user = this.users.get(userId);
    
    // 添加角色（避免重复）
    if (!user.roles.includes(roleId)) {
      user.roles.push(roleId);
    }

    // 重新计算用户权限
    this._rebuildUserPermissions(user);

    return {
      success: true,
      userId,
      roleId,
      user
    };
  }

  /**
   * 移除用户角色
   */
  removeRoleFromUser(userId, roleId) {
    if (!this.users.has(userId)) {
      throw new Error(`User ${userId} does not exist`);
    }

    const user = this.users.get(userId);
    const index = user.roles.indexOf(roleId);
    
    if (index !== -1) {
      user.roles.splice(index, 1);
      this._rebuildUserPermissions(user);
    }

    return {
      success: true,
      userId,
      removedRoleId: roleId
    };
  }

  /**
   * 重新计算用户权限（考虑继承）
   */
  _rebuildUserPermissions(user) {
    const allPermissions = new Set();
    
    // 添加用户所有角色的权限
    for (const roleId of user.roles) {
      const role = this.roles.get(roleId);
      if (role) {
        // 添加角色本身的权限
        role.permissions.forEach(p => allPermissions.add(p));
        
        // 添加子角色的权限（继承）
        if (role.children && role.children.length > 0) {
          role.children.forEach(childId => {
            const childRole = this.roles.get(childId);
            if (childRole) {
              childRole.permissions.forEach(p => allPermissions.add(p));
            }
          });
        }
      }
    }

    user.permissions = Array.from(allPermissions);
  }

  /**
   * 检查用户是否有某个权限
   */
  hasPermission(userId, permission) {
    if (!this.users.has(userId)) {
      return false;
    }

    const user = this.users.get(userId);
    return user.permissions.includes(permission);
  }

  /**
   * 检查用户是否有任意一个权限
   */
  hasAnyPermission(userId, permissions) {
    if (!this.users.has(userId)) {
      return false;
    }

    const user = this.users.get(userId);
    return permissions.some(p => user.permissions.includes(p));
  }

  /**
   * 检查用户是否有所有权限
   */
  hasAllPermissions(userId, permissions) {
    if (!this.users.has(userId)) {
      return false;
    }

    const user = this.users.get(userId);
    return permissions.every(p => user.permissions.includes(p));
  }

  /**
   * 获取用户权限列表
   */
  getUserPermissions(userId) {
    if (!this.users.has(userId)) {
      return {
        userId,
        permissions: [],
        roles: []
      };
    }

    const user = this.users.get(userId);
    return {
      userId,
      permissions: user.permissions,
      roles: user.roles,
      roleDetails: user.roles.map(roleId => ({
        roleId,
        roleName: this.roles.get(roleId)?.name
      }))
    };
  }

  /**
   * 获取所有用户
   */
  listUsers() {
    return Array.from(this.users.values()).map(user => ({
      userId: user.id,
      roles: user.roles,
      permissionsCount: user.permissions.length,
      createdAt: user.createdAt
    }));
  }

  /**
   * 获取用户信息
   */
  getUser(userId) {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      roles: user.roles,
      permissions: user.permissions,
      roleDetails: user.roles.map(roleId => ({
        roleId,
        roleName: this.roles.get(roleId)?.name,
        description: this.roles.get(roleId)?.description
      })),
      createdAt: user.createdAt
    };
  }

  /**
   * 权限检查中间件
   */
  checkPermission(requiredPermission) {
    return (req, res, next) => {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!this.hasPermission(userId, requiredPermission)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: requiredPermission,
          userId
        });
      }

      next();
    };
  }

  /**
   * 检查任意权限
   */
  checkAnyPermission(requiredPermissions) {
    return (req, res, next) => {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!this.hasAnyPermission(userId, requiredPermissions)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: requiredPermissions,
          userId
        });
      }

      next();
    };
  }

  /**
   * 检查所有权限
   */
  checkAllPermissions(requiredPermissions) {
    return (req, res, next) => {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!this.hasAllPermissions(userId, requiredPermissions)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: requiredPermissions,
          userId
        });
      }

      next();
    };
  }

  /**
   * 获取所有角色定义
   */
  getRoles() {
    const roles = {};
    this.roles.forEach((role, roleName) => {
      roles[roleName] = {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions
      };
    });
    return roles;
  }

  /**
   * 获取所有唯一权限
   */
  getAllPermissions() {
    const allPermissions = new Set();
    this.roles.forEach((role) => {
      role.permissions.forEach(perm => allPermissions.add(perm));
    });
    return [...allPermissions];
  }

  /**
   * 获取所有角色名称
   */
  getRoleNames() {
    return [...this.roles.keys()];
  }
}

module.exports = RBACManager;
