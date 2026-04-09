-- PostgreSQL Migration Script for Agent Registry
-- Version: 1.0.0
-- Date: 2026-04-10

-- ============================================
-- Section 1: Extensions and Utilities
-- ============================================

-- Install required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create utility functions
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create version hash function
CREATE OR REPLACE FUNCTION calculate_config_hash(config jsonb)
RETURNS TEXT AS $$
BEGIN
    RETURN md5(config::text);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Section 2: Users Table (RBAC Support)
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user', -- 'admin', 'operator', 'user'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ,
    
    CONSTRAINT valid_role CHECK (role IN ('admin', 'operator', 'user'))
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================
-- Section 3: Permissions Table
-- ============================================

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'agent', 'config', 'audit', 'system'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    
    UNIQUE (user_id, permission_id)
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX idx_user_permissions_expires ON user_permissions(expires_at);

-- ============================================
-- Section 4: Agents Table (Core Configuration)
-- ============================================

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    configuration JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'paused', 'error', 'stopped'
    version INTEGER DEFAULT 1,
    current_version_id UUID,
    owner_id UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_deployed_at TIMESTAMPTZ,
    deployed_by UUID REFERENCES users(id),
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'paused', 'error', 'stopped')),
    CONSTRAINT valid_version CHECK (version >= 1)
);

CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_owner ON agents(owner_id);
CREATE INDEX idx_agents_version ON agents(version);
CREATE INDEX idx_agents_metadata ON agents USING GIN (metadata);
CREATE INDEX idx_agents_config ON agents USING GIN (configuration);

-- Full-text search index
CREATE INDEX idx_agents_search ON agents USING gin(
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- ============================================
-- Section 5: Agent Versions Table (Version Control)
-- ============================================

CREATE TABLE agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}',
    configuration_hash VARCHAR(64) NOT NULL,
    description TEXT,
    author_id UUID REFERENCES users(id),
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (agent_id, version),
    CONSTRAINT valid_version CHECK (version >= 1)
);

CREATE INDEX idx_agent_versions_agent ON agent_versions(agent_id);
CREATE INDEX idx_agent_versions_version ON agent_versions(agent_id, version);
CREATE INDEX idx_agent_versions_current ON agent_versions(agent_id) WHERE is_current = true;
CREATE INDEX idx_agent_versions_hash ON agent_versions(configuration_hash);
CREATE INDEX idx_agent_versions_author ON agent_versions(author_id);
CREATE INDEX idx_agent_versions_created ON agent_versions(created_at);

-- ============================================
-- Section 6: Audit Logs Table (Complete History)
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'deployed', 'undeployed', 'paused', 'resumed'
    resource_type VARCHAR(50) NOT NULL, -- 'agent', 'configuration', 'permission'
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_agent ON audit_logs(agent_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_metadata ON audit_logs USING GIN (metadata);

-- ============================================
-- Section 7: Conflicts Table (Conflict Resolution)
-- ============================================

CREATE TABLE conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL, -- 'name', 'id', 'permission', 'resource', 'configuration', 'priority', 'order'
    conflict_severity VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
    details JSONB NOT NULL DEFAULT '{}',
    resolution VARCHAR(50), -- 'manual', 'automatic', 'renamed', 'merged', 'reverted'
    resolution_details JSONB,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_severity CHECK (conflict_severity IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT valid_resolution CHECK (resolution IN ('manual', 'automatic', 'renamed', 'merged', 'reverted'))
);

CREATE INDEX idx_conflicts_agent ON conflicts(agent_id);
CREATE INDEX idx_conflicts_type ON conflicts(conflict_type);
CREATE INDEX idx_conflicts_severity ON conflicts(conflict_severity);
CREATE INDEX idx_conflicts_resolved ON conflicts(resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX idx_conflicts_created ON conflicts(created_at);

-- ============================================
-- Section 8: Events Table (System Events)
-- ============================================

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, -- 'agent:created', 'agent:updated', 'agent:deployed', etc.
    event_category VARCHAR(50), -- 'lifecycle', 'status', 'permission', 'conflict', 'data'
    agent_id UUID REFERENCES agents(id),
    user_id UUID REFERENCES users(id),
    correlation_id VARCHAR(100),
    payload JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_category ON events(event_category);
CREATE INDEX idx_events_agent ON events(agent_id);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_correlation ON events(correlation_id);
CREATE INDEX idx_events_created ON events(created_at);
CREATE INDEX idx_events_payload ON events USING GIN (payload);
CREATE INDEX idx_events_metadata ON events USING GIN (metadata);

-- ============================================
-- Section 9: Event Subscriptions Table
-- ============================================

CREATE TABLE event_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    event_type VARCHAR(100) NOT NULL,
    subscriber_type VARCHAR(20) NOT NULL, -- 'callback', 'webhook', 'queue'
    subscriber_endpoint VARCHAR(255),
    callback_handler TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (agent_id, event_type, subscriber_type, subscriber_endpoint)
);

CREATE INDEX idx_subscriptions_agent ON event_subscriptions(agent_id);
CREATE INDEX idx_subscriptions_event ON event_subscriptions(event_type);
CREATE INDEX idx_subscriptions_active ON event_subscriptions(agent_id) WHERE is_active = true;
CREATE INDEX idx_subscriptions_endpoint ON event_subscriptions(subscriber_endpoint);

-- ============================================
-- Section 10: System Settings Table
-- ============================================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_settings_key ON system_settings(setting_key);
CREATE INDEX idx_settings_public ON system_settings(is_public);

-- ============================================
-- Section 11: Triggers
-- ============================================

-- Trigger for updating updated_at
CREATE TRIGGER set_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_agent_trigger
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================
-- Section 12: Sample Data
-- ============================================

-- Insert default admin user
INSERT INTO users (id, username, email, password_hash, full_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin',
    'admin@localhost',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Administrator',
    'admin'
);

-- Insert default permissions
INSERT INTO permissions (id, name, description, category) VALUES
    ('11111111-1111-1111-1111-111111111111', 'agent:read', 'Read agent configurations', 'agent'),
    ('22222222-2222-2222-2222-222222222222', 'agent:write', 'Write agent configurations', 'agent'),
    ('33333333-3333-3333-3333-333333333333', 'agent:delete', 'Delete agent configurations', 'agent'),
    ('44444444-4444-4444-4444-444444444444', 'agent:deploy', 'Deploy agent configurations', 'agent'),
    ('55555555-5555-5555-5555-555555555555', 'config:read', 'Read configurations', 'config'),
    ('66666666-6666-6666-6666-666666666666', 'config:write', 'Write configurations', 'config'),
    ('77777777-7777-7777-7777-777777777777', 'audit:read', 'Read audit logs', 'audit'),
    ('88888888-8888-8888-8888-888888888888', 'system:admin', 'System administration', 'system');

-- Grant default permissions to admin
INSERT INTO user_permissions (user_id, permission_id, granted_by)
VALUES
    ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000001');

-- ============================================
-- Section 13: Performance Optimization
-- ============================================

-- Enable query logging
ALTER SYSTEM SET pg_stat_statements.max = 10000;
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Vacuum and analyze tables
VACUUM ANALYZE users;
VACUUM ANALYZE permissions;
VACUUM ANALYZE agents;
VACUUM ANALYZE agent_versions;
VACUUM ANALYZE audit_logs;
VACUUM ANALYZE conflicts;
VACUUM ANALYZE events;
