/**
 * Product Video Automation Script
 * Phase 2: AI Native Development
 * 
 * Automatically generates product videos from images and descriptions
 * Uses AI for copywriting and video generation
 */

const VideoGenerator = require('../ai-video-generation');
const QwenAI = require('../qwen-ai');

class ProductVideoCreator {
  constructor(config = {}) {
    this.videoGenerator = new VideoGenerator(config.videoGenerator || {});
    this.ai = new QwenAI(config.ai || {});
    
    this.productTemplates = {
      ecommerce: {
        duration: 30,
        resolution: '1080p',
        style: 'dynamic',
        music: 'upbeat',
        transitions: 'auto'
      },
      social: {
        duration: 15,
        resolution: '1080p',
        style: 'trending',
        music: 'viral',
        transitions: 'zoom'
      },
      ads: {
        duration: 30,
        resolution: '1080p',
        style: 'professional',
        music: 'corporate',
        transitions: 'smooth'
      }
    };
    
    this.stats = {
      totalVideos: 0,
      totalGenerationTime: 0,
      successRate: 0
    };
  }

  /**
   * Generate product video from image and description
   * @param {Object} product - Product data
   * @param {string} product.imageUrl - Product image URL
   * @param {string} product.name - Product name
   * @param {string} product.description - Product description
   * @param {string} product.price - Product price
   * @param {string} template - Template type (ecommerce, social, ads)
   * @returns {Promise<Object>} Generated video
   */
  async generateProductVideo(product, template = 'ecommerce') {
    const startTime = Date.now();
    const sessionId = `product_${product.name.replace(/\s+/g, '_')}`;
    
    console.log(`🎬 Starting product video generation for: ${product.name}`);
    
    try {
      // Step 1: Generate AI copywriting
      console.log('📝 Generating AI copywriting...');
      const copy = await this._generateCopywriting(product, template);
      
      // Step 2: Generate video with motion
      console.log('🎥 Generating video with AI motion...');
      const video = await this.videoGenerator.generateImageToVideo(
        product.imageUrl,
        copy.motionDescription,
        {
          duration: this.productTemplates[template].duration,
          resolution: this.productTemplates[template].resolution,
          sessionId
        }
      );
      
      // Step 3: Add text overlay (simulated)
      console.log('➕ Adding text overlays...');
      const finalVideo = await this._addTextOverlays(video, copy);
      
      // Update stats
      const generationTime = Date.now() - startTime;
      this.stats.totalVideos++;
      this.stats.totalGenerationTime += generationTime;
      this.stats.successRate = ((this.stats.totalVideos / (this.stats.totalVideos + this.stats.failed)) * 100).toFixed(1);
      
      console.log(`✅ Product video generated in ${generationTime/1000}s`);
      
      return {
        ...finalVideo,
        copy,
        generationTime,
        product: product.name,
        template,
        createdAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Failed to generate video for ${product.name}:`, error);
      this.stats.failed = (this.stats.failed || 0) + 1;
      throw error;
    }
  }

  /**
   * Generate batch of product videos
   * @param {Array<Object>} products - Array of products
   * @param {string} template - Template type
   * @returns {Promise<Array<Object>>} Generated videos
   */
  async generateBatchVideos(products, template = 'ecommerce') {
    const results = [];
    const batchSize = 3; // Process in batches to avoid rate limits
    
    console.log(`🚀 Starting batch generation for ${products.length} products`);
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(products.length/batchSize)}`);
      
      const batchResults = await Promise.allSettled(
        batch.map(p => this.generateProductVideo(p, template))
      );
      
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Failed: ${batch[idx].name}`, result.reason);
        }
      });
      
      // Rate limiting - wait between batches
      if (i + batchSize < products.length) {
        console.log('⏳ Rate limiting - waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`\n✅ Batch generation complete: ${results.length}/${products.length} videos successful`);
    
    return results;
  }

  /**
   * Generate AI copywriting for product
   * @param {Object} product - Product data
   * @param {string} template - Template type
   * @returns {Object} Generated copy
   */
  async _generateCopywriting(product, template) {
    const prompt = `
Generate compelling product copy for:
Product: ${product.name}
Description: ${product.description}
Price: ${product.price}
Target: ${template === 'social' ? 'TikTok/Reels users' : template === 'ads' ? 'Professional buyers' : 'E-commerce shoppers'}

Output format:
{
  "headline": "Catchy headline (max 10 words)",
  "body": "Short persuasive copy (max 50 words)",
  "cta": "Call-to-action",
  "hashtags": ["relevant", "hashtags"],
  "motionDescription": "AI motion prompt for video generation"
}
    `.trim();
    
    const result = await this.ai.generate(prompt);
    
    return {
      headline: result.headline,
      body: result.body,
      cta: result.cta,
      hashtags: result.hashtags,
      motionDescription: result.motionDescription
    };
  }

  /**
   * Add text overlays to video
   * @param {Object} video - Video result
   * @param {Object} copy - Copywriting
   * @returns {Object} Video with overlays
   */
  async _addTextOverlays(video, copy) {
    // Simulated - in production this would use FFmpeg to add overlays
    return {
      ...video,
      overlays: [
        {
          text: copy.headline,
          position: 'top',
          duration: 5
        },
        {
          text: copy.body,
          position: 'middle',
          duration: 10
        },
        {
          text: copy.cta,
          position: 'bottom',
          duration: 5
        }
      ],
      finalSize: video.size + 2 * 1024 * 1024 // +2MB for overlays
    };
  }

  /**
   * Get creator statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageGenerationTime: Math.round(this.stats.totalGenerationTime / this.stats.totalVideos) || 0
    };
  }
}

module.exports = ProductVideoCreator;
