#!/bin/bash
# ============================================
# Kubernetes Deployment Script
# Created: 2026-04-10 (Week 5 Day 5)
# Function: Deploy Agent Registry to K8s cluster
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}╔══════════════════════════════════════════════════╗" -ForegroundColor $Green
echo -e "${GREEN}║   Kubernetes Deployment Tool                   ║" -ForegroundColor $Green
echo -e "${GREEN}╚══════════════════════════════════════════════════╝" -ForegroundColor $Green
echo ""

# Check if kubectl is installed
check_kubectl() {
    echo -e "${GREEN}✓${NC} Checking kubectl installation..."
    if command -v kubectl &> /dev/null; then
        KUBE_VERSION=$(kubectl version --client --output=json 2>/dev/null | jq -r '.clientVersion.gitVersion' 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✓${NC} kubectl installed: ${KUBE_VERSION}"
    else
        echo -e "${RED}✗${NC} kubectl not installed"
        exit 1
    fi
}

# Check if kubectl can connect to cluster
check_cluster_connectivity() {
    echo -e "${GREEN}✓${NC} Checking cluster connectivity..."
    if kubectl cluster-info &> /dev/null; then
        echo -e "${GREEN}✓${NC} Cluster connection: OK"
    else
        echo -e "${RED}✗${NC} Cannot connect to cluster"
        exit 1
    fi
}

# Check if namespace exists
check_namespace() {
    local namespace=${1:-"agent-registry"}
    echo -e "${GREEN}✓${NC} Checking namespace: ${namespace}..."
    
    if kubectl get namespace "${namespace}" &> /dev/null; then
        echo -e "${GREEN}✓${NC} Namespace exists: ${namespace}"
    else
        echo -e "${YELLOW}⚠${NC} Namespace does not exist, creating..."
        kubectl create namespace "${namespace}"
    fi
}

# Deploy secrets
deploy_secrets() {
    echo -e "${GREEN}✓${NC} Deploying secrets..."
    
    # Check if secret values are set
    if ! grep -q "your-secure-database-password" k8s/secrets.yaml 2>/dev/null; then
        echo -e "${YELLOW}⚠${NC} Secrets need to be updated before deployment"
        echo -e "${YELLOW}⚠${NC} Edit k8s/secrets.yaml with your actual values"
        echo -e "${YELLOW}⚠${NC} Required updates:"
        echo -e "  - DB_PASSWORD"
        echo -e "  - JWT_SECRET"
        echo -e "  - JWT_REFRESH_SECRET"
        return 1
    fi
    
    kubectl apply -f k8s/secrets.yaml
    echo -e "${GREEN}✓${NC} Secrets deployed"
}

# Deploy configmap
deploy_configmap() {
    echo -e "${GREEN}✓${NC} Deploying ConfigMaps..."
    kubectl apply -f k8s/configmap.yaml
    echo -e "${GREEN}✓${NC} ConfigMaps deployed"
}

# Deploy services
deploy_services() {
    echo -e "${GREEN}✓${NC} Deploying Services..."
    kubectl apply -f k8s/services.yaml
    echo -e "${GREEN}✓${NC} Services deployed"
}

# Deploy deployment
deploy_deployment() {
    echo -e "${GREEN}✓${NC} Deploying Deployment..."
    kubectl apply -f k8s/deployment.yaml
    echo -e "${GREEN}✓${NC} Deployment deployed"
}

# Deploy HPA
deploy_hpa() {
    echo -e "${GREEN}✓${NC} Deploying HPA..."
    kubectl apply -f k8s/hpa.yaml
    echo -e "${GREEN}✓${NC} HPA deployed"
}

# Deploy ingress
deploy_ingress() {
    echo -e "${GREEN}✓${NC} Deploying Ingress..."
    kubectl apply -f k8s/ingress.yaml
    echo -e "${GREEN}✓${NC} Ingress deployed"
}

# Deploy network policies
deploy_network_policies() {
    echo -e "${GREEN}✓${NC} Deploying NetworkPolicies..."
    kubectl apply -f k8s/network-policy.yaml
    echo -e "${GREEN}✓${NC} NetworkPolicies deployed"
}

# Wait for deployment to be ready
wait_for_deployment() {
    local namespace=${1:-"agent-registry"}
    echo -e "${GREEN}✓${NC} Waiting for deployment to be ready..."
    
    kubectl wait --for=condition=available deployment/agent-registry \
        --namespace="${namespace}" \
        --timeout=300s
    
    echo -e "${GREEN}✓${NC} Deployment is ready"
}

# Verify deployment
verify_deployment() {
    local namespace=${1:-"agent-registry"}
    echo -e "${GREEN}✓${NC} Verifying deployment..."
    
    # Check pods
    local pods=$(kubectl get pods -l app=agent-registry -n "${namespace}" -o jsonpath='{.items[*].status.phase}')
    if [[ "$pods" == *"Running"* ]]; then
        echo -e "${GREEN}✓${NC} Pods are running"
    else
        echo -e "${RED}✗${NC} Pods are not running: ${pods}"
        return 1
    fi
    
    # Check services
    if kubectl get svc agent-registry -n "${namespace}" &> /dev/null; then
        echo -e "${GREEN}✓${NC} Services are available"
    else
        echo -e "${RED}✗${NC} Services not found"
        return 1
    fi
    
    # Check health endpoint
    echo -e "${GREEN}✓${NC} Checking health endpoint..."
    kubectl get svc agent-registry -n "${namespace}" -o jsonpath='{.spec.clusterIP}' | xargs -I {} \
        curl -s -o /dev/null -w "HTTP Code: %{http_code}\n" http://{}/api/health
    
    echo -e "${GREEN}✓${NC} Deployment verified successfully"
}

# Show deployment status
show_status() {
    local namespace=${1:-"agent-registry"}
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗" -ForegroundColor $Green
    echo -e "${GREEN}║   Deployment Status                              ║" -ForegroundColor $Green
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝" -ForegroundColor $Green
    echo ""
    
    echo "Pods:"
    kubectl get pods -l app=agent-registry -n "${namespace}"
    echo ""
    
    echo "Services:"
    kubectl get svc -l app=agent-registry -n "${namespace}"
    echo ""
    
    echo "HPA Status:"
    kubectl get hpa -l app=agent-registry -n "${namespace}"
    echo ""
    
    echo "Ingress:"
    kubectl get ingress -l app=agent-registry -n "${namespace}"
    echo ""
    
    echo "Deployment Details:"
    kubectl describe deployment agent-registry -n "${namespace}" | head -30
    echo ""
}

# Rollback deployment
rollback() {
    local namespace=${1:-"agent-registry"}
    local revision=${2:-"1"}
    echo -e "${GREEN}✓${NC} Rolling back deployment to revision ${revision}..."
    kubectl rollout undo deployment/agent-registry -n "${namespace}" --to-revision="${revision}"
    echo -e "${GREEN}✓${NC} Rollback completed"
}

# Generate deployment commands
generate_commands() {
    echo ""
    echo -e "${YELLOW}📝 Recommended Commands:" -ForegroundColor $Yellow
    echo ""
    echo "1. Deploy to cluster:"
    echo "   kubectl apply -f k8s/secrets.yaml"
    echo "   kubectl apply -f k8s/configmap.yaml"
    echo "   kubectl apply -f k8s/services.yaml"
    echo "   kubectl apply -f k8s/deployment.yaml"
    echo "   kubectl apply -f k8s/hpa.yaml"
    echo "   kubectl apply -f k8s/ingress.yaml"
    echo "   kubectl apply -f k8s/network-policy.yaml"
    echo ""
    echo "2. Check deployment status:"
    echo "   kubectl get all -l app=agent-registry -n agent-registry"
    echo ""
    echo "3. View logs:"
    echo "   kubectl logs -l app=agent-registry -n agent-registry -f"
    echo ""
    echo "4. Scale manually:"
    echo "   kubectl scale deployment agent-registry -n agent-registry --replicas=5"
    echo ""
}

# Main execution
main() {
    check_kubectl
    check_cluster_connectivity
    
    local namespace="agent-registry"
    check_namespace "${namespace}"
    
    echo ""
    echo -e "${YELLOW}📝 Before deployment:" -ForegroundColor $Yellow
    echo -e "  1. Update k8s/secrets.yaml with your actual values"
    echo -e "  2. Ensure you have kubectl configured for your cluster"
    echo -e "  3. Check if namespace '${namespace}' exists or create it"
    echo ""
    
    read -p "Continue with deployment? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_secrets
        deploy_configmap
        deploy_services
        deploy_deployment
        deploy_hpa
        deploy_ingress
        deploy_network_policies
        
        echo ""
        wait_for_deployment "${namespace}"
        verify_deployment "${namespace}"
        show_status "${namespace}"
        
        generate_commands
    else
        echo -e "${YELLOW}⚠${NC} Deployment cancelled"
    fi
}

# Run main function
main "$@"
