/**
 * Qwen AI Module
 * Phase 2: AI Native Development
 * 
 * Uses Qwen 3.6 Plus for AI-powered copywriting and content generation
 * Optimized for local deployment with Ollama
 */

const { Ollama } = require('ollama');class QwenAI {
  constructor(config = {}) {
    this.config = {
      host: config.host || 'http://localhost:11434',
      model: config.model || 'qwen3.6-plus',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2048,
      systemPrompt: config.systemPrompt || 'You are a professional copywriting assistant specializing in product marketing and social media content.'
    };
    
    this.client = new Ollama({ host: this.config.host });
    this.supportedModels = ['qwen3.6-plus', 'qwen3.6', 'qwen2.5', 'llama3'];
  }

  /**
   * Generate AI copywriting
   * @param {string} prompt - User prompt
   * @returns {Promise<Object>} Generated response
   */
  async generate(prompt) {
    try {
      const response = await this.client.chat({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.config.systemPrompt },
          { role: 'user', content: prompt }
        ],
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens
        }
      });
      
      return this._parseResponse(response.message.content);
      
    } catch (error) {
      if (error.code === 'MODEL_NOT_FOUND') {
        console.warn(`Model ${this.config.model} not found. Trying qwen2.5...`);
        this.config.model = 'qwen2.5';
        return this.generate(prompt);
      }
      throw error;
    }
  }

  /**
   * Generate product headline
   * @param {string} productName - Product name
   * @param {string} features - Product features
   * @returns {Promise<string>} Generated headline
   */
  async generateHeadline(productName, features) {
    const prompt = `
Generate a catchy headline for:
Product: ${productName}
Features: ${features}

Requirements:
- Maximum 10 words
- Include emotional trigger
- Highlight unique selling point
- Make it shareable

Output ONLY the headline text.
    `.trim();
    
    const result = await this.generate(prompt);
    return result.headline || result.text;
  }

  /**
   * Generate product description
   * @param {Object} product - Product data
   * @param {string} tone - Tone of voice (professional, casual, enthusiastic)
   * @returns {Promise<string>} Generated description
   */
  async generateDescription(product, tone = 'professional') {
    const prompt = `
Write a product description with ${tone} tone for:
Product: ${product.name}
Price: ${product.price}
Description: ${product.description}
Target Audience: ${product.audience || 'general consumers'}

Requirements:
- Maximum 100 words
- Use persuasive language
- Include key benefits
- End with subtle call-to-action
- No markdown formatting

Output ONLY the description text.
    `.trim();
    
    const result = await this.generate(prompt);
    return result.body || result.text;
  }

  /**
   * Generate social media content
   * @param {Object} product - Product data
   * @returns {Promise<Object>} Social media content
   */
  async generateSocialContent(product) {
    const prompt = `
Generate viral social media content for:
Product: ${product.name}
Description: ${product.description}
Price: ${product.price}

Output format (JSON):
{
  "headline": "Hook (max 5 words)",
  "content": "Main content (max 150 chars)",
  "cta": "Call-to-action",
  "hashtags": ["5-10 relevant hashtags"],
  "emojis": ["3-5 relevant emojis"]
}
    
    `.trim();
    
    return this.generate(prompt);
  }

  /**
   * Generate video motion prompt
   * @param {string} product - Product info
   * @param {string} style - Video style
   * @returns {Promise<string>} Motion prompt
   */
  async generateMotionPrompt(product, style = 'dynamic') {
    const prompt = `
Generate a motion description for AI video generation:
Product: ${product.name}
Description: ${product.description}
Style: ${style}

Requirements:
- Describe camera movement (zoom, pan, rotate)
- Specify lighting changes
- Include product rotation or features showcase
- Make it visually engaging
- Maximum 50 words

Output ONLY the motion description.
    `.trim();
    
    const result = await this.generate(prompt);
    return result.motionDescription || result.text;
  }

  /**
   * Generate multiple variations
   * @param {string} basePrompt - Base prompt
   * @param {number} count - Number of variations
   * @returns {Promise<Array<string>>} Variations
   */
  async generateVariations(basePrompt, count = 3) {
    const variations = [];
    
    for (let i = 0; i < count; i++) {
      const prompt = `
Generate variation ${i + 1} of the following:
${basePrompt}

Make this variation unique by:
- Using different wording
- Focusing on different aspects
- Changing the tone slightly
- Varying the sentence structure
      `.trim();
      
      const result = await this.generate(prompt);
      variations.push(result.text);
      
      // Rate limiting
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return variations;
  }

  /**
   * Check model availability
   * @returns {Promise<boolean>} Available status
   */
  async checkModelAvailability() {
    try {
      const response = await this.client.list();
      const models = response.models.map(m => m.name);
      return models.some(m => m.includes(this.config.model));
    } catch (error) {
      console.error('Error checking model availability:', error);
      return false;
    }
  }

  /**
   * Parse AI response
   * @param {string} text - Raw text response
   * @returns {Object} Parsed response
   */
  _parseResponse(text) {
    // Try to parse as JSON first
    try {
      return JSON.parse(text);
    } catch (e) {
      // If not JSON, extract key fields
      return {
        text,
        headline: this._extractLine(text, /headline:|title:|heading:/i),
        body: this._extractLine(text, /body:|description:|content:/i),
        cta: this._extractLine(text, /cta:|call to action:/i),
        motionDescription: this._extractLine(text, /motion:/i),
        hashtags: this._extractHashtags(text)
      };
    }
  }

  _extractLine(text, regex) {
    const match = text.match(regex);
    return match ? match[0].split(':')[1]?.trim() : null;
  }

  _extractHashtags(text) {
    const matches = text.match(/#[a-zA-Z0-9_]+/g);
    return matches || [];
  }
}

module.exports = QwenAI;
