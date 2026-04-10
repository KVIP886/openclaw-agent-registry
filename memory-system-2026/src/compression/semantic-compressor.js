/**
 * Semantic Compression Engine - 2026 Standard
 * Implements: Three-Stage Pipeline (Structured Compression → Online Synthesis → Intent-Aware Retrieval)
 * Target: ~30× token savings while preserving atomic facts
 */

const fs = require('fs');
const path = require('path');

class SemanticCompressor {
  constructor(options = {}) {
    this.config = {
      // Compression settings
      preserveAtomicFacts: options.preserveAtomicFacts !== false,
      maxCompressionRatio: options.maxCompressionRatio || 30,
      minContentLength: options.minContentLength || 500,
      
      // Compression phases
      enableOnlineSynthesis: options.enableOnlineSynthesis !== false,
      enableIntentAware: options.enableIntentAware !== false,
      
      // Fact extraction
      atomicFactPatterns: options.atomicFactPatterns || [
        /- (.+?)(?=\n-|$)/g,
        /^\d+\.\s+(.+?)\n/g
      ]
    };
    
    this.atomicFactsCache = new Map();
    this.synthesisBuffer = [];
  }
  
  /**
   * Compress content using three-stage pipeline
   * @param {string} rawText - Raw text content
   * @param {Object} context - Additional context
   * @returns {Object} Compression result
   */
  async compress(rawText, context = {}) {
    console.log('🧹 Starting semantic compression pipeline...');
    
    const startTime = Date.now();
    const originalLength = rawText.length;
    const preservedFacts = [];
    
    // Phase 1: Structured Compression
    console.log('📝 Phase 1: Structured Compression');
    const structured = this._structuredCompression(rawText);
    
    // Phase 2: Online Synthesis
    console.log('🔄 Phase 2: Online Synthesis');
    const synthesized = await this._onlineSynthesis(structured, context);
    
    // Phase 3: Intent-Aware Retrieval Preparation
    console.log('🎯 Phase 3: Intent-Aware Retrieval');
    const retrievalReady = this._prepareForIntentAwareRetrieval(synthesized, context);
    
    // Calculate results
    const finalLength = retrievalReady.content.length;
    const savings = ((originalLength - finalLength) / originalLength * 100).toFixed(1);
    
    console.log(`✅ Compression complete! Saved ${savings}% (${((originalLength - finalLength) / 1024).toFixed(1)}KB)`);
    console.log(`Preserved ${preservedFacts.length} atomic facts`);
    
    return {
      success: true,
      originalLength,
      finalLength,
      compressionRatio: `${savings}%`,
      tokensSaved: Math.floor((originalLength - finalLength) / 4), // ~4 chars per token
      preservedFacts: preservedFacts.slice(0, 10), // Return first 10
      retrievalIndex: retrievalReady.index,
      duration: Date.now() - startTime
    };
  }
  
  /**
   * Phase 1: Structured Compression
   * Extract atomic facts and create structured representation
   * @private
   */
  _structuredCompression(text) {
    const structured = {
      header: '',
      facts: [],
      learnings: [],
      metadata: {},
      content: []
    };
    
    // Extract header (title)
    const headerMatch = text.match(/^# (.+?)\n/);
    if (headerMatch) {
      structured.header = headerMatch[1];
    }
    
    // Extract key facts
    const factsMatches = text.match(/- (.+?)(?=\n-|$)/g);
    if (factsMatches) {
      structured.facts = factsMatches.map(f => f.replace('- ', '').trim());
    }
    
    // Extract learnings
    const learningsMatches = text.match(/Learnings?:\s*(.+?)(?=\n---|$)/s);
    if (learningsMatches) {
      structured.learnings = learningsMatches[1].split('\n').filter(l => l.trim()).map(l => l.replace(/^- /, '').trim());
    }
    
    // Extract metadata
    const metadataMatch = text.match(/---\s*\*\*metadata\*\*:\s*({.+})/s);
    if (metadataMatch) {
      try {
        structured.metadata = JSON.parse(metadataMatch[1]);
      } catch (e) {
        structured.metadata = { source: 'compressed' };
      }
    }
    
    // Extract remaining content
    structured.content = text.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && 
             !trimmed.startsWith('##') && 
             !trimmed.startsWith('- ') &&
             !trimmed.startsWith('**metadata**');
    });
    
    return structured;
  }
  
  /**
   * Phase 2: Online Synthesis
   * Synthesize structured facts, merging related information
   * @private
   */
  async _onlineSynthesis(structured, context) {
    const synthesis = {
      topic: structured.header || 'Unknown',
      facts: structured.facts,
      learnings: structured.learnings,
      metadata: structured.metadata,
      compressedContent: []
    };
    
    // Check for coreferences and resolve them
    const resolved = this._resolveCoreferences(synthesis.facts, context);
    synthesis.facts = resolved;
    
    // Apply absolute timestamps
    const withTimestamps = this._applyAbsoluteTimestamps(synthesis.facts, context);
    synthesis.facts = withTimestamps;
    
    // Merge related facts
    const merged = this._mergeRelatedFacts(synthesis.facts);
    synthesis.facts = merged;
    
    // Compress while preserving atomic facts
    synthesis.compressedContent = this._compressPreservingFacts(synthesis.facts, synthesis.metadata);
    
    return synthesis;
  }
  
  /**
   * Resolve coreferences in facts
   * @private
   */
  _resolveCoreferences(facts, context) {
    const resolved = facts.map(fact => {
      // Check if fact contains pronouns or references
      const pronounPattern = /it|they|this|that|these|those|he|she|we|you/gi;
      
      if (pronounPattern.test(fact)) {
        // Try to resolve based on context
        const resolvedFact = this._resolvePronoun(fact, context);
        return resolvedFact;
      }
      
      return fact;
    });
    
    return resolved;
  }
  
  /**
   * Resolve pronouns based on context
   * @private
   */
  _resolvePronoun(fact, context) {
    // Simple resolution logic (could be enhanced with LLM)
    let resolved = fact;
    
    // Replace common pronouns with context-specific references
    if (fact.includes('it')) {
      resolved = resolved.replace('it', context.topic || 'the topic');
    }
    
    if (fact.includes('they')) {
      resolved = resolved.replace('they', context.topic || 'the topic');
    }
    
    return resolved;
  }
  
  /**
   * Apply absolute timestamps to facts
   * @private
   */
  _applyAbsoluteTimestamps(facts, context) {
    const timestamped = facts.map(fact => {
      // Check if fact contains relative time references
      const relativePatterns = [
        { pattern: /yesterday/i, replacement: '1 day ago' },
        { pattern: /today/i, replacement: '0 days ago' },
        { pattern: /tomorrow/i, replacement: '1 day ahead' },
        { pattern: /last week/i, replacement: '7 days ago' },
        { pattern: /this week/i, replacement: 'within current week' },
        { pattern: /recently/i, replacement: 'within last 30 days' }
      ];
      
      let timestampedFact = fact;
      
      for (const { pattern, replacement } of relativePatterns) {
        timestampedFact = timestampedFact.replace(pattern, replacement);
      }
      
      // Add absolute timestamp if not present
      if (!timestampedFact.includes('timestamp') && !timestampedFact.includes('date')) {
        const timestamp = context.timestamp || new Date().toISOString();
        timestampedFact += ` [Timestamp: ${timestamp}]`;
      }
      
      return timestampedFact;
    });
    
    return timestamped;
  }
  
  /**
   * Merge related facts to reduce redundancy
   * @private
   */
  _mergeRelatedFacts(facts) {
    if (facts.length < 2) return facts;
    
    const merged = [facts[0]];
    
    for (let i = 1; i < facts.length; i++) {
      const currentFact = facts[i];
      let merged = false;
      
      // Check similarity with existing merged facts
      for (const mergedFact of merged) {
        const similarity = this._calculateSimilarity(currentFact, mergedFact);
        
        if (similarity > 0.8) {
          // High similarity - merge
          mergedFact.push(currentFact);
          merged = true;
          break;
        }
      }
      
      if (!merged) {
        merged.push([currentFact]);
      }
    }
    
    // Flatten the merged facts
    return merged.flat();
  }
  
  /**
   * Calculate similarity between two facts
   * @private
   */
  _calculateSimilarity(fact1, fact2) {
    const words1 = fact1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const words2 = fact2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    const intersection = words1.filter(w => words2.includes(w));
    const union = new Set([...words1, ...words2]);
    
    const similarity = intersection.length / union.size;
    return similarity;
  }
  
  /**
   * Compress while preserving atomic facts
   * @private
   */
  _compressPreservingFacts(facts, metadata) {
    const redundantWords = ['very', 'really', 'extremely', 'quite', 'somewhat', 'basically', 'actually'];
    
    const compressed = [];
    
    for (const fact of facts) {
      const words = fact.split(' ');
      const filtered = words.filter(w => {
        // Preserve atomic facts (metadata, dates, numbers)
        if (/\d{4}-\d{2}-\d{2}/.test(w) || /\d+/.test(w) || /^\*\*\w+\*\*:\s*$/i.test(w)) {
          return true;
        }
        
        // Remove redundant words
        if (redundantWords.includes(w.toLowerCase())) {
          return false;
        }
        
        return true;
      });
      
      compressed.push(filtered.join(' '));
    }
    
    return compressed;
  }
  
  /**
   * Phase 3: Prepare for intent-aware retrieval
   * @private
   */
  _prepareForIntentAwareRetrieval(synthesized, context) {
    const retrievalIndex = {
      topic: synthesized.topic,
      facts: synthesized.facts,
      learnings: synthesized.learnings,
      metadata: synthesized.metadata,
      retrievalHints: this._extractRetrievalHints(synthesized, context)
    };
    
    return {
      content: this._formatRetrievalIndex(retrievalIndex),
      index: retrievalIndex
    };
  }
  
  /**
   * Extract retrieval hints from synthesized content
   * @private
   */
  _extractRetrievalHints(synthesized, context) {
    const hints = {
      keywords: [],
      categories: [],
      timeRange: null,
      confidence: synthesized.metadata.confidence || 0.5
    };
    
    // Extract keywords from facts
    for (const fact of synthesized.facts) {
      const words = fact.split(/\s+/).filter(w => w.length > 3);
      hints.keywords.push(...words);
    }
    
    // Categorize based on content
    if (synthesized.topic.toLowerCase().includes('skill') || synthesized.topic.toLowerCase().includes('process')) {
      hints.categories.push('procedural');
    } else if (synthesized.topic.toLowerCase().includes('knowledge') || synthesized.topic.toLowerCase().includes('fact')) {
      hints.categories.push('semantic');
    } else if (synthesized.topic.toLowerCase().includes('event') || synthesized.topic.toLowerCase().includes('date')) {
      hints.categories.push('episodic');
    }
    
    return hints;
  }
  
  /**
   * Format retrieval index for storage
   * @private
   */
  _formatRetrievalIndex(index) {
    return `# ${index.topic}

**Topic**: ${index.topic}

**Facts**:
${index.facts.map(f => `- ${f}`).join('\n')}

**Learnings**:
${index.learnings.map(l => `- ${l}`).join('\n')}

**Metadata**:
- Confidence: ${index.metadata.confidence || 'N/A'}
- Source: ${index.metadata.source || 'unknown'}
- Version: ${index.metadata.version || 1}
- Timestamp: ${index.metadata.timestamp || new Date().toISOString()}

**Retrieval Hints**:
- Keywords: ${index.retrievalHints.keywords.slice(0, 10).join(', ')}
- Categories: ${index.retrievalHints.categories.join(', ')}
- Time Range: ${index.retrievalHints.timeRange || 'N/A'}
- Confidence: ${index.retrievalHints.confidence}

---
**metadata**: ${JSON.stringify(index.metadata)}
`;
  }
  
  /**
   * Compress content with safety checks
   * @param {string} content - Content to compress
   * @param {Array} atomicFacts - Facts to preserve
   * @returns {Object} Compression result
   */
  async compressWithSafety(content, atomicFacts = []) {
    // Safety checks
    if (content.length < this.config.minContentLength) {
      return {
        isCompressed: false,
        content,
        reason: 'Content too short'
      };
    }
    
    if (atomicFacts.length === 0) {
      return {
        isCompressed: false,
        content,
        reason: 'No atomic facts to preserve'
      };
    }
    
    // Compress
    const result = await this.compress(content, { preserveFacts: atomicFacts });
    
    return {
      isCompressed: result.finalLength < result.originalLength,
      content: result.content,
      preservedFacts: result.preservedFacts,
      savings: result.compressionRatio
    };
  }
  
  /**
   * Calculate compression ratio
   * @param {string} original - Original content
   * @param {string} compressed - Compressed content
   * @returns {number} Compression ratio
   */
  calculateCompressionRatio(original, compressed) {
    if (!compressed || compressed.length === 0) {
      return 0;
    }
    
    const ratio = original.length / compressed.length;
    return Math.min(ratio, this.config.maxCompressionRatio);
  }
}

module.exports = SemanticCompressor;
