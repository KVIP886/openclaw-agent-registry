#!/bin/bash
# OpenClaw Agent Registry - Docker Build and Deploy Scripts
# Created: 2026-04-09

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"
IMAGE_NAME="openclaw/agent-registry"
VERSION="1.0.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo -e "${RED}ERROR: $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

warn() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is required but not installed"
    fi
    log "✅ Docker found: $(docker --version)"
    
    # Check docker-compose
    if ! command -v docker-compose &> /dev/null; then
        warn "docker-compose not found. Trying 'docker compose'..."
        if ! docker compose version &> /dev/null; then
            error "docker-compose or 'docker compose' is required"
        fi
    else
        log "✅ docker-compose found: $(docker-compose --version)"
    fi
    
    # Check kubectl
    if command -v kubectl &> /dev/null; then
        log "✅ kubectl found: $(kubectl version --short 2>&1 | head -1)"
    else
        warn "kubectl not found. Kubernetes deployment steps will be skipped"
    fi
    
    # Check helm
    if command -v helm &> /dev/null; then
        log "✅ helm found: $(helm version --short)"
    else
        warn "helm not found. Helm deployment steps will be skipped"
    fi
}

# Build Docker image
build_image() {
    local platform="${1:-linux/amd64,linux/arm64}"
    
    log "Building Docker image: ${IMAGE_NAME}:${VERSION}"
    log "Platform: ${platform}"
    
    docker build -t ${IMAGE_NAME}:${VERSION} \
        --platform ${platform} \
        --build-arg VERSION=${VERSION} \
        -f ${PROJECT_ROOT}/Dockerfile \
        ${PROJECT_ROOT}
    
    if [ $? -eq 0 ]; then
        success "Docker image built successfully"
        log "Image: ${IMAGE_NAME}:${VERSION}"
    else
        error "Failed to build Docker image"
    fi
}

# Push to Docker Registry
push_to_registry() {
    local registry="${1:-registry.hub.docker.com}"
    local username="${2:-}"
    local password="${3:-}"
    
    if [ -z "$username" ]; then
        warn "No username provided. Pushing to public registry..."
    else
        log "Logging into Docker registry: ${registry}"
        echo "$password" | docker login ${registry} -u "${username}" --password-stdin
        
        # Tag image
        log "Tagging image for ${registry}"
        docker tag ${IMAGE_NAME}:${VERSION} ${registry}/${username}/${IMAGE_NAME}:${VERSION}
    fi
    
    log "Pushing image to ${registry}/${username}/${IMAGE_NAME}:${VERSION}"
    docker push ${registry}/${username}/${IMAGE_NAME}:${VERSION}
    
    if [ $? -eq 0 ]; then
        success "Image pushed successfully"
    else
        error "Failed to push image"
    fi
}

# Run with docker-compose
run_with_compose() {
    local environment="${1:-dev}"
    
    log "Starting services with docker-compose (environment: ${environment})"
    
    if docker compose version &> /dev/null; then
        docker compose -f ${PROJECT_ROOT}/docker-compose.yml up -d
    else
        docker compose -f ${PROJECT_ROOT}/docker-compose.yml up -d
    fi
    
    if [ $? -eq 0 ]; then
        success "Services started successfully"
        log "Access API at: http://localhost:1111"
        log "Access docs at: http://localhost:8080"
    else
        error "Failed to start services"
    fi
}

# Deploy to Kubernetes
deploy_to_k8s() {
    local namespace="${1:-openclaw-registry}"
    local release_name="${2:-openclaw-agent-registry}"
    local values_file="${3:-}"
    
    log "Deploying to Kubernetes"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is required for Kubernetes deployment"
    fi
    
    # Apply namespace
    log "Creating namespace: ${namespace}"
    kubectl create namespace ${namespace} --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy using Helm
    if command -v helm &> /dev/null; then
        log "Installing via Helm..."
        
        if [ -n "$values_file" ]; then
            helm upgrade --install ${release_name} ${PROJECT_ROOT}/helm \
                --namespace ${namespace} \
                --create-namespace \
                --values ${values_file}
        else
            helm upgrade --install ${release_name} ${PROJECT_ROOT}/helm \
                --namespace ${namespace} \
                --create-namespace
        fi
        
        if [ $? -eq 0 ]; then
            success "Deployment successful"
        else
            error "Helm deployment failed"
        fi
    else
        warn "Helm not found. Using kubectl apply..."
        
        # Apply k8s manifests
        kubectl apply -f ${PROJECT_ROOT}/k8s/deploy.yaml
        
        if [ $? -eq 0 ]; then
            success "kubectl deployment successful"
        else
            error "kubectl deployment failed"
        fi
    fi
}

# Health check
health_check() {
    local url="${1:-http://localhost:1111}"
    
    log "Checking service health at: ${url}/health"
    
    local response
    response=$(curl -sf "${url}/health" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local status=$(echo "${response}" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        if [ "${status}" = "healthy" ]; then
            success "Service is healthy"
            echo "${response}" | jq '.' 2>/dev/null || echo "${response}"
        else
            warn "Service status: ${status}"
        fi
    else
        error "Service is not responding"
    fi
}

# Main execution
main() {
    local command="${1:-help}"
    
    case $command in
        build)
            check_prerequisites
            build_image "${2:-}"
            ;;
        push)
            check_prerequisites
            push_to_registry "${2:-}" "${3:-}" "${4:-}"
            ;;
        run)
            check_prerequisites
            run_with_compose "${2:-dev}"
            ;;
        deploy-k8s)
            check_prerequisites
            deploy_to_k8s "${2:-openclaw-registry}" "${3:-openclaw-agent-registry}" "${4:-}"
            ;;
        health)
            health_check "${2:-http://localhost:1111}"
            ;;
        all)
            log "Running full deployment pipeline..."
            check_prerequisites
            build_image
            run_with_compose dev
            health_check
            ;;
        help|*)
            echo "OpenClaw Agent Registry - Docker/Kubernetes Deployment Scripts"
            echo ""
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  build [platform]          Build Docker image"
            echo "  push [registry] [user] [pass]  Push to registry"
            echo "  run [environment]         Run with docker-compose"
            echo "  deploy-k8s [ns] [release]  Deploy to Kubernetes"
            echo "  health [url]              Check service health"
            echo "  all                       Run full deployment pipeline"
            echo "  help                      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 build"
            echo "  $0 push registry.hub.docker.com myuser mypass"
            echo "  $0 run prod"
            echo "  $0 deploy-k8s mynamespace myrelease"
            echo "  $0 health http://api.openclaw.ai"
            echo "  $0 all"
            ;;
    esac
}

# Execute
main "$@"
