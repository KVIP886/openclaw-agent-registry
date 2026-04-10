/**
 * Intelligent Provider Selector
 * Phase 2: AI Native Development - Smart API Selection
 * 
 * Automatically selects the best video generation provider based on:
 * - Task requirements (duration, resolution, quality)
 * - Cost optimization
 * - API availability and health
 * - Current load balancing
 */

class ProviderSelector {
  constructor(config = {}) {
    this.config = {
      // Provider configurations
      providers: config.providers || [
        {
          id: 'veo3',
          name: 'Google Veo 3.1',
          quality: 'highest',
          speed: 'fast',
          cost: 1, // 1-5 scale, 1=cheapest
          maxDuration: 60,
          maxResolution: '1080p',
          features: ['text-to-video', 'image-to-video', 'video-to-video'],
          health: { status: 'healthy', lastChecked: Date.now(), uptime: 99.9 }
        },
        {
          id: 'seedance',
          name: 'BytePlus Seedance',
          quality: 'high',
          speed: 'very_fast',
          cost: 2,
          maxDuration: 30,
          maxResolution: '1080p',
          features: ['text-to-video', 'image-to-video'],
          health: { status: 'healthy', lastChecked: Date.now(), uptime: 99.5 }
        },
        {
          id: 'wan',
          name: 'Alibaba Wan',
          quality: 'high',
          speed: 'medium',
          cost: 0, // Free
          maxDuration: 30,
          maxResolution: '720p',
          features: ['text-to-video', 'image-to-video'],
          health: { status: 'healthy', lastChecked: Date.now(), uptime: 98.8 },
          chineseOptimized: true
        },
        {
          id: 'runway',
          name: 'Runway Gen4.5',
          quality: 'high',
          speed: 'medium',
          cost: 3,
          maxDuration: 60,
          maxResolution: '1080p',
          features: ['text-to-video', 'image-to-video', 'video-to-video'],
          creativeControl: 'high',
          health: { status: 'healthy', lastChecked: Date.now(), uptime: 99.2 }
        },
        {
          id: 'sora',
          name: 'OpenAI Sora 2',
          quality: 'highest',
          speed: 'medium',
          cost: 4,
          maxDuration: 120,
          maxResolution: '4k',
          features: ['text-to-video', 'image-to-video', 'video-to-video'],
          health: { status: 'healthy', lastChecked: Date.now(), uptime: 99.8 }
        },
        {
          id: 'minimax',
          name: 'MiniMax Hailuo',
          quality: 'high',
          speed: 'fast',
          cost: 2,
          maxDuration: 60,
          maxResolution: '1080p',
          features: ['text-to-video', 'image-to-video'],
          chineseOptimized: true,
          health: { status: 'healthy', lastChecked: Date.now(), uptime: 99.0 }
        }
      ],
      // Selection strategy
      strategy: config.strategy || 'balanced', // cost, quality, speed, balanced
      // Health check settings
      healthCheckInterval: config.healthCheckInterval || 300000, // 5 minutes
      // Load balancing
      loadBalance: config.loadBalance || true,
      // Fallback
      maxRetries: config.maxRetries || 3,
      ...config
    };

    this.availableProviders = new Map();
    this.currentLoad = new Map();
    this.lastSelected = new Map();
    this._initializeProviders();
    this._startHealthChecks();
  }

  /**
   * Select the best provider for a given task
   * @param {Object} taskParams - Task parameters
   * @returns {Object} Best provider info
   */
  selectBestProvider(taskParams) {
    const {
      priority = 'balanced', // cost, quality, speed, balanced
      requirements = {},
      preferredProvider = null
    } = taskParams;

    // If specific provider requested, use it if available
    if (preferredProvider) {
      const provider = this.availableProviders.get(preferredProvider);
      if (provider && this._isHealthy(provider)) {
        return provider;
      }
    }

    // Filter providers by requirements
    const eligible = this.availableProviders.values()
      .filter(provider => this._meetsRequirements(provider, requirements))
      .filter(provider => this._isHealthy(provider));

    if (eligible.length === 0) {
      // Fallback: return first healthy provider
      return this._findFirstHealthy();
    }

    // Score and rank providers
    const scored = eligible.map(provider => ({
      ...provider,
      score: this._calculateScore(provider, priority, taskParams)
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Apply load balancing if enabled
    if (this.config.loadBalance && scored.length > 1) {
      this._applyLoadBalancing(scored);
      scored.sort((a, b) => b.score - a.score);
    }

    // Apply last used preference (to avoid switching providers frequently)
    const lastUsed = this.lastSelected.get(taskParams.sessionId);
    if (lastUsed && scored[0].id === lastUsed) {
      // Keep using same provider for this session
      return scored[0];
    }

    // Return best option
    return scored[0];
  }

  /**
   * Check health of all providers
   * @returns {Array} Health status of all providers
   */
  async checkAllHealth() {
    const healthResults = [];

    for (const [id, provider] of this.availableProviders) {
      const health = await this._checkProviderHealth(provider);
      provider.health = health;
      
      healthResults.push({
        id: provider.id,
        name: provider.name,
        status: health.status,
        uptime: health.uptime,
        lastChecked: health.lastChecked
      });

      if (health.status === 'degraded' || health.status === 'unhealthy') {
        console.warn(`⚠️ Provider ${provider.id} health issue: ${health.status}`);
      }
    }

    return healthResults;
  }

  /**
   * Update provider health status manually
   */
  updateProviderHealth(providerId, healthStatus) {
    const provider = this.availableProviders.get(providerId);
    if (provider) {
      provider.health = {
        ...provider.health,
        status: healthStatus,
        lastChecked: Date.now()
      };
    }
  }

  /**
   * Get all available providers
   */
  getAvailableProviders() {
    return Array.from(this.availableProviders.values())
      .filter(p => this._isHealthy(p));
  }

  /**
   * Add custom provider
   */
  addProvider(providerConfig) {
    const provider = {
      id: providerConfig.id,
      name: providerConfig.name,
      quality: providerConfig.quality || 'medium',
      speed: providerConfig.speed || 'medium',
      cost: providerConfig.cost || 3,
      maxDuration: providerConfig.maxDuration || 30,
      maxResolution: providerConfig.maxResolution || '720p',
      features: providerConfig.features || ['text-to-video'],
      health: {
        status: providerConfig.health?.status || 'healthy',
        lastChecked: Date.now(),
        uptime: providerConfig.health?.uptime || 100
      },
      customConfig: providerConfig.customConfig
    };

    this.availableProviders.set(provider.id, provider);
    console.log(`✅ Added provider: ${provider.id}`);
  }

  // Private methods

  _initializeProviders() {
    this.config.providers.forEach(provider => {
      this.availableProviders.set(provider.id, {
        ...provider,
        currentLoad: 0,
        requestsToday: 0,
        lastRequest: null
      });
    });
  }

  _startHealthChecks() {
    setInterval(() => {
      this.checkAllHealth();
    }, this.config.healthCheckInterval);
  }

  _isHealthy(provider) {
    return provider.health.status === 'healthy' || 
           (provider.health.status === 'degraded' && !this.config.loadBalance);
  }

  _meetsRequirements(provider, requirements) {
    const {
      maxDuration = Infinity,
      resolution = null,
      features = []
    } = requirements;

    // Check duration
    if (maxDuration > provider.maxDuration) {
      return false;
    }

    // Check resolution
    if (resolution && this._resolutionRequires(provider.maxResolution, resolution)) {
      return false;
    }

    // Check features
    if (features.length > 0) {
      const hasAllFeatures = features.every(feature => 
        provider.features.includes(feature)
      );
      if (!hasAllFeatures) {
        return false;
      }
    }

    return true;
  }

  _resolutionRequires(maxResolution, requiredResolution) {
    const resolutionOrder = {
      '720p': 1,
      '1080p': 2,
      '2k': 3,
      '4k': 4,
      '8k': 5
    };

    return resolutionOrder[maxResolution] < resolutionOrder[requiredResolution];
  }

  _calculateScore(provider, priority, taskParams) {
    let score = 0;

    // Quality factor
    const qualityScores = {
      'lowest': 1,
      'low': 2,
      'medium': 3,
      'high': 4,
      'highest': 5
    };
    score += (qualityScores[provider.quality] || 3) * 10;

    // Speed factor
    const speedScores = {
      'very_slow': 1,
      'slow': 2,
      'medium': 3,
      'fast': 4,
      'very_fast': 5
    };
    score += (speedScores[provider.speed] || 3) * 5;

    // Cost factor (inverse - cheaper is better)
    score += (5 - provider.cost) * 8;

    // Load balancing factor
    if (this.config.loadBalance) {
      const currentLoad = provider.currentLoad || 0;
      const loadPenalty = currentLoad * 2;
      score -= loadPenalty;
    }

    // Feature match
    if (taskParams.features) {
      const featureMatch = taskParams.features.filter(f => 
        provider.features.includes(f)
      ).length;
      score += featureMatch * 3;
    }

    // Priority weighting
    const priorityWeights = {
      cost: { quality: 0.5, speed: 0.3, cost: 1.0, load: 0.8 },
      quality: { quality: 1.5, speed: 0.3, cost: 0.3, load: 0.6 },
      speed: { quality: 0.5, speed: 1.5, cost: 0.3, load: 0.4 },
      balanced: { quality: 1.0, speed: 0.8, cost: 1.0, load: 0.7 }
    };

    const weights = priorityWeights[priority] || priorityWeights.balanced;

    score = score * weights.quality + 
            score * weights.speed + 
            score * weights.cost + 
            score * weights.load;

    return score;
  }

  _applyLoadBalancing(scored) {
    // Reduce load on heavily used providers
    const maxLoad = Math.max(...scored.map(p => (p.currentLoad || 0)));
    
    scored.forEach(provider => {
      const load = provider.currentLoad || 0;
      const loadRatio = load / (maxLoad || 1);
      
      // Reduce score if heavily loaded
      if (loadRatio > 0.7) {
        provider.score -= (loadRatio - 0.7) * 20;
      }
    });
  }

  _findFirstHealthy() {
    for (const [, provider] of this.availableProviders) {
      if (this._isHealthy(provider)) {
        return provider;
      }
    }
    throw new Error('No healthy providers available');
  }

  async _checkProviderHealth(provider) {
    try {
      // Simulate health check
      // In production, this would call provider's health endpoint
      const health = {
        status: 'healthy',
        uptime: provider.health.uptime,
        lastChecked: Date.now()
      };

      // Randomly simulate issues for demo
      if (provider.id === 'wan' && Math.random() < 0.1) {
        health.status = 'degraded';
        health.uptime = 95.0;
      }

      return health;
    } catch (error) {
      return {
        status: 'unhealthy',
        uptime: 0,
        lastChecked: Date.now(),
        error: error.message
      };
    }
  }

  updateLoad(providerId, load) {
    const provider = this.availableProviders.get(providerId);
    if (provider) {
      provider.currentLoad = load;
    }
  }

  recordRequest(providerId) {
    const provider = this.availableProviders.get(providerId);
    if (provider) {
      provider.currentLoad = (provider.currentLoad || 0) + 1;
      provider.requestsToday = (provider.requestsToday || 0) + 1;
      provider.lastRequest = Date.now();
    }
  }

  clearLoad(providerId) {
    const provider = this.availableProviders.get(providerId);
    if (provider) {
      provider.currentLoad = 0;
    }
  }
}

module.exports = ProviderSelector;
