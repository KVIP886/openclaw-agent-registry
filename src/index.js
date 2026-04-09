/**
 * OpenClaw Agent Registry - Main Application
 * Created: 2026-04-09
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const db = require('./database/inMemoryDb');
const auth = require('./auth');
const RBACManager = require('./rbac');
const AuditLogger = require('./auditLogger');

// 引入增强功能模块
const MemoryManager = require('./database/enhanced/MemoryManager');
const VersionControl = require('./database/enhanced/VersionControl');
const ConflictResolver = require('./database/enhanced/ConflictResolver');
const SyncEngine = require('./database/enhanced/SyncEngine');

const rbac = new RBACManager();
const auditLog = new AuditLogger();

// 初始化增强功能模块
const memoryManager = new MemoryManager({
  maxSnapshots: 100,
  snapshotInterval: 5000, // 5 秒自动快照
  enablePerformance: true
});
const versionControl = new VersionControl(memoryManager, db);
const conflictResolver = new ConflictResolver(memoryManager, db);
const syncEngine = new SyncEngine(memoryManager, versionControl, {
  autoSync: true,
  syncInterval: 10000, // 10 秒同步一次
  conflictResolution: 'timestamp_last_wins'
});

// 初始化审计日志记录同步事件
syncEngine.onSync((event, data) => {
  auditLog.logEvent({
    type: 'sync',
    event,
    data,
    timestamp: new Date().toISOString()
  });
});

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 加载持久化数据
db.loadPersistedData();

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// 认证中间件
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    const decoded = auth.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 权限检查中间件
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const userId = req.user?.id;
    const permissions = req.user.permissions || [];
    
    console.log(`[DEBUG] Permission Check: User=${userId}, Required=${requiredPermission}, Has=${JSON.stringify(permissions)}`);
    
    if (!userId) {
      console.log(`[DEBUG] No user ID`);
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // 检查用户是否有直接权限
    if (permissions.includes(requiredPermission)) {
      console.log(`[DEBUG] Permission granted: ${requiredPermission}`);
      next();
      return;
    }
    
    // 检查权限前缀匹配（如 'agent:create' 匹配 'agent:*'）
    const prefixMatch = permissions.some(p => p.startsWith(requiredPermission.replace(':', '')));
    if (prefixMatch) {
      console.log(`[DEBUG] Permission granted by prefix: ${requiredPermission}`);
      next();
      return;
    }
    
    // 检查管理员权限（agent_admin, system:admin 等）
    if (requiredPermission.startsWith('agent:') || requiredPermission.startsWith('permission:') || requiredPermission.startsWith('config:') || requiredPermission === 'system:admin') {
      const isAdminPermission = permissions.includes('system:admin') || permissions.includes('config:manage') || permissions.includes('permission:manage');
      if (isAdminPermission) {
        console.log(`[DEBUG] Permission granted by admin role: ${requiredPermission}`);
        next();
        return;
      }
    }
    
    console.log(`[DEBUG] Permission denied: ${requiredPermission} not found in ${JSON.stringify(permissions)}`);
    return res.status(403).json({
      error: 'Insufficient permissions',
      required: requiredPermission,
      userId,
      permissions
    });
  };
};

/**
 * POST /api/v1/agents/register
 * 注册新 Agent
 * 权限：agent_admin
 */
app.post('/api/v1/agents/register', authenticate, checkPermission('agent:admin'), (req, res) => {
  try {
    const { id, name, version, domain, description, author, metadata } = req.body;

    // 验证必填字段
    if (!id || !name || !version || !domain || !author) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 检查 ID 是否已存在
    const existingAgent = db.agents.getById(id);
    if (existingAgent) {
      return res.status(409).json({ error: 'Agent ID already exists' });
    }

    // 注册 Agent
    const result = db.agents.create({
      id,
      name,
      version,
      domain,
      description,
      author,
      metadata
    });

    if (result.error) {
      return res.status(409).json({ error: result.error });
    }

    res.status(201).json({
      success: true,
      message: 'Agent registered successfully',
      data: {
        agent: result.agent
      }
    });
  } catch (error) {
    console.error('Register agent error:', error);
    res.status(500).json({ error: 'Failed to register agent' });
  }
});

/**
 * GET /api/v1/agents
 * 获取所有 Agent 列表
 * 权限：agent:read
 */
app.get('/api/v1/agents', authenticate, checkPermission('agent:read'), (req, res) => {
  try {
    const { status, domain, search } = req.query;
    
    const agents = db.agents.getAll({ status, domain, search });

    res.json({
      success: true,
      data: {
        agents,
        total: agents.length
      }
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

/**
 * GET /api/v1/agents/health
 * 获取所有 Agent 健康状态
 * 权限：health:monitor
 */
app.get('/api/v1/agents/health', authenticate, checkPermission('health:monitor'), (req, res) => {
  try {
    const agents = db.agents.getAll();
    
    const healthStatus = agents.map(agent => {
      const deployments = db.deployments.getAll(agent.id);
      const runningDeployments = deployments.filter(d => d.status === 'running');
      
      return {
        id: agent.id,
        name: agent.name,
        version: agent.version,
        status: agent.status,
        deployments: runningDeployments.length,
        health: runningDeployments.length > 0 ? 'healthy' : 'inactive'
      };
    });

    res.json({
      success: true,
      data: healthStatus,
      summary: {
        total: healthStatus.length,
        healthy: healthStatus.filter(h => h.health === 'healthy').length,
        inactive: healthStatus.filter(h => h.health === 'inactive').length
      }
    });
  } catch (error) {
    console.error('Get health status error:', error);
    res.status(500).json({ error: 'Failed to fetch health status' });
  }
});

/**
 * GET /api/v1/agents/:id
 * 获取特定 Agent 详情
 * 权限：agent:read
 */
app.get('/api/v1/agents/:id', authenticate, checkPermission('agent:read'), (req, res) => {
  try {
    const { id } = req.params;
    const agent = db.agents.getById(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // 获取权限配置
    const permissions = db.permissions.getAll(id);

    // 获取部署状态
    const deployments = db.deployments.getAll(id);

    // 获取最近的事件
    const recentEvents = db.events.getAll(id, { limit: 10 });

    res.json({
      success: true,
      data: {
        agent,
        permissions,
        deployments,
        recent_events: recentEvents
      }
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

/**
 * POST /api/v1/agents/:id/permissions
 * 设置 Agent 权限
 * 权限：permission:manage
 */
app.post('/api/v1/agents/:id/permissions', authenticate, checkPermission('permission:manage'), (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    // 验证 Agent 存在
    const agent = db.agents.getById(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // 删除现有权限
    db.permissions.deleteAllByAgent(id);

    // 插入新权限
    permissions.forEach(perm => {
      db.permissions.create({
        agent_id: id,
        permission_type: perm.permission_type,
        resource_type: perm.resource_type,
        scope: perm.scope,
        branches: perm.branches,
        exclusions: perm.exclusions,
        constraints: perm.constraints
      });
    });

    // 获取更新的权限
    const updatedPermissions = db.permissions.getAll(id);

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: {
        permissions: updatedPermissions
      }
    });
  } catch (error) {
    console.error('Set permissions error:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

/**
 * GET /api/v1/agents/health
 * 获取所有 Agent 健康状态
 * 权限：health:monitor
 */
app.get('/api/v1/agents/health', authenticate, checkPermission('health:monitor'), (req, res) => {
  try {
    const agents = db.agents.getAll();
    
    const healthStatus = agents.map(agent => {
      const deployments = db.deployments.getAll(agent.id);
      const runningDeployments = deployments.filter(d => d.status === 'running');
      
      return {
        id: agent.id,
        name: agent.name,
        version: agent.version,
        status: agent.status,
        deployments: runningDeployments.length,
        health: runningDeployments.length > 0 ? 'healthy' : 'inactive'
      };
    });

    res.json({
      success: true,
      data: healthStatus,
      summary: {
        total: healthStatus.length,
        healthy: healthStatus.filter(h => h.health === 'healthy').length,
        inactive: healthStatus.filter(h => h.health === 'inactive').length
      }
    });
  } catch (error) {
    console.error('Get health status error:', error);
    res.status(500).json({ error: 'Failed to fetch health status' });
  }
});

/**
 * POST /api/v1/agents/:id/deploy
 * 部署 Agent
 * 权限：agent:deploy
 */
app.post('/api/v1/agents/:id/deploy', authenticate, checkPermission('agent:deploy'), (req, res) => {
  try {
    const { id } = req.params;
    const { deployment_type, environment, endpoint } = req.body;

    // 验证 Agent 存在
    const agent = db.agents.getById(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // 创建部署记录
    const result = db.deployments.create({
      agent_id: id,
      deployment_type,
      environment,
      endpoint,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Deployment initiated',
      data: {
        deployment: result.deployment,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Deploy agent error:', error);
    res.status(500).json({ error: 'Failed to deploy agent' });
  }
});

/**
 * POST /api/v1/auth/login
 * 用户登录
 */
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 模拟认证（实际应该查询数据库）
    const mockUsers = {
      'admin': {
        id: 'admin',
        username: 'admin',
        passwordHash: bcrypt.hashSync(password || 'admin123', 10)
      },
      'operator': {
        id: 'operator',
        username: 'operator',
        passwordHash: bcrypt.hashSync(password || 'operator123', 10)
      }
    };

    const user = mockUsers[username];
    if (!user) {
      await auditLog.login(username, username, false, { ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordValid = bcrypt.compareSync(password || '', user.passwordHash);
    if (!passwordValid) {
      await auditLog.login(username, username, false, { ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 分配角色
    const roleMap = {
      'admin': 'agent_admin',
      'operator': 'agent_operator'
    };
    
    rbac.assignRoleToUser(user.id, roleMap[username]);
    
    const userPermissions = rbac.getUserPermissions(user.id);
    
    const accessToken = auth.generateAccessToken({
      ...user,
      permissions: userPermissions.permissions
    });
    
    const refreshToken = auth.generateRefreshToken({ userId: user.id, type: 'refresh' });

    await auditLog.login(user.id, username, true, { ip: req.ip });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: '30d',
        user: {
          id: user.id,
          username: user.username,
          permissions: userPermissions.permissions,
          roles: userPermissions.roles,
          roleNames: userPermissions.roleDetails.map(r => r.roleName)
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  OpenClaw Agent Registry                                 ║
║  Version: 1.0.0                                          ║
║  Server: http://localhost:${PORT}                           ║
║  Status: Running                                         ║
╚══════════════════════════════════════════════════════════╝

Endpoints:
  GET  /health                      - Health check
  GET  /api/v1/agents              - List agents
  GET  /api/v1/agents/:id          - Get agent details
  POST /api/v1/agents/register     - Register new agent
  POST /api/v1/agents/:id/permissions - Update permissions
  POST /api/v1/agents/:id/deploy   - Deploy agent
  GET  /api/v1/agents/health       - Health status
  POST /api/v1/auth/login          - Login

Test accounts:
  Username: admin, Password: admin123
  Username: operator, Password: operator123
  `);
});

module.exports = app;
