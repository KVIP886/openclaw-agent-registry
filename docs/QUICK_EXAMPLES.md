# API 快速示例 (Quick Examples)

## 🔑 认证与登录

### 1. 登录获取 Token
```bash
# 使用管理员账号登录
curl -X POST http://localhost:1111/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**响应示例**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

## 📋 Agent 操作

### 2. 注册新 Agent
```bash
# 注册新 Agent (需要 token)
curl -X POST http://localhost:1111/api/v1/agents/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-agent-1",
    "name": "我的 Agent",
    "version": "1.0.0",
    "domain": "production",
    "author": "管理员"
  }'
```

### 3. 查看 Agent 列表
```bash
# 获取所有 Agent
curl -X GET "http://localhost:1111/api/v1/agents?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 查看单个 Agent
```bash
# 查看指定 Agent 详情
curl -X GET http://localhost:1111/api/v1/agents/my-agent-1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔐 权限管理

### 5. 设置 Agent 权限
```bash
# 为 Agent 配置权限
curl -X POST http://localhost:1111/api/v1/agents/my-agent-1/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_type": "agent:read",
    "resource_type": "agent",
    "scope": "self"
  }'
```

## 🚀 部署管理

### 6. 部署 Agent
```bash
# 部署 Agent 到生产环境
curl -X POST http://localhost:1111/api/v1/agents/my-agent-1/deploy \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "production",
    "endpoint": "http://agent.example.com:3000",
    "deployment_type": "docker"
  }'
```

## ✅ 健康检查

### 7. 服务健康状态
```bash
# 无需认证即可访问
curl http://localhost:1111/health
```

### 8. Agent 健康状态
```bash
# 需要认证
curl -X GET http://localhost:1111/api/v1/agents/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📞 测试账号

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 管理员 | admin | admin123 | agent_admin, agent_operator, agent_viewer |
| 操作员 | operator | operator123 | agent_operator |

---

**更多示例**: 查看 [API 文档](./index.html) 获取完整说明

**文档版本**: v1.0.0 (2026-04-09)
