# OpenClaw Agent Registry API Documentation

## 📚 API 文档

### **在线文档**
- **Swagger UI**: [View Interactive API Documentation](./docs/index.html)
- **OpenAPI Spec**: [openapi.yaml](./docs/openapi.yaml)

### **本地查看文档**
```bash
# 1. 启动服务
cd C:\openclaw_workspace\projects\agent-registry
npm start

# 2. 访问文档
# 打开浏览器访问：
http://localhost:1111/docs/
```

---

## 🔑 快速开始

### **1. 服务启动**
```bash
# 安装依赖
npm install

# 启动服务
npm start

# 服务运行在 http://localhost:1111
```

### **2. 获取认证 Token**
```bash
curl -X POST http://localhost:1111/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**响应**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "token_type": "Bearer",
  "user": {
    "id": "admin",
    "username": "admin",
    "permissions": ["agent_admin", "agent_operator", "agent_viewer"],
    "roles": "admin"
  }
}
```

---

## 📋 API 端点列表

### **Health Endpoints** (无需认证)

#### `GET /health`
检查服务健康状态。

**请求示例**:
```bash
curl http://localhost:1111/health
```

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-09T16:13:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0"
}
```

#### `GET /api/v1/agents/health` (需要认证)
获取所有 Agent 的健康状态汇总。

**请求示例**:
```bash
curl -X GET http://localhost:1111/api/v1/agents/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### **Authentication Endpoints**

#### `POST /api/v1/auth/login`
用户登录，获取 JWT Token。

**请求示例**:
```bash
curl -X POST http://localhost:1111/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**请求体**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "token_type": "Bearer",
  "user": {
    "id": "admin",
    "username": "admin",
    "permissions": ["agent_admin", "agent_operator", "agent_viewer"]
  }
}
```

---

### **Agent Management Endpoints** (需要认证)

#### `GET /api/v1/agents`
获取所有 Agent 列表，支持分页和过滤。

**请求参数**:
- `page` (optional): 页码，默认 1
- `limit` (optional): 每页数量，默认 10，最大 100
- `status` (optional): 按状态过滤 (running, stopped, testing, error)
- `domain` (optional): 按领域过滤 (production, testing, dev)
- `search` (optional): 按名称或 ID 搜索

**请求示例**:
```bash
curl -X GET "http://localhost:1111/api/v1/agents?page=1&limit=10&status=running" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例**:
```json
{
  "data": [
    {
      "id": "lobster-agent-v1.0",
      "name": "Lobster GitHub Review Agent",
      "version": "1.0.0",
      "domain": "devops",
      "author": "KVIP886",
      "status": "testing",
      "created_at": "2026-04-09T16:00:00.000Z",
      "updated_at": "2026-04-09T16:13:00.000Z",
      "metadata": {
        "capabilities": ["review", "code-analysis"]
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

#### `GET /api/v1/agents/:id`
获取指定 Agent 的详细信息。

**请求示例**:
```bash
curl -X GET http://localhost:1111/api/v1/agents/lobster-agent-v1.0 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### `POST /api/v1/agents/register`
注册新的 Agent（需要 `agent:create` 权限）。

**请求示例**:
```bash
curl -X POST http://localhost:1111/api/v1/agents/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-agent-1",
    "name": "Test Agent",
    "version": "1.0.0",
    "domain": "production",
    "author": "admin",
    "description": "Test agent for development",
    "metadata": {
      "capabilities": ["test", "automation"],
      "dependencies": ["docker", "kubernetes"]
    }
  }'
```

#### `PUT /api/v1/agents/:id`
更新 Agent 信息（需要 `agent:update` 权限）。

**请求示例**:
```bash
curl -X PUT http://localhost:1111/api/v1/agents/lobster-agent-v1.0 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.1.0",
    "status": "running",
    "description": "Updated description"
  }'
```

#### `DELETE /api/v1/agents/:id`
删除指定的 Agent（需要 `agent:delete` 权限）。

**请求示例**:
```bash
curl -X DELETE http://localhost:1111/api/v1/agents/lobster-agent-v1.0 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### **Permission Management** (需要认证)

#### `POST /api/v1/agents/:id/permissions`
为指定的 Agent 设置权限（需要 `permission:manage` 权限）。

**请求示例**:
```bash
curl -X POST http://localhost:1111/api/v1/agents/lobster-agent-v1.0/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_type": "agent:read",
    "resource_type": "agent",
    "scope": "self"
  }'
```

---

### **Deployment Management** (需要认证)

#### `POST /api/v1/agents/:id/deploy`
部署 Agent 到目标环境（需要 `agent:deploy` 权限）。

**请求示例**:
```bash
curl -X POST http://localhost:1111/api/v1/agents/lobster-agent-v1.0/deploy \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "production",
    "endpoint": "http://agent.example.com:3000",
    "deployment_type": "docker",
    "config": {
      "replicas": 3,
      "cpu_limit": "1000m",
      "memory_limit": "2Gi"
    },
    "notes": "Production deployment with load balancing"
  }'
```

---

## 👥 测试账号

### **Administrator Account**
- **Username**: `admin`
- **Password**: `admin123`
- **Permissions**: `agent_admin`, `agent_operator`, `agent_viewer`
- **Role**: System Administrator

### **Operator Account**
- **Username**: `operator`
- **Password**: `operator123`
- **Permissions**: `agent_operator`
- **Role**: Agent Operator

---

## 📖 权限级别说明

### **agent_admin** (管理员)
- 可以执行所有 Agent 管理操作
- 可以管理权限配置
- 可以管理系统配置
- 可以查看所有审计日志

### **agent_operator** (操作员)
- 可以部署/取消部署 Agent
- 可以更新 Agent 状态
- 可以查看 Agent 列表和详情
- 可以配置 Agent 权限

### **agent_viewer** (查看者)
- 可以查看所有 Agent 列表
- 可以查看 Agent 详情
- 可以查看 Agent 健康状态
- 不能修改任何配置

---

## 🔐 认证机制

### **JWT Token**

#### **Token 生成**
通过 `POST /api/v1/auth/login` 获取 Access Token 和 Refresh Token。

#### **Token 格式**
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImlhdCI6MTcxNzA0MDAwMCwiZXhwIjoxNzE3MTI2NDAwfQ.abc123xyz
```

#### **Token 过期**
- **Access Token**: 24 小时
- **Refresh Token**: 7 天

#### **Token 撤销**
管理员可以撤销 Token，使其立即失效。

---

## 📊 错误处理

### **错误响应格式**

所有错误响应遵循统一的 JSON 格式：

```json
{
  "error": "错误描述",
  "statusCode": 400,
  "timestamp": "2026-04-09T16:13:00.000Z"
}
```

### **HTTP 状态码**

| 状态码 | 描述 | 说明 |
|--------|------|--|
| `200` | OK | 请求成功 |
| `201` | Created | 资源创建成功 |
| `202` | Accepted | 请求已接受，处理中 |
| `400` | Bad Request | 请求参数错误 |
| `401` | Unauthorized | 未认证或认证失败 |
| `403` | Forbidden | 权限不足 |
| `404` | Not Found | 资源未找到 |
| `405` | Method Not Allowed | HTTP 方法不支持 |
| `429` | Too Many Requests | 请求频率过高 |
| `500` | Internal Server Error | 服务器内部错误 |

### **常见错误**

#### **401 Unauthorized**
```json
{
  "error": "Missing authorization header",
  "statusCode": 401,
  "timestamp": "2026-04-09T16:13:00.000Z"
}
```
**解决方案**: 在请求头中添加 `Authorization: Bearer YOUR_TOKEN`

#### **403 Forbidden**
```json
{
  "error": "Insufficient permissions",
  "requiredPermissions": ["agent:delete"],
  "statusCode": 403,
  "timestamp": "2026-04-09T16:13:00.000Z"
}
```
**解决方案**: 确保用户具有足够的权限，联系管理员分配角色

#### **400 Bad Request**
```json
{
  "error": "Agent ID already exists",
  "statusCode": 400,
  "timestamp": "2026-04-09T16:13:00.000Z"
}
```
**解决方案**: 检查请求参数，确保符合 API 规范

---

## 🛠️ 开发指南

### **项目结构**
```
C:\openclaw_workspace\projects\agent-registry/
├── package.json              # 项目依赖配置
├── .env                      # 环境变量配置
├── src/
│   ├── index.js             # 主应用 (REST API)
│   ├── auth.js              # JWT 认证系统
│   ├── rbac.js              # RBAC 权限系统
│   ├── auditLogger.js       # 审计日志系统
│   └── database/
│       └── inMemoryDb.js    # 内存数据库模块
├── data/                    # 数据持久化目录
│   ├── agents.json         # Agent 数据
│   ├── permissions.json    # 权限配置
│   ├── deployments.json    # 部署记录
│   └── auditLogs.json      # 审计日志
└── docs/
    ├── openapi.yaml        # OpenAPI 3.0 规范
    └── index.html          # Swagger UI 文档
```

### **本地开发**

#### **启动开发服务器**
```bash
npm run dev
```

#### **运行测试**
```bash
npm test
```

#### **代码格式化**
```bash
npm run lint
```

---

## 📝 版本历史

### **v1.0.0 (2026-04-09)**
- ✅ 初始版本发布
- ✅ 完整的 Agent CRUD 功能
- ✅ JWT 认证系统
- ✅ RBAC 权限控制
- ✅ 审计日志系统
- ✅ OpenAPI 3.0 文档

### **未来版本规划**
- v1.1.0: OAuth 2.0 集成
- v1.2.0: 冲突解决引擎
- v1.3.0: Copilot 集成
- v2.0.0: AI Native Development

---

## 📞 支持

### **GitHub Repository**
[https://github.com/KVIP886/openclaw-agent-registry](https://github.com/KVIP886/openclaw-agent-registry)

### **问题反馈**
- 发现 Bug？[提交 Issue](https://github.com/KVIP886/openclaw-agent-registry/issues)
- 功能建议？[提交 Feature Request](https://github.com/KVIP886/openclaw-agent-registry/issues/new?labels=enhancement)

### **技术支持**
- **Email**: support@openclaw.ai
- **Documentation**: [View API Docs](./docs/index.html)

---

## 📜 许可证

MIT License - 查看 [LICENSE](../LICENSE) 文件了解详情。

---

**Last Updated**: 2026-04-09 16:15 (Asia/Shanghai)  
**API Version**: v1.0.0  
**Documentation Version**: 1.0.0
