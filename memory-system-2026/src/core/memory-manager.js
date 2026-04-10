/**
 * Agent Memory Manager - 2026 Standard Implementation
 * Implements: Markdown-first, Semantic Compression, Hybrid Retrieval
 * 
 * @module MemoryManager
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MemoryManager {
  /**
   * Initialize Memory Manager with configuration
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.config = {
      // Storage configuration
      storagePath: options.storagePath || '~/.openclaw/memory/',
      coreMemoryPath: options.coreMemoryPath || 'MEMORY.md',
      
      // Compression settings
      compressionThreshold: options.compressionThreshold || 70,
      criticalThreshold: options.criticalThreshold || 85,
      preserveAtomicFacts: options.preserveAtomicFacts !== false,
      
      // Retrieval settings
      vectorWeight: options.vectorWeight || 0.6,
      lexicalWeight: options.lexicalWeight || 0.25,
      graphWeight: options.graphWeight || 0.15,
      
      // Consolidation settings
      autoConsolidation: options.autoConsolidation !== false,
      consolidationInterval: options.consolidationInterval || 3600000, // 1 hour
      
      // Git settings
      gitEnabled: options.gitEnabled !== false,
      autoCommit: options.autoCommit !== false,
      
      // Version settings
      maxVersions: options.maxVersions || 10,
      confidenceBasedResolution: options.confidenceBasedResolution !== false
    };
    
    // Expand paths
    this.storagePath = path.expand(this.config.storagePath);
    
    // Initialize components
    this.coreMemory = null;
    this.vectorIndex = null;
    this.memoryGraph = null;
    
    // Metrics
    this.metrics = {
      totalStorages: 0,
      totalRetrievals: 0,
      compressionEvents: 0,
      consolidationEvents: 0
    };
    
    // Initialize all components
    this._initializeComponents();
    
    // Start consolidation scheduler
    if (this.config.autoConsolidation) {
      this._startConsolidationScheduler();
    }
    
    console.log('✅ Memory Manager initialized');
  }
  
  /**
   * Initialize all storage and indexing components
   * @private
   */
  async _initializeComponents() {
    // Initialize Git (if enabled)
    if (this.config.gitEnabled) {
      await this._initGitRepository();
    }
    
    // Initialize components
    this.vectorIndex = require('../index/vector-index');
    this.memoryGraph = require('../index/memory-graph');
  }
  
  /**
   * Initialize Git repository for version control
   * @private
   */
  async _initGitRepository() {
    try {
      const gitDir = path.join(this.storagePath, '.git');
      
      if (!fs.existsSync(gitDir)) {
        execSync('git init', { cwd: this.storagePath });
        execSync('git branch -M main', { cwd: this.storagePath });
        console.log('📦 Git repository initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Git:', error.message);
      this.config.gitEnabled = false;
    }
  }
  
  /**
   * Store core memory entry
   * @param {Object} entry - Core memory entry
   * @returns {Object} Storage result
   */
  async storeCoreMemory(entry) {
    const { topic, facts, learnings, confidence = 0.9 } = entry;
    
    // Create markdown content
    const content = this._formatCoreMemory(topic, facts, learnings);
    
    // Write to MEMORY.md
    await this._appendToFile(this.config.coreMemoryPath, content);
    
    // Index for retrieval
    await this.vectorIndex.add(content, {
      type: 'core',
      topic,
      confidence,
      timestamp: new Date().toISOString()
    });
    
    // Update memory graph
    await this.memoryGraph.addNode({
      id: `core-${topic}`,
      content,
      metadata: { type: 'core', topic, confidence }
    });
    
    // Auto-commit
    if (this.config.autoCommit) {
      await this._gitCommit(`memory: update core memory - ${topic}`);
    }
    
    // Update metrics
    this.metrics.totalStorages++;
    
    return {
      success: true,
      path: this.config.coreMemoryPath,
      version: 1,
      stored: true
    };
  }
  
  /**
   * Store daily memory entry
   * @param {Object} entry - Daily memory entry
   * @returns {Object} Storage result
   */
  async storeDailyMemory(entry) {
    const { date, events, metadata = {} } = entry;
    const filename = `${date}.md`;
    
    // Create markdown content
    const content = this._formatDailyEntry(date, events);
    
    // Write to episodic folder
    const filepath = await this._writeToFile('episodic', filename, content);
    
    // Index for retrieval
    await this.vectorIndex.add(content, {
      type: 'episodic',
      date,
      ...metadata,
      timestamp: new Date().toISOString()
    });
    
    // Update metrics
    this.metrics.totalStorages++;
    
    // Auto-commit
    if (this.config.autoCommit) {
      await this._gitCommit(`memory: add daily log - ${date}`);
    }
    
    return {
      success: true,
      path: filepath,
      version: 1,
      stored: true
    };
  }
  
  /**
   * Compress memories using semantic compression
   * @param {Object} options - Compression options
   * @returns {Object} Compression result
   */
  async compressMemories(options = {}) {
    const usage = await this.calculateUsage();
    
    if (usage.percentage < this.config.compressionThreshold) {
      return {
        status: 'safe',
        message: `✅ Memory usage OK (${usage.percentage.toFixed(1)}% full)`
      };
    }
    
    console.log('🧹 Starting semantic compression...');
    
    const startTime = Date.now();
    const atomicFacts = [];
    const files = await this._getAllFiles();
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const compressed = await this._compressContent(content, file);
      
      if (compressed.isCompressed) {
        fs.writeFileSync(file, compressed.content, 'utf8');
        atomicFacts.push(...compressed.preservedFacts);
      }
    }
    
    const finalSize = await this._calculateTotalSize();
    const savings = ((usage.totalSize - finalSize) / usage.totalSize * 100).toFixed(1);
    
    this.metrics.compressionEvents++;
    
    console.log(`✅ Compression complete! Saved ${savings}%`);
    
    // Auto-commit
    if (this.config.autoCommit) {
      await this._gitCommit(`memory: semantic compression - ${savings}% saved`);
    }
    
    return {
      success: true,
      originalSize: usage.totalSize,
      finalSize,
      savings: `${savings}%`,
      filesProcessed: files.length,
      preservedFacts: atomicFacts.length,
      duration: Date.now() - startTime
    };
  }
  
  /**
   * Retrieve memories using hybrid search
   * @param {string} query - Search query
   * @param {Object} options - Retrieval options
   * @returns {Array} Retrieved results
   */
  async retrieve(query, options = {}) {
    const startTime = Date.now();
    
    // Intent-aware planning
    const intent = await this._inferIntent(query);
    console.log(`🎯 Query intent: ${intent}`);
    
    // Execute multi-view retrieval
    const [vectorResults, lexicalResults, graphResults] = await Promise.all([
      this._vectorSearch(query, intent),
      this._lexicalSearch(query),
      this._graphTraversal(query, intent)
    ]);
    
    // Merge and score results
    const merged = this._mergeResults(vectorResults, lexicalResults, graphResults);
    
    // Deduplicate
    const unique = this._deduplicate(merged, options.limit || 10);
    
    this.metrics.totalRetrievals++;
    
    return {
      results: unique,
      query,
      intent,
      retrievalTime: Date.now() - startTime,
      count: unique.length
    };
  }
  
  /**
   * Consolidate memories periodically
   * @param {Object} options - Consolidation options
   * @returns {Object} Consolidation result
   */
  async consolidateMemories(options = {}) {
    console.log('🔄 Starting memory consolidation...');
    
    const startTime = Date.now();
    
    // Online synthesis
    const synthesized = await this._onlineSynthesis();
    
    // Skill creation
    const skills = await this._createSkills(synthesized);
    
    // Proactive density gating
    const optimized = await this._applyDensityGating(synthesized);
    
    this.metrics.consolidationEvents++;
    
    console.log(`✅ Consolidation complete! Created ${skills.length} skills`);
    
    // Auto-commit
    if (this.config.autoCommit) {
      await this._gitCommit(`memory: consolidation - ${skills.length} new skills`);
    }
    
    return {
      success: true,
      synthesizedFacts: synthesized.length,
      createdSkills: skills.length,
      duration: Date.now() - startTime
    };
  }
  
  /**
   * Resolve conflicts between new and existing facts
   * @param {Object} newFact - New fact
   * @param {Object} existingFact - Existing fact
   * @returns {Object} Resolution result
   */
  resolveConflict(newFact, existingFact) {
    const newConf = newFact.confidence || 0.5;
    const oldConf = existingFact.confidence || 0.5;
    const newTime = newFact.timestamp;
    const oldTime = existingFact.timestamp;
    
    // Version-based resolution with confidence weighting
    if (newConf > oldConf + 0.1) {
      return {
        action: 'replace',
        reason: 'New fact has higher confidence',
        winner: 'new',
        newVersion: existingFact.version + 1
      };
    } else if (newConf < oldConf - 0.1) {
      return {
        action: 'keep',
        reason: 'Existing fact has higher confidence',
        winner: 'existing',
        version: existingFact.version
      };
    } else {
      // Same confidence - prefer newer version
      if (newTime > oldTime) {
        return {
          action: 'replace',
          reason: 'Newer version with same confidence',
          winner: 'new',
          newVersion: existingFact.version + 1
        };
      } else {
        return {
          action: 'keep',
          reason: 'Older version with same confidence',
          winner: 'existing',
          version: existingFact.version
        };
      }
    }
  }
  
  /**
   * Calculate current memory usage
   * @returns {Object} Usage statistics
   */
  async calculateUsage() {
    const totalSize = await this._calculateTotalSize();
    const maxStorageSize = 1000000; // 1MB limit
    
    return {
      totalSize,
      maxStorageSize,
      percentage: (totalSize / maxStorageSize) * 100,
      totalFiles: await this._countAllFiles(),
      types: await this._countByType()
    };
  }
  
  // ================== Private Methods ==================
  
  /**
   * Format core memory entry
   * @private
   */
  _formatCoreMemory(topic, facts, learnings) {
    return `\n---\n\n## ${topic}

**What it is**: ${facts[0] || 'N/A'}

**Key facts**:
${facts.map(f => `- ${f}`).join('\n')}

**Learnings**:
${learnings.map(l => `- ${l}`).join('\n')}

**metadata**: {"topic": "${topic}", "confidence": 0.9, "source": "core", "version": 1, "created_at": "${new Date().toISOString()}"}
`;
  }
  
  /**
   * Format daily memory entry
   * @private
   */
  _formatDailyEntry(date, events) {
    return `# ${date}\n\n${events
      .map(e => `## ${e.title}\n${e.body}`)
      .join('\n')}\n\n---\n**metadata**: {"date": "${date}", "event_count": ${events.length}, "version": 1, "created_at": "${new Date().toISOString()}"}
`;
  }
  
  /**
   * Compress content preserving atomic facts
   * @private
   */
  async _compressContent(content, filepath) {
    // Extract atomic facts
    const atomicFacts = this._extractAtomicFacts(content);
    
    // Check compression ratio
    const shouldCompress = content.length > 500;
    
    if (!shouldCompress) {
      return { isCompressed: false, preservedFacts: atomicFacts };
    }
    
    // Compress
    const compressed = this._shortenContent(content, atomicFacts);
    
    return {
      isCompressed: true,
      content: compressed,
      preservedFacts: atomicFacts
    };
  }
  
  /**
   * Extract atomic facts from content
   * @private
   */
  _extractAtomicFacts(content) {
    const facts = [];
    
    // Extract key facts
    const factsMatches = content.match(/- (.+?)(?=\n-|$)/g);
    if (factsMatches) {
      facts.push(...factsMatches.map(f => f.replace('- ', '').trim()));
    }
    
    // Extract learnings
    const learningsMatches = content.match(/- (.+?)(?=\n-|$)/g);
    if (learningsMatches) {
      facts.push(...learningsMatches.map(l => l.replace('- ', '').trim()));
    }
    
    return facts;
  }
  
  /**
   * Shorten content while preserving facts
   * @private
   */
  _shortenContent(content, atomicFacts) {
    const redundantWords = ['very', 'really', 'extremely', 'quite', 'somewhat'];
    
    const lines = content.split('\n');
    const shortened = [];
    
    for (const line of lines) {
      const words = line.split(' ');
      const filtered = words.filter(w => 
        !redundantWords.includes(w.toLowerCase())
      );
      
      // Check if this is an atomic fact
      const isAtomic = atomicFacts.some(f => line.includes(f));
      
      shortened.push(filtered.join(' '));
    }
    
    return shortened.join('\n');
  }
  
  /**
   * Infer query intent
   * @private
   */
  async _inferIntent(query) {
    // For now, use keyword-based intent detection
    if (query.toLowerCase().includes('how') || query.includes('process')) {
      return 'procedural';
    } else if (query.toLowerCase().includes('what') || query.includes('facts')) {
      return 'semantic';
    } else if (query.match(/\d{4}-\d{2}-\d{2}/)) {
      return 'episodic';
    } else {
      return 'general';
    }
  }
  
  /**
   * Vector search
   * @private
   */
  async _vectorSearch(query, intent) {
    return await this.vectorIndex.search(query, {
      weight: this.config.vectorWeight,
      intent,
      limit: 50
    });
  }
  
  /**
   * Lexical search
   * @private
   */
  async _lexicalSearch(query) {
    // BM25-based keyword search
    const keywords = query.split(' ').filter(w => w.length > 2);
    
    const results = [];
    for (const file of await this._getAllFiles()) {
      const content = fs.readFileSync(file, 'utf8');
      const score = this._calculateBM25Score(content, keywords);
      
      if (score > 0) {
        results.push({
          path: file,
          score,
          type: 'lexical',
          keywords
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Graph traversal
   * @private
   */
  async _graphTraversal(query, intent) {
    const relatedNodes = await this.memoryGraph.findRelated(query, {
      maxDistance: 2,
      intent
    });
    
    return relatedNodes.map(node => ({
      path: node.path,
      score: node.link_score,
      type: 'graph',
      node_id: node.id
    }));
  }
  
  /**
   * Merge multi-view results
   * @private
   */
  _mergeResults(vector, lexical, graph) {
    const merged = new Map();
    
    // Add vector results
    for (const result of vector) {
      merged.set(result.path, { ...result, score: result.score * this.config.vectorWeight });
    }
    
    // Add lexical results
    for (const result of lexical) {
      const existing = merged.get(result.path);
      if (existing) {
        existing.score += result.score * this.config.lexicalWeight;
      } else {
        merged.set(result.path, { ...result, score: result.score * this.config.lexicalWeight });
      }
    }
    
    // Add graph results
    for (const result of graph) {
      const existing = merged.get(result.path);
      if (existing) {
        existing.score += result.score * this.config.graphWeight;
      } else {
        merged.set(result.path, { ...result, score: result.score * this.config.graphWeight });
      }
    }
    
    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }
  
  /**
   * Deduplicate results
   * @private
   */
  _deduplicate(results, limit) {
    const unique = [];
    const seen = new Set();
    
    for (const result of results) {
      const content = fs.readFileSync(result.path, 'utf8');
      const hash = this._sha256(content);
      
      if (!seen.has(hash)) {
        seen.add(hash);
        unique.push({ ...result, content });
      }
      
      if (unique.length >= limit) break;
    }
    
    return unique;
  }
  
  /**
   * Online synthesis
   * @private
   */
  async _onlineSynthesis() {
    const files = await this._getAllFiles();
    const synthesized = [];
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const facts = this._extractAtomicFacts(content);
      
      synthesized.push({
        source: file,
        facts,
        timestamp: new Date().toISOString()
      });
    }
    
    return synthesized;
  }
  
  /**
   * Create skills from synthesized facts
   * @private
   */
  async _createSkills(synthesized) {
    const skills = [];
    
    // Identify common patterns
    const factCounts = new Map();
    for (const item of synthesized) {
      for (const fact of item.facts) {
        const count = factCounts.get(fact) || 0;
        factCounts.set(fact, count + 1);
      }
    }
    
    // Extract high-frequency facts as skills
    for (const [fact, count] of factCounts.entries()) {
      if (count >= 3) {
        skills.push({
          name: fact,
          evidence: count,
          type: 'skill'
        });
      }
    }
    
    return skills;
  }
  
  /**
   * Apply density gating
   * @private
   */
  async _applyDensityGating(synthesized) {
    // Remove redundant facts
    const optimized = synthesized.map(item => ({
      ...item,
      facts: item.facts.filter((fact, idx, self) => 
        self.findIndex(f => f === fact) === idx
      )
    }));
    
    return optimized;
  }
  
  /**
   * Calculate BM25 score
   * @private
   */
  _calculateBM25Score(content, keywords) {
    const wordFreq = new Map();
    const words = content.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      const count = wordFreq.get(word) || 0;
      wordFreq.set(word, count + 1);
    }
    
    let score = 0;
    for (const keyword of keywords) {
      const freq = wordFreq.get(keyword) || 0;
      score += freq * Math.log(content.length / (freq + 1));
    }
    
    return score;
  }
  
  /**
   * Git commit
   * @private
   */
  async _gitCommit(message) {
    try {
      execSync('git add .', { cwd: this.storagePath });
      execSync(`git commit -m "${message}"`, { cwd: this.storagePath });
      execSync('git push origin main', { cwd: this.storagePath });
    } catch (error) {
      console.error('Git commit failed:', error.message);
    }
  }
  
  /**
   * Calculate total size
   * @private
   */
  async _calculateTotalSize() {
    let total = 0;
    const files = await this._getAllFiles();
    for (const file of files) {
      total += fs.statSync(file).size;
    }
    return total;
  }
  
  /**
   * Count all files
   * @private
   */
  async _countAllFiles() {
    const files = await this._getAllFiles();
    return files.length;
  }
  
  /**
   * Count files by type
   * @private
   */
  async _countByType() {
    const count = { episodic: 0, semantic: 0, procedural: 0 };
    
    for (const file of await this._getAllFiles()) {
      if (file.includes('episodic')) count.episodic++;
      else if (file.includes('semantic')) count.semantic++;
      else if (file.includes('procedural')) count.procedural++;
    }
    
    return count;
  }
  
  /**
   * Get all files
   * @private
   */
  async _getAllFiles() {
    const files = [];
    const dirs = ['episodic', 'semantic', 'procedural'];
    
    for (const dir of dirs) {
      const dirPath = path.join(this.storagePath, dir);
      if (fs.existsSync(dirPath)) {
        const list = fs.readdirSync(dirPath);
        files.push(...list
          .filter(f => f.endsWith('.md'))
          .map(f => path.join(dirPath, f)));
      }
    }
    
    return files;
  }
  
  /**
   * Append to file
   * @private
   */
  async _appendToFile(filename, content) {
    const filepath = path.join(this.storagePath, filename);
    fs.appendFileSync(filepath, content, 'utf8');
  }
  
  /**
   * Write to file
   * @private
   */
  async _writeToFile(folder, filename, content) {
    const folderPath = path.join(this.storagePath, folder);
    fs.mkdirSync(folderPath, { recursive: true });
    
    const filepath = path.join(folderPath, filename);
    fs.writeFileSync(filepath, content, 'utf8');
    
    return filepath;
  }
  
  /**
   * Start consolidation scheduler
   * @private
   */
  _startConsolidationScheduler() {
    setInterval(async () => {
      await this.consolidateMemories();
    }, this.config.consolidationInterval);
  }
  
  /**
   * SHA256 hash
   * @private
   */
  _sha256(str) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(str).digest('hex');
  }
}

module.exports = MemoryManager;
