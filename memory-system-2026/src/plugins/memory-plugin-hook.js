/**
 * OpenClaw Memory Plugin Hook System
 * Enables external memory plugins (SimpleMem, Hermes-agent, etc.) to integrate seamlessly
 * 
 * @module MemoryPluginHook
 */

class MemoryPluginHook {
  constructor(memoryManager) {
    this.memoryManager = memoryManager;
    this.plugins = new Map();
    this.registry = new Map();
    this.hooks = {
      preStore: [],
      postStore: [],
      preRetrieve: [],
      postRetrieve: []
    };
  }
  
  /**
   * Register an external memory plugin
   * @param {Object} plugin - Plugin object with lifecycle methods
   */
  async registerPlugin(plugin) {
    console.log(`🔌 Registering plugin: ${plugin.name}`);
    
    // Validate plugin interface
    if (!this._validatePluginInterface(plugin)) {
      throw new Error(`Plugin ${plugin.name} does not implement required methods`);
    }
    
    // Store plugin
    this.plugins.set(plugin.name, plugin);
    
    // Register plugin capabilities
    this._registerPluginCapabilities(plugin);
    
    // Hook into core memory operations
    this._hookCoreOperations(plugin);
    
    // Initialize plugin
    if (plugin.initialize) {
      await plugin.initialize();
    }
    
    console.log(`✅ Plugin ${plugin.name} registered successfully`);
    
    return {
      success: true,
      plugin: plugin.name,
      status: 'active'
    };
  }
  
  /**
   * Unregister a plugin
   * @param {string} pluginName - Name of the plugin to unregister
   */
  async unregisterPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    
    // Unhook operations
    this._unhookCoreOperations(plugin);
    
    // Unregister capabilities
    this._unregisterPluginCapabilities(plugin);
    
    // Destroy plugin
    if (plugin.destroy) {
      await plugin.destroy();
    }
    
    this.plugins.delete(pluginName);
    
    console.log(`🔌 Plugin ${pluginName} unregistered`);
    
    return {
      success: true,
      plugin: pluginName,
      status: 'unregistered'
    };
  }
  
  /**
   * Validate plugin interface
   * @private
   */
  _validatePluginInterface(plugin) {
    const requiredMethods = [
      'name',
      'version',
      'description'
    ];
    
    // Check required fields
    for (const field of requiredMethods) {
      if (!plugin[field]) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }
    
    // Check optional lifecycle methods (if present, must be functions)
    const optionalMethods = ['initialize', 'destroy', 'preStore', 'postStore', 'preRetrieve', 'postRetrieve'];
    
    for (const method of optionalMethods) {
      if (plugin[method] && typeof plugin[method] !== 'function') {
        console.error(`Plugin ${plugin.name}: ${method} must be a function`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Register plugin capabilities
   * @private
   */
  _registerPluginCapabilities(plugin) {
    const capabilities = plugin.capabilities || [];
    
    for (const capability of capabilities) {
      this.registry.set(
        `${plugin.name}:${capability}`,
        {
          plugin: plugin.name,
          capability,
          version: plugin.version
        }
      );
    }
  }
  
  /**
   * Unregister plugin capabilities
   * @private
   */
  _unregisterPluginCapabilities(plugin) {
    const capabilities = plugin.capabilities || [];
    
    for (const capability of capabilities) {
      this.registry.delete(`${plugin.name}:${capability}`);
    }
  }
  
  /**
   * Hook core memory operations with plugin lifecycle
   * @private
   */
  _hookCoreOperations(plugin) {
    // Hook store operation
    const originalStore = this.memoryManager.store.bind(this.memoryManager);
    
    this.memoryManager.store = async (content, metadata) => {
      let modifiedContent = content;
      let modifiedMetadata = metadata;
      
      // Pre-store hook
      if (plugin.preStore) {
        const result = await plugin.preStore(modifiedContent, modifiedMetadata);
        if (result) {
          modifiedContent = result.content || modifiedContent;
          modifiedMetadata = result.metadata || modifiedMetadata;
        }
      }
      
      // Execute original store
      const result = await originalStore(modifiedContent, modifiedMetadata);
      
      // Post-store hook
      if (plugin.postStore) {
        await plugin.postStore(result, modifiedContent, modifiedMetadata);
      }
      
      return result;
    };
    
    // Hook retrieve operation
    const originalRetrieve = this.memoryManager.retrieve.bind(this.memoryManager);
    
    this.memoryManager.retrieve = async (query, options) => {
      let modifiedQuery = query;
      let modifiedOptions = options;
      
      // Pre-retrieve hook
      if (plugin.preRetrieve) {
        const result = await plugin.preRetrieve(modifiedQuery, modifiedOptions);
        if (result) {
          modifiedQuery = result.query || modifiedQuery;
          modifiedOptions = result.options || modifiedOptions;
        }
      }
      
      // Execute original retrieve
      const results = await originalRetrieve(modifiedQuery, modifiedOptions);
      
      // Post-retrieve hook
      if (plugin.postRetrieve) {
        return await plugin.postRetrieve(results, modifiedQuery, modifiedOptions);
      }
      
      return results;
    };
    
    // Hook compress operation
    const originalCompress = this.memoryManager.compressMemories.bind(this.memoryManager);
    
    this.memoryManager.compressMemories = async (options) => {
      let modifiedOptions = options;
      
      // Pre-compress hook
      if (plugin.preCompress) {
        const result = await plugin.preCompress(modifiedOptions);
        if (result) {
          modifiedOptions = result.options || modifiedOptions;
        }
      }
      
      // Execute original compress
      const result = await originalCompress(modifiedOptions);
      
      // Post-compress hook
      if (plugin.postCompress) {
        await plugin.postCompress(result, modifiedOptions);
      }
      
      return result;
    };
    
    // Hook consolidate operation
    const originalConsolidate = this.memoryManager.consolidateMemories.bind(this.memoryManager);
    
    this.memoryManager.consolidateMemories = async (options) => {
      let modifiedOptions = options;
      
      // Pre-consolidate hook
      if (plugin.preConsolidate) {
        const result = await plugin.preConsolidate(modifiedOptions);
        if (result) {
          modifiedOptions = result.options || modifiedOptions;
        }
      }
      
      // Execute original consolidate
      const result = await originalConsolidate(modifiedOptions);
      
      // Post-consolidate hook
      if (plugin.postConsolidate) {
        await plugin.postConsolidate(result, modifiedOptions);
      }
      
      return result;
    };
  }
  
  /**
   * Unhook core operations
   * @private
   */
  _unhookCoreOperations(plugin) {
    // Restore store operation
    this.memoryManager.store = this.memoryManager.store.originalStore;
    
    // Restore retrieve operation
    this.memoryManager.retrieve = this.memoryManager.retrieve.originalRetrieve;
    
    // Restore compress operation
    this.memoryManager.compressMemories = this.memoryManager.compressMemories.originalCompress;
    
    // Restore consolidate operation
    this.memoryManager.consolidateMemories = this.memoryManager.consolidateMemories.originalConsolidate;
  }
  
  /**
   * Get all registered plugins
   * @returns {Array} List of plugin names
   */
  getRegisteredPlugins() {
    return Array.from(this.plugins.keys());
  }
  
  /**
   * Get plugin registry
   * @returns {Map} Plugin capabilities registry
   */
  getPluginRegistry() {
    return this.registry;
  }
  
  /**
   * Check if plugin is registered
   * @param {string} pluginName - Name of the plugin
   * @returns {boolean} True if registered
   */
  hasPlugin(pluginName) {
    return this.plugins.has(pluginName);
  }
  
  /**
   * Get plugin instance
   * @param {string} pluginName - Name of the plugin
   * @returns {Object|null} Plugin instance or null
   */
  getPlugin(pluginName) {
    return this.plugins.get(pluginName) || null;
  }
  
  /**
   * List available capabilities
   * @returns {Array} List of available capabilities
   */
  listCapabilities() {
    const capabilities = new Map();
    
    for (const [key, value] of this.registry.entries()) {
      const [plugin, capability] = key.split(':');
      if (!capabilities.has(capability)) {
        capabilities.set(capability, []);
      }
      capabilities.get(capability).push({
        plugin,
        version: value.version
      });
    }
    
    return Array.from(capabilities.entries()).map(([capability, plugins]) => ({
      capability,
      plugins
    }));
  }
}

/**
 * SimpleMem Plugin Implementation
 * Integrates Python-based SimpleMem with OpenClaw
 */
class SimpleMemPlugin {
  constructor(options = {}) {
    this.name = 'simplemem';
    this.version = '1.0.0';
    this.description = 'Python-based semantic compression for OpenClaw';
    this.options = options;
    
    this.pythonProcess = null;
    this.mcpClient = null;
    this.apiEndpoint = options.apiEndpoint || 'http://localhost:8765';
  }
  
  async initialize() {
    console.log('🚀 Initializing SimpleMem plugin...');
    
    // Initialize MCP client if available
    if (this.options.useMCP) {
      this.mcpClient = await this._initMCPClient();
    } else {
      // Start Python subprocess
      await this._startPythonProcess();
    }
    
    console.log('✅ SimpleMem plugin initialized');
  }
  
  async _initMCPClient() {
    // Initialize MCP client for communication
    const { Client } = require('@modelcontextprotocol/client');
    
    const client = new Client({
      name: 'simplemem-client',
      version: '1.0.0'
    });
    
    await client.connect(this.options.mcpEndpoint);
    
    return client;
  }
  
  async _startPythonProcess() {
    const { spawn } = require('child_process');
    
    this.pythonProcess = spawn('python', [
      '-m',
      'simplemem',
      '--port',
      this.options.port || '8765'
    ]);
    
    // Handle process output
    this.pythonProcess.stdout.on('data', (data) => {
      console.log(`SimpleMem: ${data}`);
    });
    
    this.pythonProcess.stderr.on('data', (data) => {
      console.error(`SimpleMem error: ${data}`);
    });
    
    this.pythonProcess.on('close', (code) => {
      console.log(`SimpleMem process exited with code ${code}`);
    });
    
    // Wait for process to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  async preStore(content, metadata) {
    // Call SimpleMem compression
    const compressed = await this._compressContent(content, metadata);
    
    return {
      content: compressed.content,
      metadata: {
        ...metadata,
        compressionRatio: compressed.compressionRatio,
        preservedFacts: compressed.preservedFactsCount
      }
    };
  }
  
  async postStore(result, content, metadata) {
    // Log compression results
    console.log(`SimpleMem compression: ${metadata.compressionRatio}×, ${metadata.preservedFacts} facts preserved`);
  }
  
  async _compressContent(content, metadata) {
    if (this.mcpClient) {
      // Use MCP for compression
      const result = await this.mcpClient.callTool('compress', { text: content, metadata });
      return JSON.parse(result);
    } else {
      // Use HTTP API
      const response = await fetch(`${this.apiEndpoint}/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, metadata })
      });
      
      return await response.json();
    }
  }
  
  async destroy() {
    // Stop Python process
    if (this.pythonProcess) {
      this.pythonProcess.kill();
    }
    
    // Close MCP client
    if (this.mcpClient) {
      await this.mcpClient.close();
    }
    
    console.log('🔌 SimpleMem plugin destroyed');
  }
  
  get capabilities() {
    return ['semantic-compression', 'fact-extraction', 'cross-session-memory'];
  }
}

/**
 * Hermes-agent Plugin Implementation
 * Integrates FTS5 + LLM summarization with OpenClaw
 */
class HermesAgentPlugin {
  constructor(options = {}) {
    this.name = 'hermes-agent';
    this.version = '1.0.0';
    this.description = 'FTS5 full-text search and summarization for OpenClaw';
    this.options = options;
    
    this.dbConnection = null;
    this.llm = null;
  }
  
  async initialize() {
    console.log('🚀 Initializing Hermes-agent plugin...');
    
    // Initialize SQLite connection
    await this._initDatabase();
    
    // Initialize LLM
    this.llm = await this._initLLM();
    
    console.log('✅ Hermes-agent plugin initialized');
  }
  
  async _initDatabase() {
    const sqlite3 = require('better-sqlite3');
    const path = require('path');
    
    const dbPath = path.join(this.options.storagePath || '~/.openclaw', 'memory.db');
    this.dbConnection = new sqlite3(dbPath);
    
    // Create tables
    this.dbConnection.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT,
        summary TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
      
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content,
        summary,
        content='memories',
        content_rowid='id'
      );
    `);
    
    console.log('🗄️ Hermes-agent database initialized');
  }
  
  async _initLLM() {
    // Initialize LLM for summarization
    const llm = await this.options.llmProvider || createLLM();
    return llm;
  }
  
  async preStore(content, metadata) {
    // Generate summary using LLM
    const summary = await this._generateSummary(content);
    
    return {
      content,
      metadata: {
        ...metadata,
        hasSummary: true,
        summaryGenerated: true
      }
    };
  }
  
  async postStore(result, content, metadata) {
    // Store summary in FTS5
    await this._storeSummary(result.id, content, metadata.summary);
  }
  
  async _generateSummary(content) {
    const prompt = `Summarize the following memory trajectory while preserving key facts:

${content}

Return a concise summary:`;
    
    const summary = await this.llm.generate(prompt);
    return summary;
  }
  
  async _storeSummary(memoryId, content, summary) {
    const db = this.dbConnection;
    
    db.exec(`
      INSERT OR REPLACE INTO memories (id, content, summary, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `, [memoryId, content, summary]);
    
    // Update FTS5 index
    db.exec(`
      INSERT INTO memories_fts (id, content, summary)
      VALUES (?, ?, ?)
    `, [memoryId, content, summary]);
    
    console.log(`📝 Stored summary for memory ${memoryId}`);
  }
  
  async preRetrieve(query, options) {
    // Search FTS5 for matches
    const results = await this._ftsSearch(query);
    
    return {
      options: {
        ...options,
        ftsResults: results
      }
    };
  }
  
  async postRetrieve(results, query, options) {
    // Enrich results with summaries
    const enriched = await this._enrichWithSummaries(results);
    return enriched;
  }
  
  async _ftsSearch(query) {
    const db = this.dbConnection;
    const results = db.prepare(`
      SELECT id, content, summary, rank
      FROM memories_fts
      WHERE memories_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    `).all(query);
    
    return results;
  }
  
  async _enrichWithSummaries(results) {
    const enriched = [];
    
    for (const result of results) {
      enriched.push({
        id: result.id,
        content: result.content,
        summary: result.summary,
        score: result.rank,
        type: 'fts5'
      });
    }
    
    return enriched;
  }
  
  async destroy() {
    if (this.dbConnection) {
      this.dbConnection.close();
    }
    
    if (this.llm) {
      await this.llm.close();
    }
    
    console.log('🔌 Hermes-agent plugin destroyed');
  }
  
  get capabilities() {
    return ['fts5-search', 'llm-summarization', 'trajectory-compression'];
  }
}

module.exports = {
  MemoryPluginHook,
  SimpleMemPlugin,
  HermesAgentPlugin
};
