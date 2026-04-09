# 🚀 OpenClaw Agent Registry - K8s 部署指南

## 📋 前置检查清单

### **必需工具**
- [ ] `kubectl` - Kubernetes 命令行工具
- [ ] `Helm v3.x` - 可选，但推荐使用
- [ ] 集群管理员权限
- [ ] 网络访问集群

### **集群要求**
- Kubernetes 1.20+
- 可用存储类 (StorageClass)
- TLS 证书支持 (可选，推荐 cert-manager)

---

## 🛠️ 部署步骤

### **第一步：环境验证**

```bash
# 执行验证脚本
./scripts/verify-and-deploy.sh
```

该脚本会检查：
- ✅ kubectl 安装和版本
- ✅ 集群访问权限
- ✅ 节点健康状态
- ✅ 存储类支持
- ✅ Cert-manager 状态
- ✅ Helm 可用性

---

### **第二步：快速部署 (kubectl)**

```bash
# 1. 创建命名空间
kubectl create namespace openclaw-registry --dry-run=client -o yaml | kubectl apply -f -

# 2. 应用所有配置
kubectl apply -f ./k8s/

# 3. 等待部署完成
kubectl rollout status deployment/agent-registry -n openclaw-registry

# 4. 查看 Pod 状态
kubectl get pods -n openclaw-registry -w

# 5. 检查服务
kubectl get svc -n openclaw-registry
```

---

### **第三步：Helm 部署 (推荐)**

```bash
# 1. 创建命名空间
kubectl create namespace openclaw-registry

# 2. 安装 Helm Chart
helm upgrade --install openclaw-agent-registry ./helm \
  --namespace openclaw-registry \
  --create-namespace \
  --wait

# 3. 查看部署状态
helm list -n openclaw-registry
kubectl get pods -n openclaw-registry
```

---

### **第四步：自定义配置**

创建 `values-custom.yaml`:

```yaml
# 自定义配置示例
image:
  repository: my-registry/openclaw/agent-registry
  tag: "1.0.0"

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
  targetCPUUtilizationPercentage: 80

ingress:
  enabled: true
  hosts:
    - host: api.mycompany.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: agent-registry-tls
      hosts:
        - api.mycompany.com

persistence:
  enabled: true
  size: 50Gi
  storageClassName: ssd
```

应用自定义配置:

```bash
helm upgrade --install openclaw-agent-registry ./helm \
  --namespace openclaw-registry \
  --values values-custom.yaml \
  --wait
```

---

## 📊 部署后验证

### **1. 检查 Pod 状态**
```bash
kubectl get pods -n openclaw-registry
# 应显示：3/3 Running
```

### **2. 查看服务暴露**
```bash
kubectl get svc -n openclaw-registry
```

### **3. 测试 API 访问**
```bash
# 获取 Ingress 地址
kubectl get ingress -n openclaw-registry

# 或者使用端口转发
kubectl port-forward svc/agent-registry 1111:1111 -n openclaw-registry

# 测试健康检查
curl http://localhost:1111/health
```

### **4. 检查日志**
```bash
kubectl logs -l app=openclaw-agent-registry -n openclaw-registry
```

### **5. 验证配置**
```bash
# 检查 ConfigMap
kubectl get configmap agent-registry-config -n openclaw-registry -o yaml

# 检查 Secret
kubectl get secret agent-registry-secrets -n openclaw-registry -o yaml
```

---

## 🔄 故障排查

### **Pod 无法启动**
```bash
# 查看 Pod 事件
kubectl describe pod <pod-name> -n openclaw-registry

# 查看容器日志
kubectl logs <pod-name> -n openclaw-registry
```

### **服务无法访问**
```bash
# 检查 Ingress
kubectl get ingress -n openclaw-registry
kubectl describe ingress agent-registry-ingress -n openclaw-registry

# 检查服务选择器
kubectl get svc agent-registry -n openclaw-registry -o yaml

# 测试端口转发
kubectl port-forward svc/agent-registry 1111:1111 -n openclaw-registry
```

### **存储类问题**
```bash
# 检查存储类
kubectl get storageclass

# 检查 PVC 状态
kubectl get pvc -n openclaw-registry
kubectl describe pvc <pvc-name> -n openclaw-registry
```

### **资源不足**
```bash
# 检查资源配额
kubectl top pods -n openclaw-registry

# 检查节点资源
kubectl top nodes

# 查看调度事件
kubectl get events -n openclaw-registry --sort-by='.lastTimestamp'
```

---

## 📈 监控和日志

### **Prometheus 集成**
```bash
# 检查 ServiceMonitor
kubectl get servicemonitor -n openclaw-registry

# 访问 Prometheus 查看指标
# http://prometheus.example.com/graph?g0.expr=up{job="agent-registry"}
```

### **日志收集**
```bash
# 查看所有 Pod 日志
kubectl logs -l app=openclaw-agent-registry -n openclaw-registry

# 实时跟踪日志
kubectl logs -f -l app=openclaw-agent-registry -n openclaw-registry

# 查看特定 Pod
kubectl logs -f <pod-name> -n openclaw-registry
```

### **健康检查**
```bash
# 手动健康检查
kubectl exec -it <pod-name> -n openclaw-registry -- curl -f http://localhost:1111/health

# 检查启动探针
kubectl get pod <pod-name> -n openclaw-registry -o jsonpath='{.status.containerStatuses[0].lastState}'
```

---

## 🚀 生产环境最佳实践

### **1. 资源配置**
```yaml
# 推荐生产环境配置
resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### **2. 弹性伸缩**
```yaml
# 启用 HPA
autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 20
  targetCPUUtilizationPercentage: 80
```

### **3. 安全加固**
```bash
# 启用网络策略
kubectl apply -f ./k8s/network-policy.yaml

# 配置 RBAC
kubectl apply -f ./k8s/rbac.yaml
```

### **4. 日志和监控**
```bash
# 集成 ELK/Loki
# 配置 Prometheus/Grafana
# 设置告警规则
```

---

## 📞 支持

- **文档**: [View API Documentation](./docs/index.html)
- **GitHub**: https://github.com/KVIP886/openclaw-agent-registry
- **Issue**: https://github.com/KVIP886/openclaw-agent-registry/issues

---

**准备就绪**: 执行 `./scripts/verify-and-deploy.sh` 开始部署！

**Last Updated**: 2026-04-09 16:35 (Asia/Shanghai)  
**Version**: 1.0.0
