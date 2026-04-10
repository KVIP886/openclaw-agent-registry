/**
 * Hermes-agent SQLite + FTS5 Storage Backend
 * Implements FTS5 full-text search with LLM summarization
 * 
 * @module HermesStorageBackend
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

class HermesStorageBackend {
  constructor(options = {}) {
    this.options = {
      storagePath: options.storagePath || '~/.openclaw/memory.db',
      llmProvider: options.llmProvider,
      trajectoryCompressor: options.trajectoryCompressor !== false
    };
    
    this.db = null;
    this.llm = null;
    this._initDatabase();
  }
  
  async _initDatabase() {
    const dbPath = path.expand(this.options.storagePath);
    
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!require('fs').existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    
    // Initialize SQLite connection
    this.db = new sqlite3(dbPath);
    
    // Create main memories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        summary TEXT,
        embedding BLOB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create FTS5 virtual table for full-text search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content,
        summary,
        content='memories',
        content_rowid='id',
        tokenize='porter'
      )
    `);
    
    // Create triggers to keep FTS5 in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts (id, content, summary)
        VALUES (new.id, new.content, new.summary);
      END
    `);
    
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts (memories_fts, id, content, summary)
        VALUES ('delete', old.id, old.content, old.summary);
      END
    `);
    
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts (memories_fts, id, content, summary)
        VALUES ('delete', old.id, old.content, old.summary);
        INSERT INTO memories_fts (memories_fts, id, content, summary)
        VALUES ('reinsert', new.id, new.content, new.summary);
      END
    `);
    
    // Create user model (Honcho) table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS honcho_models (
        user_id TEXT NOT NULL,
        model_type TEXT NOT NULL,
        params BLOB,
        confidence BLOB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, model_type)
      )
    `);
    
    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);
      CREATE INDEX IF NOT EXISTS idx_memories_updated ON memories(updated_at);
    `);
    
    console.log('✅ Hermes-agent database initialized');
  }
  
  async storeMemory(memoryId, content, metadata = {}) {
    const startTime = Date.now();
    
    // Generate summary using LLM (trajectory compressor)
    let summary = null;
    if (this.options.trajectoryCompressor) {
      summary = await this._generateSummary(content);
    } else {
      // Use content as summary if trajectory compressor disabled
      summary = content;
    }
    
    // Generate embedding
    let embedding = null;
    if (metadata.embedding) {
      embedding = metadata.embedding;
    } else if (this.llm) {
      embedding = await this._generateEmbedding(content);
    }
    
    // Insert into database
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories (id, content, summary, embedding, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = stmt.run(memoryId, content, summary, embedding);
    
    console.log(`📝 Stored memory ${memoryId} in ${Date.now() - startTime}ms`);
    
    return {
      success: true,
      id: memoryId,
      duration: Date.now() - startTime,
      summaryGenerated: summary !== null
    };
  }
  
  async queryWithFTS(query, options = {}) {
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    // FTS5 search
    const stmt = this.db.prepare(`
      SELECT 
        m.id,
        m.content,
        m.summary,
        m.created_at,
        m.updated_at,
        mems.rank
      FROM memories m
      JOIN memories_fts mems ON m.id = mems.id
      WHERE memories_fts MATCH ?
      ORDER BY mems.rank
      LIMIT ? OFFSET ?
    `);
    
    const results = stmt.all(query, limit, offset);
    
    return {
      success: true,
      query,
      results,
      count: results.length,
      total: this._getFTSTotal(query)
    };
  }
  
  async getMemory(memoryId) {
    const stmt = this.db.prepare(`
      SELECT * FROM memories WHERE id = ?
    `);
    
    const result = stmt.get(memoryId);
    
    if (!result) {
      return null;
    }
    
    return {
      id: result.id,
      content: result.content,
      summary: result.summary,
      created_at: result.created_at,
      updated_at: result.updated_at,
      embedding: this._deserializeEmbedding(result.embedding)
    };
  }
  
  async updateMemory(memoryId, content, metadata = {}) {
    const stmt = this.db.prepare(`
      UPDATE memories 
      SET content = ?, 
          summary = ?,
          embedding = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);
    
    const summary = metadata.summary || await this._generateSummary(content);
    const embedding = metadata.embedding || null;
    
    stmt.run(content, summary, embedding, memoryId);
    
    return {
      success: true,
      id: memoryId,
      updated: true
    };
  }
  
  async deleteMemory(memoryId) {
    const stmt = this.db.prepare(`
      DELETE FROM memories WHERE id = ?
    `);
    
    stmt.run(memoryId);
    
    return {
      success: true,
      id: memoryId,
      deleted: true
    };
  }
  
  async getUserModel(userId, modelType) {
    const stmt = this.db.prepare(`
      SELECT * FROM honcho_models
      WHERE user_id = ? AND model_type = ?
    `);
    
    const result = stmt.get(userId, modelType);
    
    if (!result) {
      return null;
    }
    
    return {
      user_id: result.user_id,
      model_type: result.model_type,
      params: this._deserializeBlob(result.params),
      confidence: this._deserializeBlob(result.confidence),
      updated_at: result.updated_at
    };
  }
  
  async storeUserModel(userId, modelType, params, confidence) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO honcho_models (user_id, model_type, params, confidence, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    
    stmt.run(userId, modelType, this._serializeBlob(params), this._serializeBlob(confidence));
    
    return {
      success: true,
      user_id: userId,
      model_type: modelType
    };
  }
  
  async searchWithEmbeddings(queryVector, options = {}) {
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.7;
    
    // Simple vector search (for production, use FAISS or similar)
    const stmt = this.db.prepare(`
      SELECT 
        m.id,
        m.content,
        m.summary,
        m.updated_at,
        1.0 - (
          SELECT AVG((e - ?) * (e - ?))
          FROM json_each(m.embedding) as e
        ) as similarity
      FROM memories m
      WHERE m.embedding IS NOT NULL
      ORDER BY similarity DESC
      LIMIT ?
    `);
    
    // Flatten query vector for JSON
    const queryFlat = JSON.stringify(queryVector);
    const results = stmt.all(queryFlat, queryFlat, limit);
    
    return {
      success: true,
      query,
      results,
      count: results.length
    };
  }
  
  async _generateSummary(content) {
    if (!this.llm) {
      // Fallback: extract first few sentences
      const sentences = content.split('\n').filter(s => s.trim().length > 0);
      return sentences.slice(0, 3).join('\n');
    }
    
    // Use LLM for summarization
    const prompt = `Summarize the following memory trajectory while preserving key facts:

${content}

Return a concise summary (max 200 words):`;
    
    const summary = await this.llm.generate(prompt, { maxTokens: 200 });
    return summary;
  }
  
  async _generateEmbedding(content) {
    if (!this.llm) {
      // Simple hash-based embedding for demo
      const hash = this._simpleHash(content);
      return hash.map(x => (x / 255.0) - 0.5); // Normalize to [-0.5, 0.5]
    }
    
    // Use LLM for embedding generation
    const embedding = await this.llm.embed(content);
    return embedding;
  }
  
  async _ftsSearch(query) {
    const stmt = this.db.prepare(`
      SELECT id, content, summary, rank
      FROM memories_fts
      WHERE memories_fts MATCH ?
    `);
    
    return stmt.all(query);
  }
  
  async _getFTSTotal(query) {
    const stmt = this.db.prepare(`
      SELECT count(*) as total
      FROM memories_fts
      WHERE memories_fts MATCH ?
    `);
    
    const result = stmt.get(query);
    return result ? result.total : 0;
  }
  
  _deserializeBlob(blob) {
    if (!blob) return null;
    try {
      return JSON.parse(blob.toString('utf8'));
    } catch (e) {
      return null;
    }
  }
  
  _serializeBlob(obj) {
    if (!obj) return null;
    return Buffer.from(JSON.stringify(obj), 'utf8');
  }
  
  _deserializeEmbedding(embeddingBlob) {
    if (!embeddingBlob) return null;
    try {
      return JSON.parse(embeddingBlob.toString('utf8'));
    } catch (e) {
      return null;
    }
  }
  
  _serializeEmbedding(embedding) {
    if (!embedding) return null;
    return Buffer.from(JSON.stringify(embedding), 'utf8');
  }
  
  _simpleHash(str) {
    // Simple hash function for demo
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    // Generate 128-dim vector
    const vector = [];
    for (let i = 0; i < 128; i++) {
      vector.push(hash % 255);
      hash = hash * 31 + i;
    }
    
    return vector;
  }
  
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    if (this.llm) {
      await this.llm.close();
      this.llm = null;
    }
    
    console.log('🔌 Hermes-agent database closed');
  }
  
  async optimize() {
    // VACUUM database
    this.db.exec('VACUUM');
    
    // Rebuild FTS5 index
    this.db.exec('INSERT INTO memories_fts (memories_fts) VALUES (rebuild)');
    
    console.log('✅ Database optimized');
  }
}

/**
 * Trajectory Compressor
 * Compresses conversation trajectories while preserving key facts
 */
class TrajectoryCompressor {
  constructor(llmProvider) {
    this.llm = llmProvider;
  }
  
  async compress(conversationTrajectory) {
    const prompt = `Compress the following conversation trajectory while preserving all key facts and decisions:

${conversationTrajectory}

Return the compressed version:`;
    
    const compressed = await this.llm.generate(prompt, { maxTokens: 1000 });
    
    return {
      success: true,
      originalLength: conversationTrajectory.length,
      compressedLength: compressed.length,
      compressionRatio: (conversationTrajectory.length / compressed.length).toFixed(2) + 'x',
      compressed
    };
  }
  
  async extractFacts(conversationTrajectory) {
    const prompt = `Extract all key facts, decisions, and learnings from this conversation trajectory. Return as a list:

${conversationTrajectory}

Key facts and decisions:`;
    
    const facts = await this.llm.generate(prompt, { maxTokens: 1000 });
    
    return facts.split('\n').filter(f => f.trim().startsWith('-')).map(f => f.trim().substring(2));
  }
}

module.exports = {
  HermesStorageBackend,
  TrajectoryCompressor
};
