/**
 * Database Migration Script
 * Created: 2026-04-10 (Week 5 Day 3)
 * Function: Migrate JSON storage to PostgreSQL
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DatabaseMigration {
  constructor(config) {
    this.pool = new Pool({
      host: config.host || 'localhost',
      port: parseInt(config.port || '5432'),
      database: config.database || 'agent_registry',
      user: config.user || 'postgres',
      password: config.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.stats = {
      agents: 0,
      versions: 0,
      permissions: 0,
      auditLogs: 0,
      conflicts: 0,
      events: 0,
      total: 0
    };
  }

  /**
   * Create database schema
   */
  async createSchema() {
    console.log('📦 Creating database schema...');
    
    const schema = fs.readFileSync(
      path.join(__dirname, '../docs/database-schema.sql'),
      'utf8'
    );

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute schema in sections
      const sections = schema.split(';').filter(s => s.trim().length > 0);
      
      for (const section of sections) {
        if (section.trim().startsWith('CREATE') || 
            section.trim().startsWith('ALTER') ||
            section.trim().startsWith('COMMENT')) {
          await client.query(section);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ Schema created successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Export JSON data to temporary format
   */
  async exportToJsonFiles(outputDir) {
    console.log('📤 Exporting JSON data...');
    
    const agentsDir = path.join(outputDir, 'agents');
    const versionsDir = path.join(outputDir, 'agent_versions');
    
    if (!fs.existsSync(agentsDir)) {
      fs.mkdirSync(agentsDir, { recursive: true });
    }
    if (!fs.existsSync(versionsDir)) {
      fs.mkdirSync(versionsDir, { recursive: true });
    }

    const client = await this.pool.connect();
    try {
      // Export agents
      const agentsResult = await client.query('SELECT * FROM agents');
      const agentsJson = [];
      
      for (const agent of agentsResult.rows) {
        agentsJson.push({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          configuration: agent.configuration,
          status: agent.status,
          version: agent.version,
          owner_id: agent.owner_id,
          created_at: agent.created_at,
          updated_at: agent.updated_at
        });
      }
      
      fs.writeFileSync(
        path.join(outputDir, 'agents.json'),
        JSON.stringify(agentsJson, null, 2)
      );
      this.stats.agents = agentsJson.length;

      // Export agent versions
      const versionsResult = await client.query('SELECT * FROM agent_versions');
      const versionsJson = [];
      
      for (const version of versionsResult.rows) {
        versionsJson.push({
          id: version.id,
          agent_id: version.agent_id,
          version: version.version,
          configuration: version.configuration,
          configuration_hash: version.configuration_hash,
          description: version.description,
          author_id: version.author_id,
          is_current: version.is_current,
          created_at: version.created_at
        });
      }
      
      fs.writeFileSync(
        path.join(outputDir, 'agent_versions.json'),
        JSON.stringify(versionsJson, null, 2)
      );
      this.stats.versions = versionsJson.length;

      // Export audit logs
      const auditResult = await client.query('SELECT * FROM audit_logs');
      fs.writeFileSync(
        path.join(outputDir, 'audit_logs.json'),
        JSON.stringify(auditResult.rows, null, 2)
      );
      this.stats.auditLogs = auditResult.rows.length;

      // Export conflicts
      const conflictsResult = await client.query('SELECT * FROM conflicts');
      fs.writeFileSync(
        path.join(outputDir, 'conflicts.json'),
        JSON.stringify(conflictsResult.rows, null, 2)
      );
      this.stats.conflicts = conflictsResult.rows.length;

      // Export events
      const eventsResult = await client.query('SELECT * FROM events');
      fs.writeFileSync(
        path.join(outputDir, 'events.json'),
        JSON.stringify(eventsResult.rows, null, 2)
      );
      this.stats.events = eventsResult.rows.length;

      console.log('✅ Data exported successfully');
      
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate configuration hash
   */
  calculateHash(config) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(config))
      .digest('hex');
  }

  /**
   * Migrate JSON agents to PostgreSQL
   */
  async migrateAgents(jsonFilePath) {
    console.log('🔄 Migrating agents...');
    
    const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const agent of data) {
        const hash = this.calculateHash(agent.configuration);
        
        await client.query(`
          INSERT INTO agents (
            id, name, description, configuration, status, 
            version, owner_id, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            configuration = EXCLUDED.configuration,
            version = EXCLUDED.version,
            updated_at = CURRENT_TIMESTAMP
        `, [
          agent.id,
          agent.name,
          agent.description,
          agent.configuration,
          agent.status,
          agent.version,
          agent.owner_id,
          agent.metadata || '{}',
          agent.created_at,
          agent.updated_at
        ]);
      }
      
      await client.query('COMMIT');
      console.log(`✅ Migrated ${data.length} agents`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Migrate agent versions
   */
  async migrateAgentVersions(jsonFilePath) {
    console.log('🔄 Migrating agent versions...');
    
    const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const version of data) {
        await client.query(`
          INSERT INTO agent_versions (
            id, agent_id, version, configuration, 
            configuration_hash, description, author_id,
            is_current, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (agent_id, version) DO UPDATE SET
            configuration = EXCLUDED.configuration,
            configuration_hash = EXCLUDED.configuration_hash,
            is_current = EXCLUDED.is_current
        `, [
          version.id,
          version.agent_id,
          version.version,
          version.configuration,
          version.configuration_hash || this.calculateHash(version.configuration),
          version.description,
          version.author_id,
          version.is_current,
          version.created_at
        ]);
      }
      
      await client.query('COMMIT');
      console.log(`✅ Migrated ${data.length} versions`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate migration
   */
  async validateMigration() {
    console.log('🔍 Validating migration...');
    
    const client = await this.pool.connect();
    try {
      // Count records
      const agentCount = (await client.query('SELECT COUNT(*) FROM agents')).rows[0].count;
      const versionCount = (await client.query('SELECT COUNT(*) FROM agent_versions')).rows[0].count;
      const logCount = (await client.query('SELECT COUNT(*) FROM audit_logs')).rows[0].count;
      
      console.log(`✅ Agent count: ${agentCount}`);
      console.log(`✅ Version count: ${versionCount}`);
      console.log(`✅ Audit log count: ${logCount}`);
      
      // Check for orphaned records
      const orphanedVersions = await client.query(`
        SELECT COUNT(*) 
        FROM agent_versions v 
        LEFT JOIN agents a ON v.agent_id = a.id 
        WHERE a.id IS NULL
      `);
      
      if (orphanedVersions.rows[0].count > 0) {
        console.warn(`⚠️ Found ${orphanedVersions.rows[0].count} orphaned versions`);
      }
      
      // Check integrity
      const integrityCheck = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT agent_id) as unique_agents,
          SUM(version) as total_versions
        FROM agent_versions
      `);
      
      console.log(`✅ Integrity check: ${integrityCheck.rows[0].total} versions for ${integrityCheck.rows[0].unique_agents} agents`);
      
    } finally {
      client.release();
    }
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfiguration(agentId, newConfig, authorId) {
    console.log('🔄 Updating agent configuration...');
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get current version
      const current = await client.query(`
        SELECT version FROM agents WHERE id = $1
      `, [agentId]);
      
      if (current.rows.length === 0) {
        throw new Error(`Agent ${agentId} not found`);
      }
      
      const currentVersion = current.rows[0].version;
      const newVersion = currentVersion + 1;
      
      // Calculate hash
      const hash = this.calculateHash(newConfig);
      
      // Update agent
      await client.query(`
        UPDATE agents 
        SET configuration = $1, 
            version = $2, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $3
      `, [JSON.stringify(newConfig), newVersion, agentId]);
      
      // Insert version record
      await client.query(`
        INSERT INTO agent_versions (
          agent_id, version, configuration, configuration_hash,
          author_id, is_current
        ) VALUES ($1, $2, $3, $4, $5, false)
      `, [agentId, newVersion, JSON.stringify(newConfig), hash, authorId]);
      
      // Update current version flag
      await client.query(`
        UPDATE agent_versions SET is_current = false WHERE agent_id = $1
      `, [agentId]);
      
      await client.query('COMMIT');
      console.log(`✅ Updated agent ${agentId} to version ${newVersion}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get migration statistics
   */
  getStats() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Close pool connection
   */
  async close() {
    await this.pool.end();
  }
}

// Export
module.exports = DatabaseMigration;
