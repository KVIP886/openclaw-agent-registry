/**
 * Copilot REST API Endpoints
 * Created: 2026-04-10 (Week 5 Day 1)
 * Function: REST API endpoints for Copilot Core
 */

const express = require('express');
const CopilotCore = require('../copilot/CopilotCore');

class CopilotAPI {
  constructor() {
    this.copilot = new CopilotCore();
    this.router = express.Router();
    this.startTime = Date.now();

    this.initializeRoutes();
  }

  initializeRoutes() {
    // Health check endpoint
    this.router.get('/health', this.healthCheck.bind(this));

    // Status endpoint
    this.router.get('/status', this.getStatus.bind(this));

    // Process natural language endpoint
    this.router.post('/process', this.processNaturalLanguage.bind(this));

    // Configuration management endpoints
    this.router.get('/configurations', this.listConfigurations.bind(this));
    this.router.post('/configurations', this.createConfiguration.bind(this));
    this.router.get('/configurations/:id', this.getConfiguration.bind(this));
    this.router.put('/configurations/:id', this.updateConfiguration.bind(this));
    this.router.delete('/configurations/:id', this.deleteConfiguration.bind(this));

    // Suggestions endpoint
    this.router.get('/suggestions', this.getSuggestions.bind(this));

    // Conflict detection endpoint
    this.router.post('/conflicts', this.detectConflicts.bind(this));

    // Analytics endpoint
    this.router.get('/analytics', this.getAnalytics.bind(this));

    console.log('[CopilotAPI] Routes initialized');
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req, res) {
    try {
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      
      res.status(200).json({
        status: 'healthy',
        uptime: uptime,
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[CopilotAPI] Health check error:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  }

  /**
   * Get system status
   */
  async getStatus(req, res) {
    try {
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);

      // Get Copilot statistics
      const copilotStats = this.copilot.getStats();

      res.json({
        status: 'running',
        version: '1.0.0',
        uptime: uptime,
        lastRestart: new Date(this.startTime).toISOString(),
        copilot: {
          active: true,
          stats: copilotStats
        },
        endpoint: 'Copilot Core API'
      });
    } catch (error) {
      console.error('[CopilotAPI] Status error:', error);
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * Process natural language input
   */
  async processNaturalLanguage(req, res) {
    try {
      const { input, context } = req.body;

      if (!input) {
        return res.status(400).json({
          success: false,
          error: 'Input is required'
        });
      }

      // Process through Copilot
      const result = this.copilot.process(input, context);

      res.json(result);

    } catch (error) {
      console.error('[CopilotAPI] Process error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * List configurations
   */
  async listConfigurations(req, res) {
    try {
      const { filter, limit, offset } = req.query;

      // In a real implementation, this would query a database
      // For now, return mock data based on recent processing
      const configurations = [];

      res.json({
        success: true,
        configurations: configurations,
        count: configurations.length,
        limit: limit ? parseInt(limit) : 10,
        offset: offset ? parseInt(offset) : 0
      });
    } catch (error) {
      console.error('[CopilotAPI] List configurations error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create configuration
   */
  async createConfiguration(req, res) {
    try {
      const configuration = req.body;

      if (!configuration || !configuration.name) {
        return res.status(400).json({
          success: false,
          error: 'Configuration name is required'
        });
      }

      // In a real implementation, this would save to database
      // For now, just return the configuration with an ID
      const createdConfig = {
        ...configuration,
        id: configuration.id || this.generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      res.status(201).json({
        success: true,
        message: 'Configuration created successfully',
        configuration: createdConfig,
        id: createdConfig.id
      });
    } catch (error) {
      console.error('[CopilotAPI] Create configuration error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get configuration by ID
   */
  async getConfiguration(req, res) {
    try {
      const { id } = req.params;

      // In a real implementation, this would retrieve from database
      res.json({
        success: true,
        configuration: {
          id: id,
          name: 'Sample Configuration',
          version: '1.0.0',
          domain: 'devops',
          // ... other fields
        }
      });
    } catch (error) {
      console.error('[CopilotAPI] Get configuration error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update configuration
   */
  async updateConfiguration(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No updates provided'
        });
      }

      // In a real implementation, this would update in database
      res.json({
        success: true,
        message: 'Configuration updated successfully',
        configuration: {
          id: id,
          ...updates,
          updated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[CopilotAPI] Update configuration error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(req, res) {
    try {
      const { id } = req.params;

      // In a real implementation, this would delete from database
      res.json({
        success: true,
        message: 'Configuration deleted successfully',
        id: id
      });
    } catch (error) {
      console.error('[CopilotAPI] Delete configuration error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get suggestions for a natural language input
   */
  async getSuggestions(req, res) {
    try {
      const { input, context } = req.query;

      if (!input) {
        return res.status(400).json({
          success: false,
          error: 'Input is required'
        });
      }

      // Process through Copilot to get suggestions
      const result = this.copilot.process(input, context);

      res.json({
        success: true,
        suggestions: result.suggestions || [],
        recommendations: result.recommendations || []
      });
    } catch (error) {
      console.error('[CopilotAPI] Get suggestions error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Detect conflicts between configurations
   */
  async detectConflicts(req, res) {
    try {
      const { config1, config2 } = req.body;

      if (!config1 || !config2) {
        return res.status(400).json({
          success: false,
          error: 'Both configurations are required'
        });
      }

      // Use ConflictDetector to detect conflicts
      const conflicts = this.copilot.detectConflicts(config1, config2);

      res.json({
        success: true,
        conflicts: conflicts,
        hasConflicts: conflicts.length > 0,
        severity: this.calculateSeverity(conflicts)
      });
    } catch (error) {
      console.error('[CopilotAPI] Detect conflicts error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get analytics and statistics
   */
  async getAnalytics(req, res) {
    try {
      const { period = '24h' } = req.query;

      // In a real implementation, this would aggregate data from database
      const analytics = {
        period: period,
        totalProcesses: 0,
        successRate: 100,
        avgConfidence: 0,
        conflictsDetected: 0,
        configurationsCreated: 0,
        topDomains: [],
        topPermissions: []
      };

      res.json({
        success: true,
        analytics: analytics
      });
    } catch (error) {
      console.error('[CopilotAPI] Get analytics error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Calculate conflict severity
   */
  calculateSeverity(conflicts) {
    if (conflicts.length === 0) {
      return { level: 'none', score: 0 };
    }

    let totalScore = 0;
    const severityWeights = {
      critical: 10,
      high: 8,
      medium: 5,
      low: 2
    };

    for (const conflict of conflicts) {
      totalScore += severityWeights[conflict.severity] || 0;
    }

    let level = 'none';
    if (totalScore >= 20) {
      level = 'critical';
    } else if (totalScore >= 10) {
      level = 'high';
    } else if (totalScore >= 5) {
      level = 'medium';
    } else if (totalScore > 0) {
      level = 'low';
    }

    return { level, score: totalScore };
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get router
   */
  getRouter() {
    return this.router;
  }
}

module.exports = CopilotAPI;
