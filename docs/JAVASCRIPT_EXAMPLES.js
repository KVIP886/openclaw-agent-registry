/**
 * OpenClaw Agent Registry API - JavaScript/TypeScript Examples
 * Created: 2026-04-09
 */

// =====================
// 1. 基础配置
// =====================

const API_BASE_URL = 'http://localhost:1111';
const API_VERSION = 'v1';

// =====================
// 2. 认证示例
// =====================

/**
 * 用户登录获取 Token
 */
async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  console.log('Token received:', data.token);
  return data.token;
}

// 使用示例
// const token = await login('admin', 'admin123');

/**
 * 设置认证头
 */
function getAuthHeader(token) {
  return { 'Authorization': `Bearer ${token}` };
}

// =====================
// 3. Agent 操作示例
// =====================

/**
 * 注册新 Agent
 */
async function registerAgent(token, agentData) {
  const response = await fetch(`${API_BASE_URL}/api/v1/agents/register`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: agentData.id,
      name: agentData.name,
      version: agentData.version,
      domain: agentData.domain,
      author: agentData.author,
      description: agentData.description,
      metadata: agentData.metadata
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  return await response.json();
}

// 使用示例
// const token = await login('admin', 'admin123');
// const result = await registerAgent(token, {
//   id: 'my-agent-1',
//   name: '我的 Agent',
//   version: '1.0.0',
//   domain: 'production',
//   author: '管理员'
// });

/**
 * 获取 Agent 列表
 */
async function getAgents(token, page = 1, limit = 10, filters = {}) {
  const params = new URLSearchParams({
    page,
    limit,
    ...filters
  });

  const response = await fetch(
    `${API_BASE_URL}/api/v1/agents?${params}`,
    {
      headers: getAuthHeader(token)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get agents');
  }

  return await response.json();
}

/**
 * 获取单个 Agent 详情
 */
async function getAgent(token, agentId) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/agents/${agentId}`,
    {
      headers: getAuthHeader(token)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get agent');
  }

  return await response.json();
}

// =====================
// 4. 权限管理示例
// =====================

/**
 * 设置 Agent 权限
 */
async function setPermissions(token, agentId, permissionData) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/agents/${agentId}/permissions`,
    {
      method: 'POST',
      headers: {
        ...getAuthHeader(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(permissionData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to set permissions');
  }

  return await response.json();
}

// 使用示例
// await setPermissions(token, 'my-agent-1', {
//   permission_type: 'agent:read',
//   resource_type: 'agent',
//   scope: 'self'
// });

// =====================
// 5. 部署管理示例
// =====================

/**
 * 部署 Agent
 */
async function deployAgent(token, agentId, deployData) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/agents/${agentId}/deploy`,
    {
      method: 'POST',
      headers: {
        ...getAuthHeader(token),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        environment: deployData.environment,
        endpoint: deployData.endpoint,
        deployment_type: deployData.deployment_type,
        config: deployData.config,
        notes: deployData.notes
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Deployment failed');
  }

  return await response.json();
}

// 使用示例
// await deployAgent(token, 'my-agent-1', {
//   environment: 'production',
//   endpoint: 'http://agent.example.com:3000',
//   deployment_type: 'docker',
//   config: {
//     replicas: 3,
//     cpu_limit: '1000m',
//     memory_limit: '2Gi'
//   },
//   notes: '生产环境部署'
// });

// =====================
// 6. 健康检查示例
// =====================

/**
 * 服务健康检查
 */
async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return await response.json();
}

/**
 * Agent 健康状态
 */
async function checkAgentHealth(token) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/agents/health`,
    {
      headers: getAuthHeader(token)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check health');
  }

  return await response.json();
}

// 使用示例
// const health = await checkHealth();
// const agentHealth = await checkAgentHealth(token);

// =====================
// 7. 错误处理示例
// =====================

/**
 * 统一错误处理
 */
async function handleApiRequest(apiFunction) {
  try {
    const result = await apiFunction();
    console.log('✅ Success:', result);
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // 常见错误处理
    if (error.message.includes('401')) {
      console.error('认证失败，请重新登录');
      // 可以触发重新登录流程
    } else if (error.message.includes('403')) {
      console.error('权限不足');
    } else if (error.message.includes('404')) {
      console.error('资源未找到');
    } else {
      console.error('未知错误');
    }
    
    throw error;
  }
}

// 使用示例
// await handleApiRequest(async () => {
//   const token = await login('admin', 'admin123');
//   return await getAgents(token);
// });

// =====================
// 8. TypeScript 类型定义
// =====================

/*
// Agent 类型定义
interface Agent {
  id: string;
  name: string;
  version: string;
  domain: 'production' | 'testing' | 'dev';
  author: string;
  status: 'running' | 'stopped' | 'testing' | 'error';
  description?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

// 登录请求类型
interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应类型
interface LoginResponse {
  token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: {
    id: string;
    username: string;
    permissions: string[];
    roles: string;
    roleNames: string[];
  };
}

// 使用示例
async function exampleUsage() {
  const loginData: LoginRequest = {
    username: 'admin',
    password: 'admin123'
  };

  const response: LoginResponse = await login(loginData.username, loginData.password);
  console.log('Logged in successfully');
}
*/

// =====================
// 9. 实用工具函数
// =====================

/**
 * 获取当前时间戳
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * 生成唯一 ID
 */
function generateId() {
  return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 使用示例
// console.log(formatDate('2026-04-09T16:13:00.000Z'));
// // 输出：2026/04/09 00:13

/**
 * 检查 Token 是否过期
 */
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    return Date.now() >= expiresAt;
  } catch (error) {
    return true;
  }
}

// 使用示例
// if (isTokenExpired(currentToken)) {
//   console.log('Token expired, need to login again');
//   const newToken = await login('admin', 'admin123');
// }

// =====================
// 10. 完整流程示例
// =====================

/**
 * 完整工作流：注册、部署、查看状态
 */
async function completeWorkflow() {
  try {
    // 1. 登录
    console.log('📝 Step 1: Logging in...');
    const token = await login('admin', 'admin123');
    console.log('✅ Logged in successfully');

    // 2. 注册 Agent
    console.log('📝 Step 2: Registering agent...');
    const agentId = generateId();
    const agentData = {
      id: agentId,
      name: '示例 Agent',
      version: '1.0.0',
      domain: 'testing',
      author: '管理员',
      description: '这是一个示例 Agent'
    };
    const registerResult = await registerAgent(token, agentData);
    console.log('✅ Agent registered:', registerResult.agent.id);

    // 3. 设置权限
    console.log('📝 Step 3: Setting permissions...');
    const permissionResult = await setPermissions(token, agentId, {
      permission_type: 'agent:read',
      resource_type: 'agent',
      scope: 'self'
    });
    console.log('✅ Permissions set:', permissionResult.permissions);

    // 4. 查看 Agent
    console.log('📝 Step 4: Checking agent status...');
    const agentDetails = await getAgent(token, agentId);
    console.log('✅ Agent details:', agentDetails.agent);

    // 5. 部署 Agent
    console.log('📝 Step 5: Deploying agent...');
    const deployResult = await deployAgent(token, agentId, {
      environment: 'testing',
      endpoint: `http://${agentId}.example.com:3000`,
      deployment_type: 'docker'
    });
    console.log('✅ Deployment initiated:', deployResult.deployment.id);

    // 6. 查看健康状态
    console.log('📝 Step 6: Checking health status...');
    const healthStatus = await checkAgentHealth(token);
    console.log('✅ Health status:', healthStatus);

    console.log('\n🎉 Workflow completed successfully!');
    return { success: true, agentId };

  } catch (error) {
    console.error('\n❌ Workflow failed:', error.message);
    return { success: false, error: error.message };
  }
}

// 使用示例
// completeWorkflow().then(result => {
//   if (result.success) {
//     console.log('Workflow completed with agent ID:', result.agentId);
//   } else {
//     console.log('Workflow failed:', result.error);
//   }
// });

// =====================
// 导出 (如果使用 Node.js 模块系统)
// =====================

/*
module.exports = {
  login,
  getAuthHeader,
  registerAgent,
  getAgents,
  getAgent,
  setPermissions,
  deployAgent,
  checkHealth,
  checkAgentHealth,
  handleApiRequest,
  getTimestamp,
  generateId,
  formatDate,
  isTokenExpired,
  completeWorkflow
};
*/

/**
 * 使用 ES6 模块导出 (如果使用现代构建工具)
 */
export {
  API_BASE_URL,
  API_VERSION,
  login,
  getAuthHeader,
  registerAgent,
  getAgents,
  getAgent,
  setPermissions,
  deployAgent,
  checkHealth,
  checkAgentHealth,
  handleApiRequest,
  getTimestamp,
  generateId,
  formatDate,
  isTokenExpired,
  completeWorkflow
};
