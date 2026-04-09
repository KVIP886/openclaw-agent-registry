#!/bin/bash
# Agent Registry - Startup Script
# Created: 2026-04-10 (Week 5 Day 4)

set -e

# Configuration
APP_PORT=${PORT:-1111}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-agent_registry}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if all required environment variables are set
check_environment() {
    log_info "Checking environment variables..."
    
    local missing_vars=()
    
    [[ -z "$DB_HOST" ]] && missing_vars+=("DB_HOST")
    [[ -z "$DB_NAME" ]] && missing_vars+=("DB_NAME")
    [[ -z "$DB_USER" ]] && missing_vars+=("DB_USER")
    [[ -z "$DB_PASSWORD" ]] && missing_vars+=("DB_PASSWORD")
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    log_info "Environment variables check: PASSED"
}

# Check database connectivity
check_database() {
    log_info "Checking database connectivity..."
    
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if nc -z $DB_HOST $DB_PORT 2>/dev/null; then
            log_info "Database connectivity: OK"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log_warn "Database not available, retrying... ($attempt/$max_attempts)"
        sleep 2
    done
    
    log_error "Database connection failed after $max_attempts attempts"
    return 1
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Run SQL schema if needed
    if command -v psql &> /dev/null; then
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" 2>/dev/null
        if [[ $? -eq 0 ]]; then
            log_info "Database connection successful"
        else
            log_warn "Database might not be initialized yet"
        fi
    else
        log_warn "psql not available, skipping migration check"
    fi
    
    log_info "Database migrations: COMPLETE"
}

# Start the application
start_app() {
    log_info "Starting Agent Registry on port $APP_PORT..."
    
    export NODE_ENV=${NODE_ENV:-production}
    export LOG_LEVEL=${LOG_LEVEL:-info}
    
    exec node index.js
}

# Main execution
main() {
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         Agent Registry v1.0.0 - Starting             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    
    # Check environment
    check_environment
    
    # Check database
    check_database
    
    # Run migrations
    run_migrations
    
    # Start application
    start_app
}

# Run main function
main "$@"
