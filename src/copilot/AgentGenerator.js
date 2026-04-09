/**
 * Copilot - Agent Generator
 * Created: 2026-04-10 (Week 4 Day 3)
 * Function: Automatic agent configuration generation from templates
 */

class AgentGenerator {
  constructor(options = {}) {
    // Agent templates
    this.templates = this._initializeTemplates();
    
    // Custom templates storage
    this.customTemplates = new Map();
    
    // Generation statistics
    this.stats = {
      totalGenerations: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      avgGenerationTime: 0
    };
    
    // Configuration
    this.config = {
      autoGenerateId: options.autoGenerateId !== false,
      autoSetVersion: options.autoSetVersion !== false,
      validateOutput: options.validateOutput !== false,
      requireDescription: options.requireDescription !== false,
      requireDomain: options.requireDomain !== false,
      defaultAuthor: options.defaultAuthor || 'system'
    };

    console.log('[AgentGenerator] Initialized');
    console.log('[AgentGenerator] Templates loaded:', this.templates.length);
    console.log('[AgentGenerator] Config:', this.config);
  }

  /**
   * Initialize system templates
   */
  _initializeTemplates() {
    return [
      {
        id: 'default',
        name: 'Default Agent',
        description: 'Basic agent configuration',
        fields: {
          version: '1.0.0',
          status: 'testing',
          permissions: ['agent:read', 'agent:health'],
          services: [],
          metadata: {
            createdVia: 'template:default'
          }
        },
        defaults: {
          author: 'system'
        }
      },
      {
        id: 'devops',
        name: 'DevOps Agent',
        description: 'DevOps operations agent',
        fields: {
          version: '1.0.0',
          status: 'testing',
          domain: 'devops',
          permissions: ['agent:read', 'agent:deploy', 'agent:monitor', 'code:analyze'],
          services: ['deployment', 'monitoring'],
          metadata: {
            createdVia: 'template:devops'
          }
        },
        defaults: {
          author: 'system'
        }
      },
      {
        id: 'monitoring',
        name: 'Monitoring Agent',
        description: 'System monitoring and alerting agent',
        fields: {
          version: '1.0.0',
          status: 'testing',
          domain: 'monitoring',
          permissions: ['health:status', 'alert:trigger', 'notification:send', 'agent:read'],
          services: ['monitoring', 'alerting'],
          metadata: {
            createdVia: 'template:monitoring'
          }
        },
        defaults: {
          author: 'system'
        }
      },
      {
        id: 'analytics',
        name: 'Analytics Agent',
        description: 'Data analysis and reporting agent',
        fields: {
          version: '1.0.0',
          status: 'testing',
          domain: 'analytics',
          permissions: ['data:read', 'data:analyze', 'report:generate'],
          services: ['analytics', 'reporting'],
          metadata: {
            createdVia: 'template:analytics'
          }
        },
        defaults: {
          author: 'system'
        }
      },
      {
        id: 'dev',
        name: 'Developer Agent',
        description: 'Development and testing agent',
        fields: {
          version: '1.0.0',
          status: 'testing',
          domain: 'devops',
          permissions: ['agent:read', 'agent:create', 'agent:deploy', 'code:analyze', 'agent:test'],
          services: ['development', 'testing'],
          metadata: {
            createdVia: 'template:dev'
          }
        },
        defaults: {
          author: 'system'
        }
      },
      {
        id: 'readonly',
        name: 'Read-only Agent',
        description: 'Read-only access agent',
        fields: {
          version: '1.0.0',
          status: 'testing',
          permissions: ['agent:read', 'health:status', 'audit:read'],
          services: [],
          metadata: {
            createdVia: 'template:readonly'
          }
        },
        defaults: {
          author: 'system'
        }
      }
    ];
  }

  /**
   * Generate agent configuration from input
   * @param {Object} input - Input data
   * @param {Object} options - Generation options
   * @returns {Object} Generation result
   */
  generate(input, options = {}) {
    const startTime = Date.now();

    try {
      // Validate input
      if (!input || !input.name) {
        return {
          success: false,
          error: 'Missing required field: name',
          generationTime: Date.now() - startTime
        };
      }

      // Determine template to use
      const template = this._selectTemplate(input, options.template);

      // Generate configuration
      const configuration = this._generateFromTemplate(input, template, options);

      // Validate configuration
      const validation = this._validateConfiguration(configuration);
      if (!validation.valid) {
        return {
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
          generationTime: Date.now() - startTime
        };
      }

      // Calculate generation time
      const generationTime = Date.now() - startTime;
      
      // Update statistics
      this.stats.totalGenerations++;
      this.stats.successfulGenerations++;
      this._updateAverageGenerationTime(generationTime);

      console.log(`[AgentGenerator] ✅ Generated agent "${configuration.name}" in ${generationTime}ms`);

      return {
        success: true,
        configuration,
        template: template?.id || 'custom',
        generationTime,
        validation
      };

    } catch (error) {
      console.error('[AgentGenerator] Error generating agent:', error);
      
      this.stats.totalGenerations++;
      this.stats.failedGenerations++;
      
      return {
        success: false,
        error: error.message,
        generationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Select appropriate template
   */
  _selectTemplate(input, specifiedTemplate) {
    // Use specified template if provided
    if (specifiedTemplate) {
      const template = this.templates.find(t => t.id === specifiedTemplate);
      if (template) {
        return template;
      }
      
      // Check custom templates
      const custom = this.customTemplates.get(specifiedTemplate);
      if (custom) {
        return custom;
      }
      
      // Fall back to default
      return this.templates.find(t => t.id === 'default');
    }

    // Auto-select based on input
    const domain = input.domain || input.metadata?.domain;
    if (domain) {
      const template = this.templates.find(t => t.fields?.domain === domain);
      if (template) {
        return template;
      }
    }

    // Check services
    const services = input.services || input.metadata?.services;
    if (services && Array.isArray(services)) {
      if (services.includes('monitoring') || services.includes('alerting')) {
        return this.templates.find(t => t.id === 'monitoring');
      } else if (services.includes('analytics') || services.includes('reporting')) {
        return this.templates.find(t => t.id === 'analytics');
      } else if (services.includes('development') || services.includes('testing')) {
        return this.templates.find(t => t.id === 'dev');
      } else if (services.includes('deployment') || services.includes('monitoring')) {
        return this.templates.find(t => t.id === 'devops');
      }
    }

    // Check permissions
    const permissions = input.permissions || input.metadata?.permissions;
    if (permissions && Array.isArray(permissions)) {
      if (permissions.length === 0) {
        return this.templates.find(t => t.id === 'readonly');
      } else if (permissions.includes('code:analyze') || permissions.includes('agent:deploy')) {
        return this.templates.find(t => t.id === 'dev');
      } else if (permissions.includes('agent:deploy')) {
        return this.templates.find(t => t.id === 'devops');
      }
    }

    // Default fallback
    return this.templates.find(t => t.id === 'default');
  }

  /**
   * Generate configuration from template
   */
  _generateFromTemplate(input, template, options) {
    // Base configuration from template
    let config = JSON.parse(JSON.stringify(template.fields));

    // Apply user-provided values
    if (input.name) config.name = input.name;
    if (input.description) config.description = input.description;
    if (input.version) config.version = input.version;
    if (input.domain) config.domain = input.domain;
    if (input.author) config.author = input.author;
    if (input.permissions) config.permissions = input.permissions;
    if (input.services) config.services = input.services;
    if (input.status) config.status = input.status;
    if (input.metadata) config.metadata = { ...config.metadata, ...input.metadata };

    // Apply defaults
    if (template.defaults) {
      for (const [key, value] of Object.entries(template.defaults)) {
        if (config[key] === undefined) {
          config[key] = value;
        }
      }
    }

    // Apply auto-generation
    if (this.config.autoGenerateId && !config.id) {
      config.id = this._generateAgentId(config.name, config.domain);
    }

    if (this.config.autoSetVersion && !config.version) {
      config.version = template.fields.version || '1.0.0';
    }

    if (this.config.defaultAuthor && !config.author) {
      config.author = this.config.defaultAuthor;
    }

    // Merge with options
    if (options && options.overrides) {
      for (const [key, value] of Object.entries(options.overrides)) {
        if (value !== undefined) {
          config[key] = value;
        }
      }
    }

    // Ensure ID
    if (!config.id) {
      config.id = this._generateAgentId(config.name, config.domain);
    }

    // Ensure name
    if (!config.name) {
      config.name = this._generateName(config.domain);
    }

    return config;
  }

  /**
   * Generate agent ID
   */
  _generateAgentId(name, domain) {
    let baseName = name.toLowerCase()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+$/, '')
      .substring(0, 20);

    // Add domain prefix if available
    if (domain) {
      baseName = `${domain}-${baseName}`;
    }

    // Add counter if ID exists
    let counter = 1;
    let id = baseName + '-00' + counter;
    
    while (this._idExists(id)) {
      counter++;
      id = baseName + '-' + counter.toString().padStart(3, '0');
    }

    return id;
  }

  /**
   * Generate agent name
   */
  _generateName(domain) {
    const domainNames = {
      devops: 'DevOps Agent',
      monitoring: 'Monitoring Agent',
      analytics: 'Analytics Agent',
      general: 'General Agent'
    };

    return domainNames[domain] || 'Unnamed Agent';
  }

  /**
   * Check if ID exists (would check actual registry)
   */
  _idExists(id) {
    // In production, this would query the actual agent registry
    // For now, return false
    return false;
  }

  /**
   * Validate configuration
   */
  _validateConfiguration(config) {
    const errors = [];

    // Required fields
    if (!config.name) {
      errors.push('Name is required');
    }

    if (!config.id) {
      errors.push('ID is required');
    }

    if (!config.version) {
      if (this.config.requireVersion) {
        errors.push('Version is required');
      }
    } else if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(config.version)) {
      errors.push('Invalid version format: ' + config.version);
    }

    // Domain validation
    const validDomains = ['devops', 'analytics', 'monitoring', 'operations', 'general'];
    if (config.domain && !validDomains.includes(config.domain)) {
      errors.push(`Invalid domain: ${config.domain}. Valid: ${validDomains.join(', ')}`);
    }

    // Permissions validation
    if (config.permissions && !Array.isArray(config.permissions)) {
      errors.push('Permissions must be an array');
    }

    // Services validation
    if (config.services && !Array.isArray(config.services)) {
      errors.push('Services must be an array');
    }

    // Name length
    if (config.name && config.name.length > 100) {
      errors.push('Name exceeds maximum length of 100 characters');
    }

    // ID length
    if (config.id && config.id.length > 50) {
      errors.push('ID exceeds maximum length of 50 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Update average generation time
   */
  _updateAverageGenerationTime(generationTime) {
    const alpha = 0.1; // Smoothing factor
    this.stats.avgGenerationTime = 
      alpha * generationTime + (1 - alpha) * this.stats.avgGenerationTime;
  }

  /**
   * Register custom template
   * @param {Object} template - Template definition
   * @returns {Object} Result
   */
  registerCustomTemplate(template) {
    const { id, name, description, fields, defaults } = template;

    if (!id) {
      return {
        success: false,
        error: 'Template ID is required'
      };
    }

    if (this.customTemplates.has(id)) {
      return {
        success: false,
        error: `Template with ID "${id}" already exists`
      };
    }

    const customTemplate = {
      id,
      name,
      description,
      fields: JSON.parse(JSON.stringify(fields || {})),
      defaults: defaults || {},
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    this.customTemplates.set(id, customTemplate);

    console.log(`[AgentGenerator] ✅ Registered custom template: ${id}`);

    return {
      success: true,
      template: customTemplate
    };
  }

  /**
   * Get available templates
   * @param {string} type - Template type (system, custom, all)
   * @returns {Array} Template list
   */
  getTemplates(type = 'all') {
    const result = [];

    if (type === 'all' || type === 'system') {
      result.push(...this.templates.map(t => ({
        ...t,
        type: 'system'
      })));
    }

    if (type === 'all' || type === 'custom') {
      for (const [id, template] of this.customTemplates) {
        result.push({
          ...template,
          type: 'custom'
        });
      }
    }

    return result;
  }

  /**
   * Get template by ID
   */
  getTemplate(id) {
    const systemTemplate = this.templates.find(t => t.id === id);
    if (systemTemplate) {
      return { ...systemTemplate, type: 'system' };
    }

    const customTemplate = this.customTemplates.get(id);
    if (customTemplate) {
      return { ...customTemplate, type: 'custom' };
    }

    return null;
  }

  /**
   * Get generation statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalTemplates: this.templates.length + this.customTemplates.size,
      systemTemplates: this.templates.length,
      customTemplates: this.customTemplates.size
    };
  }

  /**
   * Generate sample configurations
   */
  generateSamples() {
    const samples = [];

    for (const template of this.templates) {
      const sample = {
        input: {
          name: `${template.name} Example`,
          description: `Example of a ${template.name}`,
          domain: template.fields.domain
        },
        template: template.id
      };

      const result = this.generate(sample.input, { template: sample.template });
      if (result.success) {
        samples.push({
          template: sample.template,
          result: result.configuration,
          notes: template.description
        });
      }
    }

    return samples;
  }
}

module.exports = AgentGenerator;
