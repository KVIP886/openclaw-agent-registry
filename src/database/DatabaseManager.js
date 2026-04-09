/**
 * Database Connection Manager
 * Created: 2026-04-10 (Week 5 Day 3)
 * Function: PostgreSQL connection management and utilities
 */

const { Pool, Client } = require('pg');

class DatabaseManager {
  constructor(config) {
    this.config = {
      host: config.host || process.env.DB_HOST || 'localhost',
      port: parseInt(config.port || process.env.DB_PORT || '5432'),
      database: config.database || process.env.DB_NAME,
      user: config.user || process.env.DB_USER,
      password: config.password || process.env.DB_PASSWORD,
      max: parseInt(config.max || process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: parseInt(config.idleTimeoutMillis || process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(config.connectionTimeoutMillis || process.env.DB_CONNECT_TIMEOUT || '2000'),
    };

    this.pool = new Pool(this.config);
    this.stats = {
      totalQueries: 0,
      totalConnections: 0,
      failedQueries: 0,
      avgQueryTime: 0,
      queryTimes: []
    };

    // Connection event listeners
    this.pool.on('connect', (client) => {
      this.stats.totalConnections++;
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      this.stats.failedQueries++;
    });
  }

  /**
   * Get a client from the pool
   */
  async getClient() {
    const start = Date.now();
    const client = await this.pool.connect();
    
    // Wrap query method to track performance
    const originalQuery = client.query.bind(client);
    client.query = async (...args) => {
      const queryStart = Date.now();
      try {
        const result = await originalQuery(...args);
        const queryTime = Date.now() - queryStart;
        this._recordQueryTime(queryTime);
        return result;
      } catch (error) {
        this.stats.failedQueries++;
        throw error;
      }
    };

    return client;
  }

  /**
   * Execute a query with timeout
   */
  async query(sql, params = [], timeout = 30000) {
    const client = await this.getClient();
    const start = Date.now();
    
    try {
      const result = await client.query(sql, params);
      return result;
    } catch (error) {
      if (error.message.includes('timeout')) {
        throw new Error(`Query timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute transaction
   */
  async transaction(callback) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Insert a record
   */
  async insert(table, data, returnColumns = ['id']) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`);
    
    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING ${returnColumns.join(', ')}
    `;
    
    const result = await this.query(sql, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   */
  async update(table, id, data, whereColumn = 'id') {
    const columns = Object.keys(data);
    const values = [...Object.values(data), id];
    const placeholders = columns.map((_, i) => `$${i + 1} = $${i + 2}`);
    
    const sql = `
      UPDATE ${table}
      SET ${placeholders.join(', ')}
      WHERE ${whereColumn} = $${columns.length + 1}
      RETURNING *
    `;
    
    const result = await this.query(sql, values);
    return result.rows[0];
  }

  /**
   * Delete a record by ID
   */
  async delete(table, id, whereColumn = 'id') {
    const sql = `DELETE FROM ${table} WHERE ${whereColumn} = $1 RETURNING *`;
    const result = await this.query(sql, [id]);
    return result.rows[0];
  }

  /**
   * Find records by conditions
   */
  async find(table, conditions = {}, options = {}) {
    const { where, orderBy, limit, offset, columns = '*' } = options;
    
    let sql = `SELECT ${columns} FROM ${table}`;
    const params = [];
    
    if (where) {
      sql += ' WHERE ' + where;
    }
    
    if (orderBy) {
      sql += ' ORDER BY ' + orderBy;
    }
    
    if (limit) {
      sql += ' LIMIT $' + (params.length + 1);
      params.push(limit);
    }
    
    if (offset) {
      sql += ' OFFSET $' + (params.length + 1);
      params.push(offset);
    }
    
    if (Object.keys(conditions).length > 0) {
      const whereConditions = [];
      for (const [key, value] of Object.entries(conditions)) {
        whereConditions.push(`${key} = $${params.length + 1}`);
        params.push(value);
      }
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    const result = await this.query(sql, params);
    return result.rows;
  }

  /**
   * Count records
   */
  async count(table, where = '') {
    const sql = `SELECT COUNT(*) as count FROM ${table} ${where}`;
    const result = await this.query(sql);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get statistics
   */
  getStats() {
    const avgTime = this.stats.queryTimes.length > 0
      ? this.stats.queryTimes.reduce((a, b) => a + b, 0) / this.stats.queryTimes.length
      : 0;
    
    return {
      ...this.stats,
      avgQueryTime: avgTime.toFixed(2) + 'ms',
      totalQueries: this.stats.totalQueries,
      totalConnections: this.pool.totalCount,
      activeConnections: this.pool.activeCount,
      idleConnections: this.pool.idleCount,
      failedQueries: this.stats.failedQueries
    };
  }

  /**
   * Record query time
   */
  _recordQueryTime(queryTime) {
    this.stats.totalQueries++;
    this.stats.queryTimes.push(queryTime);
    
    // Keep only last 1000 queries for average calculation
    if (this.stats.queryTimes.length > 1000) {
      this.stats.queryTimes.shift();
    }
  }

  /**
   * Check database health
   */
  async health() {
    try {
      const client = await this.getClient();
      await client.query('SELECT 1');
      client.release();
      return { healthy: true, timestamp: new Date().toISOString() };
    } catch (error) {
      return { healthy: false, error: error.message, timestamp: new Date().toISOString() };
    }
  }

  /**
   * Close pool
   */
  async close() {
    await this.pool.end();
  }
}

// Export
module.exports = DatabaseManager;
