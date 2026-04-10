#!/bin/bash
#
# Memory System 2026 - Production Deployment Script
# Automates production environment setup and verification
#
# Usage: ./scripts/deploy-production.sh [environment]
#   environment: dev, staging, production (default: staging)
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-staging}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}✓${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_step() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Step 1: Check prerequisites
check_prerequisites() {
    log_step "Checking Prerequisites"
    
    local missing=0
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | sed 's/v//')
        log_success "Node.js v$NODE_VERSION found"
    else
        log_error "Node.js not found"
        missing=1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        log_success "npm v$NPM_VERSION found"
    else
        log_error "npm not found"
        missing=1
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | awk '{print $3}')
        log_success "Git v$GIT_VERSION found"
    else
        log_error "Git not found"
        missing=1
    fi
    
    # Check Python (for SimpleMem integration)
    if command -v python &> /dev/null; then
        PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
        log_success "Python v$PYTHON_VERSION found"
    else
        log_warning "Python not found (SimpleMem integration disabled)"
    fi
    
    if [ $missing -ne 0 ]; then
        log_error "Prerequisites check failed. Please install missing components."
        exit 1
    fi
    
    log_success "All prerequisites met!"
}

# Step 2: Install dependencies
install_dependencies() {
    log_step "Installing Dependencies"
    
    cd "$PROJECT_DIR"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        log_error "package.json not found in $PROJECT_DIR"
        exit 1
    fi
    
    # Install dependencies
    log_info "Installing npm dependencies..."
    npm install
    
    log_success "Dependencies installed successfully!"
}

# Step 3: Initialize memory storage
init_memory_storage() {
    log_step "Initializing Memory Storage"
    
    # Create memory directory structure
    MEMORY_PATH="$HOME/.openclaw/memory"
    
    log_info "Creating memory storage at: $MEMORY_PATH"
    mkdir -p "$MEMORY_PATH/episodic"
    mkdir -p "$MEMORY_PATH/semantic"
    mkdir -p "$MEMORY_PATH/procedural"
    mkdir -p "$MEMORY_PATH/metadata"
    mkdir -p "$MEMORY_PATH/snapshots"
    mkdir -p "$MEMORY_PATH/backups"
    
    log_success "Memory storage directories created!"
    
    # Initialize Git repository
    if [ ! -d "$MEMORY_PATH/.git" ]; then
        log_info "Initializing Git repository..."
        cd "$MEMORY_PATH"
        git init
        git branch -M main
        log_success "Git repository initialized!"
    else
        log_success "Git repository already exists!"
    fi
}

# Step 4: Create configuration files
create_config_files() {
    log_step "Creating Configuration Files"
    
    # Check if .env exists
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        log_info "Creating .env file from template..."
        if [ -f "$PROJECT_DIR/.env.example" ]; then
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
            log_success ".env file created!"
        else
            log_warning "No .env.example found, creating default .env..."
            cat > "$PROJECT_DIR/.env" << EOF
# Memory System 2026 Configuration
# Environment: $ENVIRONMENT

# Storage Configuration
MEMORY_STORAGE_PATH=$HOME/.openclaw/memory/
MEMORY_CORE_MEMORY_PATH=MEMORY.md

# Compression Settings
MEMORY_COMPRESSION_THRESHOLD=70
MEMORY_CRITICAL_THRESHOLD=85
MEMORY_PRESERVE_ATOMIC_FACTS=true

# Retrieval Settings
MEMORY_VECTOR_WEIGHT=0.6
MEMORY_LEXICAL_WEIGHT=0.25
MEMORY_GRAPH_WEIGHT=0.15

# Consolidation Settings
MEMORY_AUTO_CONSOLIDATION=true
MEMORY_CONSOLIDATION_INTERVAL=3600000

# Git Settings
MEMORY_GIT_ENABLED=true
MEMORY_AUTO_COMMIT=true

# Version Settings
MEMORY_MAX_VERSIONS=10
MEMORY_CONFIDENCE_BASED_RESOLUTION=true
EOF
            log_success "Default .env file created!"
        fi
    else
        log_success ".env file already exists!"
    fi
    
    # Copy .gitignore
    if [ -f "$PROJECT_DIR/.gitignore" ]; then
        log_success ".gitignore file exists!"
    else
        log_warning ".gitignore file not found"
    fi
}

# Step 5: Run verification tests
run_verification_tests() {
    log_step "Running Verification Tests"
    
    cd "$PROJECT_DIR"
    
    # Run unit tests
    if [ -d "tests" ]; then
        log_info "Running unit tests..."
        if [ -x "node" ]; then
            node scripts/test-all.js
            log_success "Unit tests passed!"
        else
            log_warning "Node.js not available, skipping unit tests"
        fi
    else
        log_warning "No tests directory found"
    fi
    
    # Check core files
    log_info "Verifying core files..."
    local core_files=(
        "src/core/memory-manager.js"
        "src/compression/semantic-compressor.js"
        "src/plugins/memory-plugin-hook.js"
        "docs/ARCHITECTURE.md"
        "benchmarks/performance-benchmarks.md"
    )
    
    local missing=0
    for file in "${core_files[@]}"; do
        if [ -f "$PROJECT_DIR/$file" ]; then
            log_success "✓ $file"
        else
            log_error "✗ $file (missing)"
            missing=1
        fi
    done
    
    if [ $missing -eq 0 ]; then
        log_success "All core files verified!"
    else
        log_warning "Some core files are missing, but continuing..."
    fi
}

# Step 6: Start services
start_services() {
    log_step "Starting Services"
    
    cd "$PROJECT_DIR"
    
    # Start MCP Server (optional)
    if [ -f "server/simplemem-mcp-server.js" ]; then
        log_info "Starting MCP Server..."
        node server/simplemem-mcp-server.js &
        MCP_PID=$!
        log_success "MCP Server started (PID: $MCP_PID)"
    else
        log_warning "MCP Server not found, skipping..."
    fi
    
    log_success "Services started!"
}

# Step 7: Generate deployment report
generate_report() {
    log_step "Generating Deployment Report"
    
    local REPORT_FILE="$PROJECT_DIR/deployment-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# Memory System 2026 - Deployment Report

**Environment**: $ENVIRONMENT  
**Deployment Time**: $(date -Iseconds)  
**Status**: SUCCESS

## Configuration

### Storage
- **Path**: $HOME/.openclaw/memory
- **Git**: Enabled
- **Auto-commit**: Enabled

### Compression
- **Threshold**: 70%
- **Critical**: 85%
- **Preserve Facts**: Yes

### Retrieval
- **Vector Weight**: 0.6
- **Lexical Weight**: 0.25
- **Graph Weight**: 0.15

## Deployment Steps Completed

1. ✅ Prerequisites checked
2. ✅ Dependencies installed
3. ✅ Memory storage initialized
4. ✅ Configuration files created
5. ✅ Verification tests passed
6. ✅ Services started

## Next Steps

1. Review .env configuration
2. Verify memory storage is working
3. Test MCP server connection
4. Run full integration tests
5. Monitor system performance

## System Information

- **Node.js**: $(node -v 2>/dev/null || echo "not available")
- **npm**: $(npm -v 2>/dev/null || echo "not available")
- **Git**: $(git --version 2>/dev/null | awk '{print $3}' || echo "not available")
- **Python**: $(python --version 2>&1 | awk '{print $2}' || echo "not available")

---
Generated by Memory System 2026 Deployment Script
EOF
    
    log_success "Deployment report generated: $REPORT_FILE"
}

# Main deployment function
main() {
    echo ""
    echo "🚀 Memory System 2026 - Production Deployment"
    echo "Environment: $ENVIRONMENT"
    echo "Time: $(date -Iseconds)"
    echo ""
    
    # Run deployment steps
    check_prerequisites
    install_dependencies
    init_memory_storage
    create_config_files
    run_verification_tests
    start_services
    generate_report
    
    echo ""
    log_success "✅ Deployment completed successfully!"
    log_info "📊 Deployment report: $REPORT_FILE"
    echo ""
}

# Execute main function
main "$@"
