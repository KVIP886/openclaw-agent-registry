#!/bin/bash
# OpenClaw Agent Registry - K8s Deployment Verification Script
# Created: 2026-04-09

set -e

echo "================================"
echo "OpenClaw Agent Registry - K8s 部署安全检查"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
check_status() {
    local status=$1
    local msg=$2
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}✓ ${msg}${NC}"
        return 0
    else
        echo -e "${RED}✗ ${msg}${NC}"
        return 1
    fi
}

# 1. 检查 kubectl
echo "[1/6] 检查 kubectl 安装..."
if command -v kubectl &> /dev/null; then
    KUBE_VERSION=$(kubectl version --client --short 2>/dev/null || kubectl version --client 2>/dev/null | grep "Client Version" | cut -d' ' -f4)
    check_status $? "kubectl 已安装 (版本：${KUBE_VERSION})"
else
    echo -e "${RED}未找到 kubectl，请先安装！${NC}"
    exit 1
fi

# 2. 检查集群访问权限
echo "[2/6] 检查集群访问权限..."
kubectl cluster-info > /dev/null 2>&1
check_status $? "可以访问集群"
CLUSTER_NAME=$(kubectl config current-context 2>/dev/null || echo "unknown")
echo -e "当前集群：${YELLOW}${CLUSTER_NAME}${NC}"

# 3. 检查集群状态
echo "[3/6] 检查集群健康状态..."
STATUS=$(kubectl get nodes -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "N/A")
READY_COUNT=$(echo $STATUS | grep -o "True" | wc -w)
TOTAL_COUNT=$(echo $STATUS | wc -w)
check_status $? "集群节点状态：${READY_COUNT}/${TOTAL_COUNT} 就绪"

# 4. 检查存储类
echo "[4/6] 检查存储类支持..."
STORAGE_CLASSES=$(kubectl get storageclass -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "none")
if [ -n "$STORAGE_CLASSES" ] && [ "$STORAGE_CLASSES" != "none" ]; then
    echo -e "${GREEN}✓ 存储类支持：${STORAGE_CLASSES}${NC}"
else
    echo -e "${YELLOW}⚠ 未找到存储类，可能需要配置${NC}"
fi

# 5. 检查 Cert-manager (可选)
echo "[5/6] 检查 Cert-manager..."
CERT_MANAGER=$(kubectl get pods -n cert-manager --selector=app.kubernetes.io/name=cert-manager -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
if [ -n "$CERT_MANAGER" ]; then
    echo -e "${GREEN}✓ Cert-manager 已安装：${CERT_MANAGER}${NC}"
else
    echo -e "${YELLOW}⚠ 未安装 Cert-manager，TLS 证书需要手动配置${NC}"
fi

# 6. 检查 Helm (可选)
echo "[6/6] 检查 Helm..."
if command -v helm &> /dev/null; then
    HELM_VERSION=$(helm version --short 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓ Helm 已安装：${HELM_VERSION}${NC}"
else
    echo -e "${YELLOW}⚠ 未安装 Helm，将使用 kubectl apply${NC}"
fi

echo ""
echo "================================"
echo "安全检查完成！"
echo "================================"
echo ""

# 提供下一步选项
echo "请选择下一步操作："
echo "1. 使用 kubectl 部署"
echo "2. 使用 Helm 部署"
echo "3. 查看已部署状态"
echo "4. 跳过部署，仅检查配置"
echo ""

read -p "请输入选项 (1-4): " option

case $option in
    1)
        echo "使用 kubectl 部署..."
        echo "正在创建命名空间..."
        kubectl create namespace openclaw-registry --dry-run=client -o yaml | kubectl apply -f -
        
        echo "应用配置..."
        kubectl apply -f ./k8s/
        
        echo "等待部署完成..."
        kubectl rollout status deployment/agent-registry -n openclaw-registry
        
        echo "查看 Pod 状态..."
        kubectl get pods -n openclaw-registry
        
        echo "查看 Service..."
        kubectl get svc -n openclaw-registry
        ;;
    
    2)
        echo "使用 Helm 部署..."
        if command -v helm &> /dev/null; then
            echo "安装 Chart..."
            helm upgrade --install openclaw-agent-registry ./helm \
                --namespace openclaw-registry \
                --create-namespace \
                --wait
            echo "查看部署状态..."
            helm list -n openclaw-registry
        else
            echo "错误：Helm 未安装"
        fi
        ;;
    
    3)
        echo "查看部署状态..."
        echo "Pod 状态:"
        kubectl get pods -n openclaw-registry
        echo ""
        echo "部署状态:"
        kubectl rollout status deployment/agent-registry -n openclaw-registry
        echo ""
        echo "服务信息:"
        kubectl get svc -n openclaw-registry
        echo ""
        echo "Ingress:"
        kubectl get ingress -n openclaw-registry
        ;;
    
    4)
        echo "跳过部署"
        ;;
    
    *)
        echo "无效选项"
        ;;
esac

echo ""
echo "部署完成！"
echo "================================"
