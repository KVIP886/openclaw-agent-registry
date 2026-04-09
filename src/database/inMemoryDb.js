/**
 * Database Module - In-Memory Database
 * Created: 2026-04-09
 */

const fs = require('fs');
const path = require('path');

// 初始化数据存储
const db = {
  agents: [],
  permissions: [],
  deployments: [],
  configs: [],
  events: [],
  auditLogs: [],
  
  // 自增 ID
  nextIds: {
    permissions: 1,
    deployments: 1,
    configs: 1,
    events: 1,
    auditLogs: 1
  }
};

// 确保数据目录存在
// dataDir 指向项目根目录下的 data 文件夹
// __dirname = .../src/database, 向上两级到达项目根目录
const projectRoot = path.join(__dirname, '..', '..');
const dataDir = path.join(projectRoot, 'data');
console.log(`[DB] Project root: ${projectRoot}`);
console.log(`[DB] Database directory: ${dataDir}`);
console.log(`[DB] __dirname: ${__dirname}`);
console.log(`[DB] Current working directory: ${process.cwd()}`);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`[DB] ✅ Created data directory: ${dataDir}`);
} else {
  console.log(`[DB] ✅ Data directory exists: ${dataDir}`);
}

// 加载持久化数据
function loadPersistedData() {
  try {
    const files = ['agents', 'permissions', 'deployments', 'configs', 'events', 'auditLogs'];
    files.forEach(file => {
      const filePath = path.join(dataDir, `${file}.json`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        db[file] = data;
        
        // 更新 nextId
        if (file !== 'agents' && data.length > 0) {
          db.nextIds[file] = Math.max(...data.map(item => item.id || 0)) + 1;
        }
      }
    });
    console.log(`✅ Loaded ${files.length} tables from disk`);
  } catch (error) {
    console.error('⚠️ Failed to load data:', error.message);
  }
}

// 持久化数据
function persistData() {
  try {
    console.log(`[PERSIST] Saving data to ${dataDir}`);
    const filesWritten = [];
    Object.keys(db).forEach(key => {
      if (Array.isArray(db[key])) {
        const filePath = path.join(dataDir, `${key}.json`);
        const data = JSON.stringify(db[key], null, 2);
        fs.writeFileSync(filePath, data, 'utf8');
        filesWritten.push(`${key}.json (${db[key].length} records)`);
      }
    });
    console.log(`[PERSIST] ✅ Saved: ${filesWritten.join(', ')}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to persist data: ${error.message}`);
    return false;
  }
}

// Agents CRUD
function agentsCRUD() {
  return {
    getAll: (filters = {}) => {
      let result = [...db.agents];
      
      if (filters.status) {
        result = result.filter(a => a.status === filters.status);
      }
      
      if (filters.domain) {
        result = result.filter(a => a.domain === filters.domain);
      }
      
      if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(a => 
          a.name.toLowerCase().includes(search) ||
          (a.description && a.description.toLowerCase().includes(search))
        );
      }
      
      return result;
    },
    
    getById: (id) => {
      return db.agents.find(a => a.id === id);
    },
    
    create: (data) => {
      const agent = {
        id: data.id,
        name: data.name,
        version: data.version,
        domain: data.domain,
        description: data.description || null,
        author: data.author,
        status: data.status || 'testing',
        metadata: data.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // 检查 ID 是否已存在
      if (db.agents.some(a => a.id === agent.id)) {
        return { error: 'Agent ID already exists', agent: null };
      }
      
      db.agents.push(agent);
      persistData();
      return { error: null, agent };
    },
    
    update: (id, data) => {
      const index = db.agents.findIndex(a => a.id === id);
      if (index === -1) {
        return { error: 'Agent not found', agent: null };
      }
      
      db.agents[index] = {
        ...db.agents[index],
        ...data,
        updated_at: new Date().toISOString()
      };
      
      persistData();
      return { error: null, agent: db.agents[index] };
    },
    
    delete: (id) => {
      const index = db.agents.findIndex(a => a.id === id);
      if (index === -1) {
        return { error: 'Agent not found' };
      }
      
      const deleted = db.agents.splice(index, 1)[0];
      persistData();
      return { error: null, deleted };
    }
  };
}

// Permissions CRUD
function permissionsCRUD() {
  return {
    getAll: (agentId) => {
      return db.permissions.filter(p => p.agent_id === agentId);
    },
    
    create: (data) => {
      const permission = {
        id: db.nextIds.permissions++,
        agent_id: data.agent_id,
        permission_type: data.permission_type,
        resource_type: data.resource_type,
        scope: data.scope,
        branches: data.branches || [],
        exclusions: data.exclusions || [],
        constraints: data.constraints || {},
        created_at: new Date().toISOString()
      };
      
      db.permissions.push(permission);
      persistData();
      return { error: null, permission };
    },
    
    update: (id, data) => {
      const index = db.permissions.findIndex(p => p.id === id);
      if (index === -1) {
        return { error: 'Permission not found' };
      }
      
      db.permissions[index] = {
        ...db.permissions[index],
        ...data
      };
      
      persistData();
      return { error: null, permission: db.permissions[index] };
    },
    
    delete: (id) => {
      const index = db.permissions.findIndex(p => p.id === id);
      if (index === -1) {
        return { error: 'Permission not found' };
      }
      
      db.permissions.splice(index, 1);
      persistData();
      return { error: null };
    },
    
    deleteAllByAgent: (agentId) => {
      db.permissions = db.permissions.filter(p => p.agent_id !== agentId);
      persistData();
      return { error: null };
    }
  };
}

// Deployments CRUD
function deploymentsCRUD() {
  return {
    getAll: (agentId) => {
      return db.deployments.filter(d => d.agent_id === agentId);
    },
    
    create: (data) => {
      const deployment = {
        id: db.nextIds.deployments++,
        agent_id: data.agent_id,
        deployment_type: data.deployment_type || 'staging',
        environment: data.environment,
        endpoint: data.endpoint,
        status: data.status || 'pending',
        started_at: data.started_at || new Date().toISOString(),
        stopped_at: null,
        last_heartbeat: null,
        health_status: null,
        resource_usage: {},
        created_at: new Date().toISOString()
      };
      
      db.deployments.push(deployment);
      persistData();
      return { error: null, deployment };
    },
    
    update: (id, data) => {
      const index = db.deployments.findIndex(d => d.id === id);
      if (index === -1) {
        return { error: 'Deployment not found' };
      }
      
      db.deployments[index] = {
        ...db.deployments[index],
        ...data
      };
      
      persistData();
      return { error: null, deployment: db.deployments[index] };
    },
    
    delete: (id) => {
      const index = db.deployments.findIndex(d => d.id === id);
      if (index === -1) {
        return { error: 'Deployment not found' };
      }
      
      db.deployments.splice(index, 1);
      persistData();
      return { error: null };
    }
  };
}

// Events CRUD
function eventsCRUD() {
  return {
    getAll: (agentId, filters = {}) => {
      let result = db.events.filter(e => e.agent_id === agentId);
      
      if (filters.event_type) {
        result = result.filter(e => e.event_type === filters.event_type);
      }
      
      if (filters.repository) {
        result = result.filter(e => e.repository === filters.repository);
      }
      
      return result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    
    create: (data) => {
      const event = {
        id: db.nextIds.events++,
        agent_id: data.agent_id,
        event_type: data.event_type,
        timestamp: new Date().toISOString(),
        repository: data.repository,
        branch: data.branch,
        target: data.target || null,
        action: data.action,
        result: data.result || 'pending',
        reason: data.reason || null,
        duration_ms: data.duration_ms || null,
        actor: data.actor || null,
        metadata: data.metadata || {}
      };
      
      db.events.push(event);
      persistData();
      return { error: null, event };
    }
  };
}

// Audit Logs CRUD
function auditLogsCRUD() {
  return {
    getAll: (filters = {}) => {
      let result = [...db.auditLogs];
      
      if (filters.user_id) {
        result = result.filter(l => l.audit_user === filters.user_id);
      }
      
      if (filters.action) {
        result = result.filter(l => l.audit_action === filters.action);
      }
      
      if (filters.start_date) {
        result = result.filter(l => new Date(l.audit_timestamp) >= new Date(filters.start_date));
      }
      
      if (filters.end_date) {
        result = result.filter(l => new Date(l.audit_timestamp) <= new Date(filters.end_date));
      }
      
      return result.sort((a, b) => new Date(b.audit_timestamp) - new Date(a.audit_timestamp));
    },
    
    create: (data) => {
      const log = {
        id: db.nextIds.auditLogs++,
        event_id: data.event_id,
        audit_action: data.audit_action,
        audit_user: data.audit_user,
        audit_timestamp: new Date().toISOString(),
        audit_changes: data.audit_changes || null,
        audit_reason: data.audit_reason || null,
        ip_address: data.ip_address || null,
        user_agent: data.user_agent || null
      };
      
      db.auditLogs.push(log);
      persistData();
      return { error: null, log };
    }
  };
}

// 导出所有 CRUD
module.exports = {
  db,
  loadPersistedData,
  persistData,
  agents: agentsCRUD(),
  permissions: permissionsCRUD(),
  deployments: deploymentsCRUD(),
  events: eventsCRUD(),
  auditLogs: auditLogsCRUD()
};
