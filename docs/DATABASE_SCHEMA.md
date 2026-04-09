# Agent Registry Database Schema

**Version**: 1.0.0  
**Date**: 2026-04-10  
**Status**: Migration Schema  
**Database**: PostgreSQL 15+

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Schema Design](#schema-design)
4. [Migration Strategy](#migration-strategy)
5. [Performance Optimization](#performance-optimization)
6. [Rollback Plan](#rollback-plan)

---

## Overview

This document defines the PostgreSQL database schema for the Agent Registry system. The schema supports:

- ✅ **Agent configuration storage** (JSON-based)
- ✅ **User management** (RBAC support)
- ✅ **Permission tracking**
- ✅ **Audit logging** (All operations logged)
- ✅ **Version control** (Configuration versioning)
- ✅ **Conflict tracking** (Conflict detection history)
- ✅ **Event logging** (System events)

**Key Features**:
- 🔄 **ACID compliance**: Full transaction support
- 🔐 **Row-level security**: Fine-grained access control
- 📊 **Optimized queries**: Indexes for performance
- 🗄️ **JSONB support**: Flexible configuration storage
- 📈 **Scalable**: Designed for high-volume operations

---

## Database Architecture

### **Core Tables**

```
┌─────────────────┐
│   agents        │ ← Agent configurations
├─────────────────┤
│   users         │ ← User accounts (RBAC)
├─────────────────┤
│   permissions   │ ← Permission assignments
├─────────────────┤
│   audit_logs    │ ← Operation audit trail
├─────────────────┤
│   agent_versions│ ← Version history
├─────────────────┤
│   conflicts     │ ← Conflict tracking
├─────────────────┤
│   events        │ ← System events
├─────────────────┤
│   event_subscriptions │ ← Event subscriptions
└─────────────────┘
```

### **Relationships**

```
users → permissions (1:N)
agents → agent_versions (1:N)
agents → audit_logs (1:N)
agents → conflicts (1:N)
agents → events (1:N)
events → event_subscriptions (1:N)
```

---

## Schema Design

### 1. Users Table (RBAC Support)

```sql
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
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('admin', 'operator', 'user'))
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
```

### 2. Permissions Table

```sql
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
    
    UNIQUE (user_id, permission_id),
    CONSTRAINT valid_category CHECK (category IN ('agent', 'config', 'audit', 'system'))
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX idx_user_permissions_expires ON user_permissions(expires_at);
```

### 3. Agents Table (Core Configuration)

```sql
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
    
    -- Derived fields
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_deployed_at TIMESTAMPTZ,
    deployed_by UUID REFERENCES users(id),
    
    -- Constraints
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
```

### 4. Agent Versions Table (Version Control)

```sql
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
```

### 5. Audit Logs Table (Complete History)

```sql
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
```

### 6. Conflicts Table (Conflict Resolution)

```sql
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
```

### 7. Events Table (System Events)

```sql
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
```

### 8. Event Subscriptions Table

```sql
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
```

### 9. System Settings Table

```sql
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
```

---

## Migration Strategy

### **Phase 1: Database Setup** (1 hour)
1. Create PostgreSQL database
2. Install required extensions (uuid-ossp, pg_stat_statements)
3. Create all tables
4. Set up indexes
5. Configure connection pooling

### **Phase 2: Data Migration** (2 hours)
1. Export current JSON configuration
2. Parse and transform data
3. Insert into PostgreSQL tables
4. Preserve all relationships
5. Validate migration

### **Phase 3: Application Updates** (2 hours)
1. Update database adapter
2. Implement connection pooling
3. Add transaction support
4. Update queries for performance
5. Add caching layer

### **Phase 4: Performance Optimization** (1 hour)
1. Analyze query performance
2. Optimize indexes
3. Configure query hints
4. Set up connection limits
5. Monitor performance metrics

### **Phase 5: Testing & Rollback** (1 hour)
1. Run integration tests
2. Test rollback procedure
3. Verify data integrity
4. Document rollback steps
5. Monitor production

---

## Performance Optimization

### **Index Strategy**

| Table | Index Type | Purpose |
|------|------|------|
| agents | B-tree on name, status, owner | Fast lookups |
| agents | GIN on metadata | JSON filtering |
| agents | GIN on configuration | Full config search |
| agents | GIN full-text | Search by name/desc |
| agent_versions | B-tree on agent_id, version | Version queries |
| agent_versions | GIN on configuration_hash | Hash lookups |
| audit_logs | B-tree on created_at | Time-based queries |
| audit_logs | GIN on metadata | Audit filtering |
| events | GIN on payload | Event filtering |
| events | GIN on metadata | Event metadata |
| events | B-tree on created_at | Time range queries |

### **Query Optimization**

```sql
-- Example: Efficient agent query
SELECT a.*
FROM agents a
WHERE a.name = 'Agent-001'
AND a.status = 'active';

-- With index: Uses idx_agents_name + idx_agents_status

-- Example: Full-text search
SELECT *
FROM agents
WHERE to_tsvector('english', name || ' ' || COALESCE(description, ''))
      @@ to_tsquery('english', 'configuration & agent');

-- With index: Uses idx_agents_search
```

### **Connection Pooling**

```javascript
// Example: pg-pool configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Rollback Plan

### **Emergency Rollback**

1. **Keep old data intact**:
   ```bash
   # Backup current JSON files
   cp -r memory/agent-configs memory/agent-configs.backup-$(date +%Y%m%d)
   ```

2. **Disable new code**:
   ```bash
   # Restart with old configuration
   node server.js --use-json-storage
   ```

3. **Data restoration**:
   ```sql
   -- If PostgreSQL needs to be reverted:
   DROP DATABASE IF EXISTS agent_registry_production;
   CREATE DATABASE agent_registry_production;
   -- Restore from backup
   ```

4. **Verification**:
   - Confirm JSON files are accessible
   - Verify old configuration loads
   - Check all agents are accessible
   - Test basic operations

### **Rollback Triggers**

| Trigger | Action |
|------|------|
| >5% query failures | Roll back to JSON storage |
| Data integrity issues | Restore from backup |
| Performance degradation | Reduce pool size, rollback |
| Connection exhaustion | Increase timeout, rollback |
| Migration errors | Abort migration, use old system |

---

## Version Control

| Version | Date | Changes | Status |
|------|------|------|--------|
| 1.0.0 | 2026-04-10 | Initial schema | ✅ Active |
| 1.0.1 | TBD | Bug fixes | ⏸️ Pending |
| 1.0.2 | TBD | Performance improvements | ⏸️ Pending |

---

## Appendix

### A. Migration Script Template

```sql
-- Migration: agents
INSERT INTO agents (id, name, description, configuration, status, owner_id)
SELECT 
    id,
    name,
    description,
    jsonb_set('{}', '{configuration}', configuration, true) as configuration,
    'active' as status,
    owner_id
FROM json_agents_temp;

-- Migration: agent_versions
INSERT INTO agent_versions (agent_id, version, configuration, configuration_hash)
SELECT 
    agent_id,
    version,
    jsonb_set('{}', '{version}', configuration, true) as configuration,
    md5(configuration::text) as configuration_hash
FROM json_agent_versions_temp;

-- Continue for all tables...
```

### B. Backup Strategy

```bash
# Daily backup
pg_dump -h localhost -U postgres agent_registry_production > backup_$(date +%Y%m%d).sql

# Weekly full backup
pg_dumpall -h localhost -U postgres > full_backup_$(date +%Y%m%d).sql

# Point-in-time recovery
pg_basebackup -h localhost -U postgres -D /backup/base
```

### C. Monitoring Queries

```sql
-- Check table sizes
SELECT 
    schemaname,
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;

-- Check index usage
SELECT 
    schemaname,
    relname AS table_name,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY relname;
```

---

**Status**: Ready for Implementation  
**Next Step**: Create migration scripts  
**Estimated Time**: 1 hour for setup, 2 hours for migration
