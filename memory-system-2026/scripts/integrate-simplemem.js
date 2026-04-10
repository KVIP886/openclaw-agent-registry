/**
 * SimpleMem Integration Script
 * Integrates Python-based SimpleMem with OpenClaw Node.js
 * 
 * Usage: node scripts/integrate-simplemem.js
 */

const { spawn } = require('child_process');
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

console.log('🚀 Starting SimpleMem integration...');

/**
 * Integration methods:
 * 1. MCP Protocol (recommended)
 * 2. HTTP REST API
 * 3. Python subprocess
 */

async function createMCPIntegration() {
  console.log('🔌 Creating MCP integration...');
  
  const integrationCode = `
/**
 * MCP Server for SimpleMem
 * Enables seamless integration with OpenClaw
 */

const express = require('express');
const { spawn } = require('child_process');

class SimpleMemMCP {
  constructor(options = {}) {
    this.options = options;
    this.server = null;
    this.pythonProcess = null;
  }
  
  async initialize() {
    console.log('🚀 Starting SimpleMem MCP Server...');
    
    // Initialize Express server
    this.server = express();
    this.server.use(express.json());
    
    // Start Python subprocess
    await this._startPythonProcess();
    
    // Setup routes
    this._setupRoutes();
    
    // Start server
    const port = this.options.port || 8765;
    this.server.listen(port, () => {
      console.log(\`📡 SimpleMem MCP Server running on port \${port}\`);
    });
  }
  
  async _startPythonProcess() {
    this.pythonProcess = spawn('python', [
      '-m',
      'simplemem',
      '--mcp-port',
      this.options.port || '8765'
    ]);
    
    this.pythonProcess.stdout.on('data', (data) => {
      console.log(\`SimpleMem: \${data}\`);
    });
    
    this.pythonProcess.stderr.on('data', (data) => {
      console.error(\`SimpleMem error: \${data}\`);
    });
    
    this.pythonProcess.on('close', (code) => {
      console.log(\`SimpleMem process exited with code \${code}\`);
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
        
        res.json(result);
      } catch (error) {
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
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Sync endpoint
    this.server.post('/api/v1/sync', async (req, res) => {
      try {
        const { agentId, data, context } = req.body;
        
        const result = await this._callSimpleMemAPI('sync', { agentId, data, context });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Health check
    this.server.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'simplemem-mcp',
        timestamp: new Date().toISOString()
      });
    });
  }
  
  async _callSimpleMemAPI(method, params) {
    // In production, this would make HTTP request to Python subprocess
    // For demo, return mock response
    
    if (method === 'compress') {
      return {
        success: true,
        content: params.text.substring(0, 100) + '...',
        compressionRatio: '2.5×',
        preservedFacts: 15,
        tokensSaved: 250
      };
    }
    
    if (method === 'retrieve') {
      return {
        success: true,
        results: [
          { id: 1, content: 'Sample result 1', score: 0.95 },
          { id: 2, content: 'Sample result 2', score: 0.87 }
        ],
        count: 2,
        retrievalTime: 45
      };
    }
    
    if (method === 'sync') {
      return {
        success: true,
        syncId: 'sync-123',
        agentsSynced: 3,
        timestamp: Date.now()
      };
    }
    
    throw new Error('Unknown method: ' + method);
  }
  
  async destroy() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
    }
    
    if (this.server) {
      this.server.close();
    }
    
    console.log('🔌 SimpleMem MCP Server stopped');
  }
}

// Export for use in OpenClaw
module.exports = SimpleMemMCP;

// CLI entry point
if (require.main === module) {
  const mcpServer = new SimpleMemMCP();
  
  process.on('SIGINT', async () => {
    console.log('\\n🛑 Shutting down...');
    await mcpServer.destroy();
    process.exit(0);
  });
  
  mcpServer.initialize();
}
`;
  
  const outputPath = path.join(__dirname, '..', 'server', 'simplemem-mcp-server.js');
  
  // Create server directory
  const dir = path.dirname(outputPath);
  if (!require('fs').existsSync(dir)) {
    require('fs').mkdirSync(dir, { recursive: true });
  }
  
  // Write file
  writeFileSync(outputPath, integrationCode);
  
  console.log(`✅ MCP integration created at: ${outputPath}`);
  
  return {
    success: true,
    file: outputPath,
    method: 'mcp'
  };
}

async function createHTTPIntegration() {
  console.log('🌐 Creating HTTP REST API integration...');
  
  const integrationCode = `
/**
 * SimpleMem HTTP REST API
 * Alternative to MCP for quick deployment
 */

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SimpleMemREST {
  constructor(options = {}) {
    this.options = options;
    this.server = null;
  }
  
  async initialize() {
    console.log('🚀 Starting SimpleMem REST API...');
    
    this.server = express();
    this.server.use(express.json());
    
    this._setupRoutes();
    
    const port = this.options.port || 8766;
    this.server.listen(port, () => {
      console.log(\`📡 SimpleMem REST API running on port \${port}\`);
    });
  }
  
  _setupRoutes() {
    this.server.post('/api/v1/compress', async (req, res) => {
      try {
        const { text, metadata } = req.body;
        
        const result = await this._callSimpleMemCommand('compress', JSON.stringify({ text, metadata }));
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.server.post('/api/v1/retrieve', async (req, res) => {
      try {
        const { query, options } = req.body;
        const result = await this._callSimpleMemCommand('retrieve', JSON.stringify({ query, options }));
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.server.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'simplemem-rest',
        timestamp: new Date().toISOString()
      });
    });
  }
  
  async _callSimpleMemCommand(method, params) {
    const { stdout, stderr } = await execAsync(\`python -m simplemem --method \${method} \${params}\`);
    return JSON.parse(stdout);
  }
  
  async destroy() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = SimpleMemREST;

if (require.main === module) {
  const api = new SimpleMemREST();
  api.initialize();
}
`;
  
  const outputPath = path.join(__dirname, '..', 'server', 'simplemem-rest-server.js');
  
  const dir = path.dirname(outputPath);
  if (!require('fs').existsSync(dir)) {
    require('fs').mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(outputPath, integrationCode);
  
  console.log(`✅ REST API integration created at: ${outputPath}`);
  
  return {
    success: true,
    file: outputPath,
    method: 'rest'
  };
}

async function createPythonIntegration() {
  console.log('🐍 Creating Python integration...');
  
  const integrationCode = `
#!/usr/bin/env python3
"""
SimpleMem Python Integration Module
Can be imported as a module or run standalone
"""

import json
import sys
from typing import Dict, Any, Optional

class SimpleMemIntegration:
    """SimpleMem integration for Python-based workflows"""
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}
        self.enabled = self.config.get('enabled', True)
    
    def initialize(self) -> bool:
        """Initialize SimpleMem integration"""
        if not self.enabled:
            print("⚠️ SimpleMem integration disabled in config")
            return False
        
        try:
            from simplemem import SemanticCompressor
            self.compressor = SemanticCompressor()
            print("✅ SimpleMem integration initialized")
            return True
        except ImportError:
            print("❌ SimpleMem package not installed")
            return False
    
    def compress(self, text: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """Compress text using SimpleMem"""
        if not self.enabled:
            return {
                "success": True,
                "content": text,
                "reason": "disabled",
                "compressionRatio": "1.0×"
            }
        
        try:
            result = self.compressor.compress(text, metadata or {})
            
            return {
                "success": True,
                "content": result["content"],
                "compressionRatio": result["compression_ratio"],
                "preservedFacts": result["preserved_facts_count"],
                "tokensSaved": result["tokens_saved"]
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "reason": "compression_failed"
            }
    
    def retrieve(self, query: str, options: Optional[Dict] = None) -> Dict[str, Any]:
        """Retrieve memories using SimpleMem"""
        if not self.enabled:
            return {
                "success": True,
                "results": [],
                "count": 0
            }
        
        try:
            results = self.compressor.retrieve(query, options or {})
            
            return {
                "success": True,
                "results": results,
                "count": len(results),
                "retrievalTime": results.get("retrieval_time", 0)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "reason": "retrieval_failed"
            }
    
    def sync(self, agentId: str, data: Any, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Synchronize data across agents"""
        if not self.enabled:
            return {
                "success": True,
                "syncId": None,
                "agentsSynced": 0
            }
        
        try:
            sync_result = self.compressor.sync(agentId, data, context or {})
            
            return {
                "success": True,
                "syncId": sync_result.get("sync_id"),
                "agentsSynced": sync_result.get("agents_synced", 0),
                "timestamp": sync_result.get("timestamp", 0)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "reason": "sync_failed"
            }

# CLI entry point
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="SimpleMem Integration CLI")
    parser.add_argument("--method", choices=["compress", "retrieve", "sync"], required=True,
                       help="Operation to perform")
    parser.add_argument("--input", help="Input data (JSON or text)")
    parser.add_argument("--config", help="Configuration file path")
    
    args = parser.parse_args()
    
    integration = SimpleMemIntegration()
    
    if not integration.initialize():
        sys.exit(1)
    
    if args.method == "compress":
        result = integration.compress(args.input)
    elif args.method == "retrieve":
        result = integration.retrieve(args.input)
    elif args.method == "sync":
        # Extract agentId and data from input
        input_data = json.loads(args.input) if args.input else {}
        result = integration.sync(
            agentId=input_data.get("agentId"),
            data=input_data.get("data"),
            context=input_data.get("context")
        )
    else:
        result = {"error": "Unknown method"}
    
    print(json.dumps(result, indent=2))
`;
  
  const outputPath = path.join(__dirname, '..', 'lib', 'simplemem-integration.py');
  
  const dir = path.dirname(outputPath);
  if not require('fs').existsSync(dir):
    require('fs').mkdirSync(dir, { recursive: true });
  
  writeFileSync(outputPath, integrationCode);
  
  console.log(`✅ Python integration created at: ${outputPath}`);
  
  return {
    success: true,
    file: outputPath,
    method: 'python'
  };
}

/**
 * Main execution
 */
async function main() {
  const method = process.argv[2] || 'mcp'; // Default to MCP
  
  console.log(`🔧 Using integration method: ${method}`);
  
  let result;
  
  try {
    if (method === 'mcp') {
      result = await createMCPIntegration();
    } else if (method === 'rest') {
      result = await createHTTPIntegration();
    } else if (method === 'python') {
      result = await createPythonIntegration();
    } else {
      console.error(`❌ Unknown method: ${method}`);
      console.error('Valid methods: mcp, rest, python');
      process.exit(1);
    }
    
    console.log('\\n✅ Integration created successfully!');
    console.log(`📄 File: ${result.file}`);
    console.log(`🔌 Method: ${result.method}`);
    
  } catch (error) {
    console.error('\\n❌ Integration failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  createMCPIntegration,
  createHTTPIntegration,
  createPythonIntegration,
  main
};
