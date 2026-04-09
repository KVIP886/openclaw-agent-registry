/**
 * Copilot Server
 * Created: 2026-04-10 (Week 5 Day 1)
 * Function: Express server for Copilot Core with UI
 */

const express = require('express');
const path = require('path');
const CopilotAPI = require('./api/copilot-api');
const CopilotCore = require('./copilot/CopilotCore');

class CopilotServer {
  constructor(options = {}) {
    this.config = {
      port: options.port || 3000,
      uiEnabled: options.uiEnabled !== false,
      apiPrefix: options.apiPrefix || '/api/copilot'
    };

    this.app = express();
    this.copilotAPI = new CopilotAPI();
    this.copilotCore = new CopilotCore();

    this.initialize();

    console.log('[CopilotServer] Server initialized');
  }

  initialize() {
    // Middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // API routes
    this.app.use(this.config.apiPrefix, this.copilotAPI.getRouter());

    // Serve static files (UI)
    if (this.config.uiEnabled) {
      this.app.use(express.static(path.join(__dirname, 'ui')));
      this.app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'ui', 'index.html'));
      });
    }

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });

    console.log('[CopilotServer] Express initialized');
  }

  start(callback) {
    const server = this.app.listen(this.config.port, () => {
      console.log(`[CopilotServer] Server listening on port ${this.config.port}`);
      console.log(`[CopilotServer] API: http://localhost:${this.config.port}${this.config.apiPrefix}`);
      
      if (this.config.uiEnabled) {
        console.log(`[CopilotServer] UI: http://localhost:${this.config.port}`);
      }

      if (callback) {
        callback(null, server);
      }
    });

    return server;
  }

  stop(callback) {
    if (this.server) {
      this.server.close(() => {
        console.log('[CopilotServer] Server stopped');
        if (callback) {
          callback();
        }
      });
    }
  }

  getConfig() {
    return this.config;
  }
}

// Export
module.exports = CopilotServer;

// Auto-start if run directly
if (require.main === module) {
  const server = new CopilotServer({
    port: 3000,
    uiEnabled: true
  });

  server.start();
}
