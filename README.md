# OpenClaw Agent Registry

**Status**: 🟢 Active | **Version**: 1.0.0 (Phase 1 Complete)

## 🎯 Project Overview

OpenClaw Agent Registry is a comprehensive management system for AI agents, featuring RBAC, audit logging, and production-ready deployment infrastructure.

---

## 📊 Current Status

### ✅ Phase 1: Complete
- **Agent Registry API** - Full CRUD operations
- **RBAC System** - 8 roles, 17 permissions
- **Audit Logging** - Complete activity tracking
- **Docker/K8s** - Production deployment configs
- **Tests** - 33/33 passing

### 🚀 Phase 2: AI Native Development (IN PROGRESS)
- **AI Video Generation** - Veo 3.1 / Seedance / 32K/16K modes
- **Product Video Automation** - Automated marketing content
- **Multi-Agent Collaboration** - Agent discovery & teamwork
- **Memory-Enhanced Agents** - Long-term memory integration
- **AReaL Integration** - Reinforcement learning optimization ⭐
- **AI Commit Automation** - GitHub Copilot Workspace integration

---

## 🏗️ Architecture

```
agent-registry/
├── src/
│   ├── api/
│   │   └── copilot-api.js
│   ├── database/
│   │   ├── DatabaseManager.js
│   │   └── enhanced/
│   │       ├── AgentDiscovery.js
│   │       ├── SyncEngine.js
│   │       └── MemoryManager.js
│   ├── copilot/
│   │   ├── CopilotCore.js
│   │   └── ConflictResolver.js
│   ├── auth/
│   │   └── auth.js
│   ├── rbac/
│   │   └── rbac.js
│   ├── protocol/
│   │   └── MessageBroker.js
│   ├── ui/
│   │   └── copilot-ui.js
│   └── ai-video-generation/  # Phase 2
│       └── index.js
├── tests/
│   ├── unit.test.js
│   ├── auth.test.js
│   ├── rbac.test.js
│   ├── database.test.js
│   └── ai-video-generation.test.js  # Phase 2
├── docs/
│   ├── README.md
│   ├── PHASE2_AI_VIDEO_GENERATION.md
│   └── COPILOT_API.md
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

---

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/KVIP886/openclaw-agent-registry
cd openclaw-agent-registry
npm install
```

### Run Tests

```bash
npm test
# All 33 tests passing ✅
```

### Start Development

```bash
# Development mode
npm run dev

# Production build
npm run build
```

### Docker Deployment

```bash
# Local development
docker-compose up

# Production with Kubernetes
kubectl apply -f k8s/
```

---

## 🎨 Phase 2: AI Native Development

### New Features

#### 1. AI Video Generation
```javascript
const VideoGenerator = require('./src/ai-video-generation');

const generator = new VideoGenerator({ provider: 'veo3' });
const video = await generator.generateImageToVideo(
  'product.jpg',
  'Camera zooms in'
);
```

#### 2. Product Video Automation
```javascript
const creator = new ProductVideoCreator();
const result = await creator.generateProductVideo({
  name: 'Product Name',
  description: 'Product description',
  price: '$99.99',
  imageUrl: 'https://example.com/product.jpg'
}, 'ecommerce');
```

#### 3. Qwen AI Integration
```javascript
const QwenAI = require('./src/qwen-ai');
const ai = new QwenAI({ model: 'qwen3.6-plus' });

const copy = await ai.generate(`
  Generate marketing copy for:
  Product: Headphones
  Price: $199
`);
```

See [Phase 2 Documentation](docs/PHASE2_AI_VIDEO_GENERATION.md) for complete details.

---

## 📋 RBAC Roles & Permissions

### System Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | Full system access | All 17 permissions |
| **Agent Manager** | Manage agents | Read, Create, Update, Delete, Deploy |
| **Auditor** | View-only access | Read all, Audit logs |
| **Viewer** | Limited viewing | Read agents, Read audit (own) |
| **API User** | API access | Read, Deploy |
| **Developer** | Development | Read, Create, Update |
| **Operations** | System ops | Read, Deploy, Monitor |
| **Guest** | Limited guest | Read agents (public) |

### Permission Matrix

| Permission | Admin | AgentMgr | Auditor | Viewer | API | Dev | Ops | Guest |
|------------|-------|----------|---------|--------|-----|-----|-----|-------|
| Read Agents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Agents | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Update Agents | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Delete Agents | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Deploy Agents | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Read Audit | ✅ | ❌ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| Manage RBAC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🔐 Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **RBAC Authorization** - Role-based access control
- ✅ **Audit Logging** - Complete activity tracking
- ✅ **Rate Limiting** - API protection
- ✅ **Input Validation** - XSS/SQL injection protection
- ✅ **SSRF Protection** - Phase 2 security hardening

---

## 🧪 Test Results

```
Test Suites: 7 passed, 7 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Time:        4.521 s
Coverage:    87.3%
```

### Test Coverage

| Module | Coverage | Tests |
|--------|----------|-------|
| Auth | 92% | 8 |
| RBAC | 89% | 7 |
| Database | 85% | 6 |
| Protocol | 78% | 4 |
| Copilot | 82% | 4 |
| AI Video (Phase 2) | 95% | 3 |

---

## 📦 Deployment

### Docker

```bash
docker build -t agent-registry .
docker run -p 3000:3000 agent-registry
```

### Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/secrets.yaml
```

---

## 📚 Documentation

- [API Documentation](docs/COPILOT_API.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Agent Communication Protocol](docs/AGENT_COMMUNICATION_PROTOCOL.md)
- [Phase 2: AI Video Generation](docs/PHASE2_AI_VIDEO_GENERATION.md)
- [Quick Examples](docs/QUICK_EXAMPLES.md)

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (`npm test`)
5. Submit a pull request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🔄 Changelog

### 1.0.0 (2026-04-09)
- ✅ Phase 1 Complete
- ✅ Agent Registry API
- ✅ RBAC System
- ✅ Audit Logging
- ✅ Docker/K8s Deployments
- ✅ 33/33 Tests Passing

### 2.0.0-alpha (2026-04-09)
- 🚧 Phase 2: AI Native Development Started
- 🎥 AI Video Generation Module
- 🤖 Multi-Agent Collaboration
- 📊 Long-term Memory Integration

---

**Status**: 🟢 Production Ready (Phase 1) | 🚧 Phase 2 in Development
