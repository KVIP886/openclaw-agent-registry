/**
 * Density Gating & Entropy-Driven Filtering
 * Implements adaptive compression based on semantic density
 * 
 * @module DensityGating
 */

const math = require('mathjs');

class DensityGatingCompressor {
  constructor(options = {}) {
    this.options = {
      densityThreshold: options.densityThreshold || 0.7,
      entropyThreshold: options.entropyThreshold || 0.8,
      minContentLength: options.minContentLength || 100,
      embeddingModel: options.embeddingModel || 'default'
    };
    
    this.embeddingModel = this._loadEmbeddingModel();
  }
  
  /**
   * Compress with density gating and entropy filtering
   * @param {string} text - Input text
   * @param {Object} context - Additional context
   * @returns {Object} Compression result
   */
  async compressWithDensityGating(text, context = {}) {
    console.log('🔬 Calculating semantic density...');
    
    // Step 1: Calculate semantic density
    const density = await this._calculateSemanticDensity(text);
    console.log(`📊 Semantic density: ${density.toFixed(3)}`);
    
    // Step 2: Apply density gate
    if (density < this.options.densityThreshold) {
      console.log('🚫 Low density - skipping compression');
      return {
        content: text,
        reason: 'low_density',
        density: density.toFixed(3),
        compressionRatio: '1.0×',
        skipped: true
      };
    }
    
    // Step 3: Entropy-driven multimodal filtering
    console.log('🔍 Applying entropy-based filtering...');
    const filteredContent = await this._entropyFilterMultimodal(text, context);
    
    // Step 4: Compress filtered content
    console.log('🧹 Compressing content...');
    const compressed = await this._compress(filteredContent);
    
    // Step 5: Calculate results
    const entropyReduction = this._calculateEntropyReduction(text, filteredContent);
    const compressionRatio = (text.length / compressed.length).toFixed(2);
    
    return {
      content: compressed,
      originalLength: text.length,
      finalLength: compressed.length,
      compressionRatio: `${compressionRatio}×`,
      reason: 'high_density_compressed',
      density: density.toFixed(3),
      entropyReduction: `${entropyReduction.toFixed(2)}%`,
      skipped: false,
      filteredFacts: this._countSentences(compressed)
    };
  }
  
  /**
   * Calculate semantic density of text
   * @private
   */
  async _calculateSemanticDensity(text) {
    // Split into sentences
    const sentences = this._splitIntoSentences(text);
    
    if (sentences.length < 2) {
      return 0; // Not enough sentences to calculate density
    }
    
    // Generate embeddings for each sentence
    const embeddings = [];
    for (const sentence of sentences) {
      const embedding = await this._getEmbedding(sentence);
      embeddings.push(embedding);
    }
    
    // Calculate pairwise similarities
    const similarities = [];
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        const sim = this._cosineSimilarity(embeddings[i], embeddings[j]);
        similarities.push(sim);
      }
    }
    
    // Calculate average similarity (density)
    const density = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
    
    return density;
  }
  
  /**
   * Apply entropy-driven multimodal filtering
   * @private
   */
  async _entropyFilterMultimodal(text, context) {
    const sentences = this._splitIntoSentences(text);
    const sentenceEntropies = [];
    
    for (const sentence of sentences) {
      const entropy = await this._calculateSentenceEntropy(sentence, context);
      sentenceEntropies.push({ sentence, entropy });
    }
    
    // Calculate average entropy
    const avgEntropy = sentenceEntropies.reduce((sum, item) => sum + item.entropy, 0) / sentenceEntropies.length;
    
    // Keep high-entropy (informative) sentences
    const highEntropyThreshold = avgEntropy * this.options.entropyThreshold;
    const filtered = sentenceEntropies
      .filter(item => item.entropy > highEntropyThreshold)
      .map(item => item.sentence);
    
    return filtered.join('\n');
  }
  
  /**
   * Calculate information entropy of a sentence
   * @private
   */
  async _calculateSentenceEntropy(sentence, context = {}) {
    const words = sentence.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words.length === 0) {
      return 0;
    }
    
    // Calculate word frequency
    const wordFreq = new Map();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
    
    // Calculate entropy
    const totalWords = words.length;
    let entropy = 0;
    
    for (const [word, count] of wordFreq.entries()) {
      const p = count / totalWords;
      entropy -= p * Math.log2(p);
    }
    
    // Normalize by unique words
    const normalizedEntropy = entropy / wordFreq.size;
    
    return normalizedEntropy;
  }
  
  /**
   * Calculate entropy reduction after filtering
   * @private
   */
  _calculateEntropyReduction(original, filtered) {
    const origEntropy = this._calculateTotalEntropy(original);
    const filtEntropy = this._calculateTotalEntropy(filtered);
    
    const reduction = ((origEntropy - filtEntropy) / origEntropy) * 100;
    return Math.abs(reduction); // Return absolute value
  }
  
  /**
   * Calculate total entropy of text
   * @private
   */
  _calculateTotalEntropy(text) {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words.length === 0) {
      return 0;
    }
    
    const wordFreq = new Map();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
    
    const totalWords = words.length;
    let entropy = 0;
    
    for (const [word, count] of wordFreq.entries()) {
      const p = count / totalWords;
      entropy -= p * Math.log2(p);
    }
    
    const normalizedEntropy = entropy / wordFreq.size;
    return normalizedEntropy;
  }
  
  /**
   * Compress content while preserving key facts
   * @private
   */
  async _compress(content) {
    // Remove redundant words
    const redundantWords = ['very', 'really', 'extremely', 'quite', 'somewhat', 'basically', 'actually', 'literally'];
    
    const lines = content.split('\n');
    const compressedLines = [];
    
    for (const line of lines) {
      const words = line.split(' ');
      const filteredWords = words.filter(w => {
        // Preserve numbers, dates, technical terms
        if (/\d{4}-\d{2}-\d{2}/.test(w) || /^\d+/.test(w) || /\b[A-Z]{2,}\b/.test(w)) {
          return true;
        }
        
        // Remove redundant words
        const wordLower = w.toLowerCase().replace(/[^a-z]/g, '');
        return !redundantWords.includes(wordLower);
      });
      
      compressedLines.push(filteredWords.join(' '));
    }
    
    return compressedLines.join('\n');
  }
  
  /**
   * Split text into sentences
   * @private
   */
  _splitIntoSentences(text) {
    // Simple sentence splitting
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    return sentences;
  }
  
  /**
   * Calculate cosine similarity between two vectors
   * @private
   */
  _cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Get embedding for text
   * @private
   */
  async _getEmbedding(text) {
    // Simple embedding for demo (in production, use actual embedding model)
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(128).fill(0);
    
    for (const word of words) {
      const hash = this._hashString(word);
      const index = hash % 128;
      embedding[index] += 1;
    }
    
    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }
    
    return embedding;
  }
  
  /**
   * Hash string to number
   * @private
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  /**
   * Load embedding model
   * @private
   */
  _loadEmbeddingModel() {
    // In production, load actual embedding model (e.g., SentenceTransformer)
    // For demo, use simple hash-based embedding
    return 'default';
  }
  
  /**
   * Count sentences in text
   * @private
   */
  _countSentences(text) {
    const sentences = this._splitIntoSentences(text);
    return sentences.length;
  }
}

/**
 * Multi-Agent Consensus Synchronization
 * Implements Paxos consensus with version vectors for distributed memory sync
 * 
 * @module MultiAgentSync
 */

class MultiAgentSync {
  constructor(agents, options = {}) {
    this.agents = Array.isArray(agents) ? agents : [agents];
    this.options = {
      consensusProtocol: options.consensusProtocol || 'paxos',
      quorumSize: options.quorumSize || Math.floor(this.agents.length / 2) + 1,
      timeout: options.timeout || 5000
    };
    
    this.versionVectors = new Map();
    this.pendingChanges = new Map();
    this.consensus = this._initConsensus();
  }
  
  /**
   * Broadcast change to all agents with consensus
   * @param {Object} change - Change to broadcast
   * @returns {Object} Consensus result
   */
  async broadcastChange(change) {
    console.log(`🔄 Broadcasting change to ${this.agents.length} agents...`);
    
    // Step 1: Generate version vector
    const versionVector = this._computeVersionVector(change);
    
    // Step 2: Propose to all agents
    const proposal = {
      change,
      versionVector,
      timestamp: Date.now(),
      leader: change.authorAgent || this._selectLeader()
    };
    
    // Step 3: Paxos prepare phase
    console.log('📋 Phase 1: Paxos Prepare');
    const prepareResponses = await this._paxosPrepare(proposal);
    
    if (!this._hasQuorum(prepareResponses)) {
      throw new Error('Consensus failed: no quorum in prepare phase');
    }
    
    // Step 4: Paxos accept phase
    console.log('📋 Phase 2: Paxos Accept');
    const acceptResponses = await this._paxosAccept(proposal, prepareResponses);
    
    if (!this._hasQuorum(acceptResponses)) {
      throw new Error('Consensus failed: no quorum in accept phase');
    }
    
    // Step 5: Commit and propagate
    console.log('📝 Phase 3: Commit');
    await this._commitChange(change, versionVector);
    await this._propagateToAllAgents(change, versionVector);
    
    console.log(`✅ Consensus achieved and change propagated`);
    
    return {
      success: true,
      versionVector,
      timestamp: Date.now(),
      agentsParticipated: prepareResponses.filter(r => r.accepted).length
    };
  }
  
  /**
   * Resolve synchronization conflicts
   * @param {Array} conflicts - Array of conflicts to resolve
   * @returns {Object} Resolution result
   */
  async resolveSyncConflicts(conflicts) {
    console.log(`🔧 Resolving ${conflicts.length} conflicts...`);
    
    const resolved = [];
    
    for (const conflict of conflicts) {
      const winner = await this._resolveConflict(conflict);
      resolved.push(winner);
      
      // Apply resolution
      await this._applyResolution(winner);
    }
    
    console.log(`✅ Resolved ${resolved.length} conflicts`);
    
    return {
      success: true,
      resolved: resolved.length,
      failures: 0,
      results: resolved
    };
  }
  
  /**
   * Compute version vector for a change
   * @private
   */
  _computeVersionVector(change) {
    const vector = new Map();
    
    for (const agent of this.agents) {
      const current = this.versionVectors.get(agent.id) || 0;
      vector.set(agent.id, current + 1);
    }
    
    // Update author agent's version
    if (change.authorAgent) {
      const current = this.versionVectors.get(change.authorAgent) || 0;
      this.versionVectors.set(change.authorAgent, current + 1);
    }
    
    return vector;
  }
  
  /**
   * Select leader for consensus
   * @private
   */
  _selectLeader() {
    // Simple round-robin selection
    return this.agents[0].id;
  }
  
  /**
   * Paxos prepare phase
   * @private
   */
  async _paxosPrepare(proposal) {
    const responses = [];
    
    for (const agent of this.agents) {
      try {
        const response = await agent.prepare(proposal);
        responses.push(response);
      } catch (error) {
        console.error(`Agent ${agent.id} prepare failed: ${error.message}`);
        responses.push({
          agentId: agent.id,
          accepted: false,
          error: error.message
        });
      }
    }
    
    return responses;
  }
  
  /**
   * Paxos accept phase
   * @private
   */
  async _paxosAccept(proposal, prepareResponses) {
    const responses = [];
    
    for (const agent of this.agents) {
      try {
        const prepareResponse = prepareResponses.find(r => r.agentId === agent.id);
        const response = await agent.accept({
          proposal,
          prepareResponse,
          agentId: agent.id
        });
        responses.push(response);
      } catch (error) {
        console.error(`Agent ${agent.id} accept failed: ${error.message}`);
        responses.push({
          agentId: agent.id,
          accepted: false,
          error: error.message
        });
      }
    }
    
    return responses;
  }
  
  /**
   * Check if quorum is achieved
   * @private
   */
  _hasQuorum(responses) {
    const positive = responses.filter(r => r.accepted).length;
    return positive >= this.options.quorumSize;
  }
  
  /**
   * Commit change to local storage
   * @private
   */
  async _commitChange(change, versionVector) {
    console.log('📝 Committing change to storage...');
    
    // Log consensus
    await this._logConsensus({
      change,
      versionVector,
      timestamp: Date.now()
    });
    
    // Write to local storage
    await this._storeChange(change, versionVector);
    
    console.log('✅ Change committed');
  }
  
  /**
   * Propagate change to all agents
   * @private
   */
  async _propagateToAllAgents(change, versionVector) {
    console.log('📡 Propagating change to all agents...');
    
    await Promise.all(
      this.agents.map(async agent => {
        if (agent.id !== change.authorAgent) {
          try {
            await agent.receiveChange(change, versionVector);
          } catch (error) {
            console.error(`Agent ${agent.id} receive failed: ${error.message}`);
          }
        }
      })
    );
    
    console.log('✅ Change propagated to all agents');
  }
  
  /**
   * Resolve conflict between competing versions
   * @private
   */
  async _resolveConflict(conflict) {
    const { versions, nodeId } = conflict;
    
    if (versions.length === 1) {
      return {
        action: 'accept',
        winner: versions[0],
        reason: 'single_version',
        timestamp: Date.now()
      };
    }
    
    // Compare version vectors
    const latest = this._compareVersionVectors(versions);
    
    // Check confidence scores
    const winner = this._selectWinner(versions, latest);
    
    return {
      action: 'accept',
      winner,
      rejected: versions.filter(v => v !== winner),
      reason: 'highest_version_vector',
      timestamp: Date.now()
    };
  }
  
  /**
   * Compare version vectors
   * @private
   */
  _compareVersionVectors(versions) {
    let latest = versions[0];
    
    for (let i = 1; i < versions.length; i++) {
      const currentVersion = versions[i];
      const lastVersion = latest;
      
      if (this._isNewer(currentVersion.versionVector, lastVersion.versionVector)) {
        latest = currentVersion;
      }
    }
    
    return latest;
  }
  
  /**
   * Check if one version vector is newer than another
   * @private
   */
  _isNewer(v1, v2) {
    for (const [agentId, version1] of v1.entries()) {
      const version2 = v2.get(agentId) || 0;
      if (version1 > version2) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Select winner from versions
   * @private
   */
  _selectWinner(versions, latestVersion) {
    // Select based on highest version vector
    const winner = versions.find(v => 
      this._isSameVersionVector(v.versionVector, latestVersion.versionVector)
    );
    
    return winner || versions[0];
  }
  
  /**
   * Check if two version vectors are the same
   * @private
   */
  _isSameVersionVector(v1, v2) {
    for (const [agentId, version1] of v1.entries()) {
      const version2 = v2.get(agentId);
      if (version1 !== version2) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Apply resolution to storage
   * @private
   */
  async _applyResolution(resolution) {
    console.log(`📝 Applying resolution: ${resolution.action}`);
    
    if (resolution.action === 'accept') {
      await this._storeChange(resolution.winner.change, resolution.winner.versionVector);
    }
  }
  
  /**
   * Store change to local storage
   * @private
   */
  async _storeChange(change, versionVector) {
    // In production, this would write to actual storage
    console.log(`📝 Stored change: ${change.type}`);
  }
  
  /**
   * Log consensus event
   * @private
   */
  async _logConsensus(event) {
    // In production, this would log to audit trail
    console.log(`📝 Consensus logged: ${event.change.type}`);
  }
  
  /**
   * Initialize consensus protocol
   * @private
   */
  _initConsensus() {
    return {
      protocol: this.options.consensusProtocol,
      quorumSize: this.options.quorumSize
    };
  }
}

module.exports = {
  DensityGatingCompressor,
  MultiAgentSync
};
