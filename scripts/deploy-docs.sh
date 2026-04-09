#!/bin/bash
# OpenClaw API Documentation - Deployment Script
# Created: 2026-04-09

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="${SCRIPT_DIR}/dist"
DOC_DIR="${SCRIPT_DIR}/docs"
LOG_FILE="${SCRIPT_DIR}/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is required but not installed"
    fi
    log "✅ Node.js found: $(node --version)"
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        error "npm is required but not installed"
    fi
    log "✅ npm found: $(npm --version)"
    
    # Check for Redoc CLI
    if ! command -v redoc-cli &> /dev/null; then
        warn "Redoc CLI not found. Installing..."
        npm install -g redoc-cli
        log "✅ Redoc CLI installed"
    else
        log "✅ Redoc CLI found: $(redoc-cli --version)"
    fi
    
    # Check for Swagger CLI
    if ! command -v swagger-cli &> /dev/null; then
        warn "Swagger CLI not found. Installing..."
        npm install -g swagger-cli
        log "✅ Swagger CLI installed"
    else
        log "✅ Swagger CLI found: $(swagger-cli --version)"
    fi
}

# Build documentation
build_docs() {
    log "Building API documentation..."
    
    # Create dist directory
    mkdir -p "$DIST_DIR"
    
    # Build Redoc HTML
    log "Building Redoc HTML..."
    redoc-cli build "${DOC_DIR}/openapi.yaml" \
        -o "${DIST_DIR}/redoc.html" \
        --options hideHostname \
        --options sortPropsAlphabetically \
        --options.theme.openapi.color.primary="#1a73e8"
    
    if [ $? -eq 0 ]; then
        success "Redoc HTML built successfully"
    else
        error "Failed to build Redoc HTML"
    fi
    
    # Bundle Swagger YAML
    log "Bundling Swagger YAML..."
    swagger-cli bundle "${DOC_DIR}/openapi.yaml" \
        -o "${DIST_DIR}/swagger-bundled.yaml" \
        --format yaml
    
    if [ $? -eq 0 ]; then
        success "Swagger YAML bundled successfully"
    else
        error "Failed to bundle Swagger YAML"
    fi
    
    # Copy original files
    cp "${DOC_DIR}/openapi.yaml" "${DIST_DIR}/"
    cp "${DOC_DIR}/README.md" "${DIST_DIR}/"
    cp "${DOC_DIR}/CI_CD_CONFIG.md" "${DIST_DIR}/"
    
    success "Documentation build completed: ${DIST_DIR}"
}

# Validate build
validate_build() {
    log "Validating build..."
    
    # Check if required files exist
    if [ ! -f "${DIST_DIR}/redoc.html" ]; then
        error "redoc.html not found in dist directory"
    fi
    
    if [ ! -f "${DIST_DIR}/swagger-bundled.yaml" ]; then
        error "swagger-bundled.yaml not found in dist directory"
    fi
    
    if [ ! -f "${DIST_DIR}/openapi.yaml" ]; then
        error "openapi.yaml not found in dist directory"
    fi
    
    # Check file sizes
    REDOC_SIZE=$(stat -f%z "${DIST_DIR}/redoc.html" 2>/dev/null || stat -c%s "${DIST_DIR}/redoc.html")
    SWAGGER_SIZE=$(stat -f%z "${DIST_DIR}/swagger-bundled.yaml" 2>/dev/null || stat -c%s "${DIST_DIR}/swagger-bundled.yaml")
    
    if [ "$REDOC_SIZE" -lt 1000 ]; then
        error "redoc.html is too small (${REDOC_SIZE} bytes), build may have failed"
    fi
    
    if [ "$SWAGGER_SIZE" -lt 100 ]; then
        error "swagger-bundled.yaml is too small (${SWAGGER_SIZE} bytes), build may have failed"
    fi
    
    success "Build validation passed"
}

# Deploy to environment
deploy_to_environment() {
    local ENV=$1
    
    case $ENV in
        dev)
            log "Deploying to development environment..."
            # TODO: Add SSH deployment logic
            log "Development deployment configuration pending..."
            ;;
        staging)
            log "Deploying to staging environment..."
            # TODO: Add SSH deployment logic
            log "Staging deployment configuration pending..."
            ;;
        prod)
            log "Deploying to production environment..."
            # TODO: Add SSH deployment logic
            log "Production deployment configuration pending..."
            ;;
        *)
            error "Unknown environment: $ENV. Use: dev, staging, prod"
            ;;
    esac
}

# Notify about deployment
notify_deployment() {
    local ENV=$1
    local STATUS=$2
    
    if [ "$STATUS" = "success" ]; then
        log "Deployment to ${ENV} completed successfully"
    else
        log "Deployment to ${ENV} failed: $STATUS"
        # TODO: Add notification logic (Slack, email, etc.)
    fi
}

# Clean up
cleanup() {
    local ENV=$1
    
    case $ENV in
        dev|staging)
            log "Skipping CDN cache invalidation for ${ENV}..."
            ;;
        prod)
            log "Invalidating CDN cache for production..."
            # TODO: Add CDN cache invalidation logic
            ;;
    esac
}

# Main execution
main() {
    log "=== OpenClaw API Documentation Deployment Started ==="
    log "Environment: $1"
    log "Working directory: $(pwd)"
    
    # Check prerequisites
    check_prerequisites
    
    # Build documentation
    build_docs
    
    # Validate build
    validate_build
    
    # Deploy to environment
    deploy_to_environment "${1:-dev}"
    
    # Notify about deployment
    notify_deployment "${1:-dev}" "success"
    
    # Cleanup
    cleanup "${1:-dev}"
    
    log "=== OpenClaw API Documentation Deployment Completed ==="
}

# Parse arguments
case "${1:-}" in
    -h|--help)
        echo "Usage: $0 [environment]"
        echo "Environments: dev, staging, prod"
        echo "Default: dev"
        exit 0
        ;;
    dev|staging|prod)
        main "$1"
        ;;
    *)
        main dev
        ;;
esac
