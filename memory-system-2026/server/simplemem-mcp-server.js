/**
 * SimpleMem MCP Server
 * Enables seamless integration with OpenClaw
 * 
 * Usage: node server/simplemem-mcp-server.js
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

class SimpleMemMCP {
  constructor(options = {}) {
    this.options = {
      port: options.port || 8765,
      storagePath: options.storagePath || '~/.openclaw/memory/'
    };
    
    this.server = null;
    this.pythonProcess = null;
  }
  
  async initialize() {
    console.log('🚀 Starting SimpleMem MCP Server...');
    
    // Initialize Express server
    this.server = express();
    this.server.use(express.json());
    
    // Start Python subprocess (optional)
    if (this.options.usePython) {
      await this._startPythonProcess();
    }
    
    // Setup routes
    this._setupRoutes();
    
    // Start server
    const port = this.options.port;
    this.server.listen(port, () => {
      console.log(`📡 SimpleMem MCP Server running on port ${port}`);
      console.log(`📍 Storage path: ${this.options.storagePath}`);
    });
  }
  
  async _startPythonProcess() {
    console.log('🐍 Starting Python subprocess for SimpleMem...');
    
    this.pythonProcess = spawn('python', [
      '-m',
      'simplemem',
      '--mcp-port',
      this.options.port
    ]);
    
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
  
  _setupRoutes() {
    // Compression endpoint
    this.server.post('/api/v1/compress', async (req, res) => {
      try {
        const { text, metadata, context } = req.body;
        
        if (!text) {
          res.status(400).json({ error: 'Missing required field: text' });
          return;
        }
        
        // Call SimpleMem compression API
        const result = await this._callSimpleMemAPI('compress', { text, metadata, context });
        
        res.json({
          success: true,
          ...result
        });
      } catch (error) {
        console.error('Compression error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Retrieval endpoint
    this.server.post('/api/v1/retrieve', async (req, res) => {
      try {
        const { query, options, context } = req.body;
        
        if (!query) {
          res.status(400).json({ error: 'Missing required field: query' });
          return;
        }
        
        const result = await this._callSimpleMemAPI('retrieve', { query, options, context });
        res.json({
          success: true,
          ...result
        });
      } catch (error) {
        console.error('Retrieval error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Sync endpoint
    this.server.post('/api/v1/sync', async (req, res) => {
      try {
        const { agentId, data, context } = req.body;
        
        const result = await this._callSimpleMemAPI('sync', { agentId, data, context });
        res.json({
          success: true,
          ...result
        });
      } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Health check
    this.server.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'simplemem-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        port: this.options.port,
        uptime: this.server.uptime ? Math.floor(this.server.uptime) : 0
      });
    });
    
    // Status endpoint
    this.server.get('/status', (req, res) => {
      const stats = {
        service: 'SimpleMem MCP Server',
        version: '1.0.0',
        port: this.options.port,
        storagePath: this.options.storagePath,
        pythonProcess: this.pythonProcess ? 'running' : 'not started',
        uptime: this.server.uptime ? Math.floor(this.server.uptime) : 0,
        memoryUsage: process.memoryUsage()
      };
      
      res.json(stats);
    });
    
    // Routes list
    this.server.get('/routes', (req, res) => {
      const routes = [
        'POST /api/v1/compress',
        'POST /api/v1/retrieve',
        'POST /api/v1/sync',
        'GET /health',
        'GET /status',
        'GET /routes'
      ];
      
      res.json({
        service: 'SimpleMem MCP Server',
        routes
      });
    });
  }
  
  async _callSimpleMemAPI(method, params) {
    // In production, this would make HTTP request to Python subprocess
    // For demo, return mock response with realistic metrics
    
    if (method === 'compress') {
      const originalLength = params.text.length;
      const compressedLength = Math.floor(originalLength * 0.65); // 35% savings
      const tokensSaved = Math.floor((originalLength - compressedLength) / 4);
      
      return {
        content: params.text.substring(0, 100) + '... [compressed]',
        compressionRatio: '1.54×',
        tokensSaved,
        preservedFacts: 12,
        density: 0.72,
        skipped: false,
        metadata: {
          ...params.metadata,
          compressionMethod: 'semantic',
          timestamp: new Date().toISOString()
        }
      };
    }
    
    if (method === 'retrieve') {
      const retrievalTime = Math.floor(Math.random() * 50) + 30; // 30-80ms
      
      return {
        results: [
          {
            id: 'mem-001',
            content: 'Payment validation must include all required fields and transaction ID for tracking purposes.',
            score: 0.95,
            type: 'semantic',
            path: '/memory/semantic/payment-validation.md',
            metadata: {
              topic: 'payment-validation',
              confidence: 0.95,
              version: 1
            }
          },
          {
            id: 'mem-002',
            content: 'Validation improves transaction success rate significantly.',
            score: 0.87,
            type: 'semantic',
            path: '/memory/semantic/payment-validation.md',
            metadata: {
              topic: 'payment-validation',
              confidence: 0.88,
              version: 2
            }
          },
          {
            id: 'mem-003',
            content: 'Missing fields cause 30% of transaction failures in production.',
            score: 0.82,
            type: 'semantic',
            path: '/memory/semantic/payment-validation.md',
            metadata: {
              topic: 'payment-validation',
              confidence: 0.90,
              version: 3
            }
          }
        ],
        count: 3,
        total: 15,
        retrievalTime,
        query: params.query,
        metadata: {
          method: 'hybrid',
          weights: { vector: 0.6, lexical: 0.25, graph: 0.15 },
          intent: 'semantic'
        }
      };
    }
    
    if (method === 'sync') {
      return {
        success: true,
        syncId: `sync-${Date.now()}`,
        agentsSynced: 3,
        timestamp: Date.now(),
        agents: ['agent-1', 'agent-2', 'agent-3'],
        versionVector: { 'agent-1': 5, 'agent-2': 4, 'agent-3': 4 },
        consensus: {
          protocol: 'paxos',
          rounds: 2,
          quorum: 2
        },
        metadata: {
          ...params.context,
          syncMethod: 'distributed',
          consistency: 'strong'
        }
      };
    }
    
    throw new Error(`Unknown method: ${method}`);
  }
  
  async destroy() {
    console.log('🔌 Shutting down SimpleMem MCP Server...');
    
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      console.log('🐍 Python subprocess terminated');
    }
    
    if (this.server) {
      this.server.close(() => {
        console.log('📡 HTTP server stopped');
      });
    }
    
    console.log('✅ SimpleMem MCP Server stopped gracefully');
  }
}

// CLI entry point
if (require.main === module) {
  const mcpServer = new SimpleMemMCP();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\\n🛑 Received SIGINT, shutting down gracefully...');
    await mcpServer.destroy();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\\n🛑 Received SIGTERM, shutting down gracefully...');
    await mcpServer.destroy();
    process.exit(0);
  });
  
  // Initialize server
  mcpServer.initialize().catch((error) => {
    console.error('❌ Failed to initialize MCP Server:', error);
    process.exit(1);
  });
}

module.exports = SimpleMemMCP;
