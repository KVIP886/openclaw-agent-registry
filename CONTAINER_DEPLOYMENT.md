# OpenClaw Agent Registry - 容器化部署文档

## 📦 概述

本目录包含完整的 Docker 和 Kubernetes 容器化部署配置，支持本地开发和生产环境部署。

## 🚀 快速开始

### **本地开发环境**

#### 1. 构建和运行
```bash
# 使用脚本一键部署
./scripts/deploy.sh all

# 或使用 docker-compose
cd C:\openclaw_workspace\projects\agent-registry
docker-compose up -d
```

#### 2. 访问服务
- **API**: http://localhost:1111
- **文档**: http://localhost:8080
- **健康检查**: http://localhost:1111/health

#### 3. 测试账号
- 管理员：`admin` / `admin123`
- 操作员：`operator` / `operator123`

---

## 🐳 Docker 部署

### **构建镜像**
```bash
# 构建镜像
docker build -t openclaw/agent-registry:1.0.0 .

# 构建多平台镜像
docker buildx build --platform linux/amd64,linux/arm64 \
  -t openclaw/agent-registry:1.0.0 .
```

### **运行容器**
```bash
# 基本运行
docker run -d \
  --name openclaw-agent-registry \
  -p 1111:1111 \
  -v ${PWD}/data:/app/data \
  openclaw/agent-registry:1.0.0

# 带环境变量
docker run -d \
  --name openclaw-agent-registry \
  -p 1111:1111 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret \
  -v ${PWD}/data:/app/data \
  openclaw/agent-registry:1.0.0
```

### **使用 Docker Compose**
```bash
# 开发环境
docker-compose up -d

# 生产环境
DOCKER_ENV=prod docker-compose -f docker-compose.prod.yml up -d
```

---

## ☸️ Kubernetes 部署

### **前置要求**
- Kubernetes 集群 (v1.20+)
- kubectl 命令行工具
- Helm v3.x (可选，推荐)
- StorageClass (用于数据持久化)

### **Helm 部署**

#### 1. 添加 Helm 仓库
```bash
helm repo add openclaw https://charts.openclaw.ai
helm repo update
```

#### 2. 安装 Chart
```bash
# 基本安装
helm install openclaw-agent-registry openclaw/openclaw-agent-registry \
  --namespace openclaw-registry \
  --create-namespace

# 自定义配置
helm install openclaw-agent-registry openclaw/openclaw-agent-registry \
  --namespace openclaw-registry \
  --create-namespace \
  --set image.tag=1.0.0 \
  --set replicaCount=3 \
  --set ingress.host=api.example.com
```

#### 3. 自定义值文件
```bash
cat > values-custom.yaml <<EOF
image:
  repository: my-registry/openclaw/agent-registry
  tag: 1.0.0

replicaCount: 5

resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "1000m"

autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 20

persistence:
  size: 50Gi
  storageClassName: ssd
EOF

helm install openclaw-agent-registry ./helm \
  --namespace openclaw-registry \
  --values values-custom.yaml
```

### **k8s YAML 部署**

#### 1. 应用配置
```bash
# 创建命名空间
kubectl create namespace openclaw-registry

# 应用配置
kubectl apply -f ./k8s/
```

#### 2. 查看状态
```bash
# 查看 Pod 状态
kubectl get pods -n openclaw-registry

# 查看 Service
kubectl get services -n openclaw-registry

# 查看 Ingress
kubectl get ingress -n openclaw-registry
```

---

## 📊 生产环境配置

### **资源要求**

| 环境 | CPU | 内存 | 存储 | 副本数 |
|------|-----|------|------|--------|
| 开发 | 100m | 256Mi | 10Gi | 1 |
| 测试 | 200m | 512Mi | 20Gi | 2 |
| 生产 | 500m | 1Gi | 50Gi | 3+ |

### **安全配置**

#### 1. TLS/SSL
```bash
# 使用 cert-manager 自动生成证书
cat > tls-secret.yaml <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: agent-registry-tls
  namespace: openclaw-registry
spec:
  secretName: agent-registry-tls
  dnsNames:
    - api.openclaw.ai
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
EOF

kubectl apply -f tls-secret.yaml
```

#### 2. 网络策略
```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: agent-registry-network-policy
  namespace: openclaw-registry
spec:
  podSelector:
    matchLabels:
      app: openclaw-agent-registry
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - port: 1111
          protocol: TCP
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - port: 443
          protocol: TCP
EOF
```

---

## 🔄 CI/CD 集成

### **GitHub Actions 示例**
```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: |
          docker build -t openclaw/agent-registry:latest .
      
      - name: Push to Docker Hub
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | \
            docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push openclaw/agent-registry:latest
      
      - name: Deploy to Kubernetes
        run: |
          helm upgrade --install openclaw-agent-registry ./helm \
            --namespace openclaw-registry
```

---

## 🔍 监控和日志

### **Prometheus 监控**
```bash
# 安装 ServiceMonitor
kubectl apply -f ./k8s/monitoring-service-monitor.yaml

# 查看指标
curl http://<pod-ip>:1111/metrics
```

### **日志收集**
```bash
# 查看日志
kubectl logs -f deployment/openclaw-agent-registry -n openclaw-registry

# 查看特定 Pod 日志
kubectl logs -f openclaw-agent-registry-xxxxxxxxx -n openclaw-registry

# 查看日志汇总
kubectl logs -l app=openclaw-agent-registry -n openclaw-registry
```

---

## 🛠️ 维护操作

### **更新部署**
```bash
# 更新镜像
helm upgrade openclaw-agent-registry ./helm \
  --set image.tag=1.1.0

# 回滚
helm rollback openclaw-agent-registry 1
```

### **故障排查**
```bash
# 检查健康状态
kubectl rollout status deployment/openclaw-agent-registry -n openclaw-registry

# 检查资源使用情况
kubectl top pods -n openclaw-registry

# 查看事件
kubectl get events -n openclaw-registry --sort-by='.lastTimestamp'
```

### **备份和恢复**
```bash
# 备份数据
kubectl cp deployment/openclaw-agent-registry:/app/data /backup -n openclaw-registry

# 恢复数据
kubectl cp /backup /app/data -n openclaw-registry --into-pod deployment/openclaw-agent-registry
```

---

## 📞 支持

- **文档**: [View API Documentation](./docs/index.html)
- **GitHub**: https://github.com/KVIP886/openclaw-agent-registry
- **Issue**: https://github.com/KVIP886/openclaw-agent-registry/issues

---

**Last Updated**: 2026-04-09 16:30 (Asia/Shanghai)  
**Version**: 1.0.0
