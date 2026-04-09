/**
 * AI Video Generation Tests
 * Phase 2: AI Native Development
 */

const VideoGenerator = require('../src/ai-video-generation');
const ProductVideoCreator = require('../src/product-video-automation');
const QwenAI = require('../src/qwen-ai');

describe('AI Video Generation Module', () => {
  
  describe('VideoGenerator', () => {
    let generator;
    
    beforeEach(() => {
      generator = new VideoGenerator({
        provider: 'veo3',
        apiKey: 'test-api-key'
      });
    });
    
    test('should initialize with default config', () => {
      expect(generator.config.provider).toBe('veo3');
      expect(generator.config.parallelRequests).toBe(2);
    });
    
    test('should emit events during generation', async (done) => {
      const onStart = jest.fn();
      const onComplete = jest.fn();
      
      generator.on('start', onStart);
      generator.on('complete', onComplete);
      
      await generator.generateTextToVideo('A beautiful sunset');
      
      expect(onStart).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
      done();
    });
    
    test('should generate text-to-video successfully', async () => {
      const result = await generator.generateTextToVideo('A beautiful sunset');
      
      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.video.videoUrl).toBeDefined();
      expect(result.video.duration).toBeGreaterThan(0);
    });
    
    test('should generate image-to-video successfully', async () => {
      const result = await generator.generateImageToVideo(
        'https://example.com/product.jpg',
        'Camera zooms in on product'
      );
      
      expect(result.success).toBe(true);
      expect(result.metadata.sourceImage).toBe('https://example.com/product.jpg');
    });
    
    test('should cache generation results', async () => {
      const prompt = 'A beautiful sunset';
      const result1 = await generator.generateTextToVideo(prompt);
      const result2 = await generator.generateTextToVideo(prompt);
      
      // Both should return cached result
      expect(result1.requestId).toBe(result2.requestId);
    });
    
    test('should get generation status', async () => {
      const result = await generator.generateTextToVideo('Test video');
      const status = await generator.getGenerationStatus(result.requestId);
      
      expect(status.status).toBe('completed');
      expect(status.result).toBeDefined();
    });
    
    test('should return statistics', () => {
      const stats = generator.getStatistics();
      
      expect(stats.totalRequests).toBeGreaterThanOrEqual(0);
      expect(typeof stats.cacheHitRate).toBe('number');
    });
    
    test('should clear old cache entries', async () => {
      await generator.generateTextToVideo('Video 1');
      await generator.generateTextToVideo('Video 2');
      
      const before = generator.cache.size;
      generator.clearCache(0); // Clear all
      const after = generator.cache.size;
      
      expect(after).toBeLessThan(before);
    });
  });
  
  describe('ProductVideoCreator', () => {
    let creator;
    
    beforeEach(() => {
      creator = new ProductVideoCreator();
    });
    
    test('should initialize with default templates', () => {
      expect(creator.productTemplates.ecommerce).toBeDefined();
      expect(creator.productTemplates.social).toBeDefined();
      expect(creator.productTemplates.ads).toBeDefined();
    });
    
    test('should generate product video successfully', async () => {
      const product = {
        name: 'Premium Wireless Headphones',
        description: 'High-fidelity audio with active noise cancellation',
        price: '$299.99',
        imageUrl: 'https://example.com/headphones.jpg'
      };
      
      const result = await creator.generateProductVideo(product, 'ecommerce');
      
      expect(result.success).toBe(true);
      expect(result.product).toBe('Premium Wireless Headphones');
      expect(result.copy.headline).toBeDefined();
      expect(result.copy.cta).toBeDefined();
    });
    
    test('should generate copywriting for products', async () => {
      const product = {
        name: 'Smart Watch',
        description: 'Fitness tracking and notifications',
        price: '$199.99'
      };
      
      const result = await creator.generateProductVideo(product, 'social');
      
      expect(result.copy.headline).toBeTruthy();
      expect(result.copy.body).toBeTruthy();
      expect(result.copy.cta).toBeTruthy();
    });
    
    test('should handle batch generation', async () => {
      const products = [
        { name: 'Product 1', description: 'Desc 1', price: '$10', imageUrl: 'https://example.com/1.jpg' },
        { name: 'Product 2', description: 'Desc 2', price: '$20', imageUrl: 'https://example.com/2.jpg' },
        { name: 'Product 3', description: 'Desc 3', price: '$30', imageUrl: 'https://example.com/3.jpg' }
      ];
      
      const results = await creator.generateBatchVideos(products, 'social');
      
      expect(results.length).toBe(3);
      expect(results.every(r => r.success)).toBe(true);
    });
    
    test('should track generation statistics', async () => {
      const product = {
        name: 'Test Product',
        description: 'Test',
        price: '$10',
        imageUrl: 'https://example.com/test.jpg'
      };
      
      await creator.generateProductVideo(product);
      
      const stats = creator.getStats();
      
      expect(stats.totalVideos).toBe(1);
      expect(stats.successRate).toBe('100.0');
      expect(stats.averageGenerationTime).toBeGreaterThan(0);
    });
    
    test('should handle errors gracefully', async () => {
      const invalidProduct = {
        name: 'Test',
        description: 'Test',
        price: 'Invalid'
      };
      
      // Missing imageUrl should fail
      await expect(
        creator.generateProductVideo(invalidProduct)
      ).rejects.toThrow();
    });
  });
  
  describe('QwenAI', () => {
    let qwen;
    
    beforeEach(() => {
      qwen = new QwenAI({
        host: 'http://localhost:11434',
        model: 'qwen2.5'
      });
    });
    
    test('should initialize with default config', () => {
      expect(qwen.config.model).toBe('qwen2.5');
      expect(qwen.config.temperature).toBe(0.7);
    });
    
    test('should generate text', async () => {
      const result = await qwen.generate('Write a short poem about technology');
      
      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
    });
    
    test('should generate product headlines', async () => {
      const headline = await qwen.generateHeadline(
        'Premium Headphones',
        'Noise cancellation, 30h battery life'
      );
      
      expect(headline).toBeDefined();
      expect(headline.length).toBeLessThan(100);
    });
    
    test('should generate social media content', async () => {
      const content = await qwen.generateSocialContent({
        name: 'Test Product',
        description: 'Amazing product',
        price: '$99.99'
      });
      
      expect(content.headline).toBeDefined();
      expect(content.content).toBeDefined();
      expect(Array.isArray(content.hashtags)).toBe(true);
    });
    
    test('should generate motion prompts for video', async () => {
      const prompt = await qwen.generateMotionPrompt(
        { name: 'Watch', description: 'Luxury timepiece' },
        'dynamic'
      );
      
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeLessThan(200);
    });
    
    test('should generate multiple variations', async () => {
      const base = 'A stunning smartphone with camera';
      const variations = await qwen.generateVariations(base, 3);
      
      expect(variations.length).toBe(3);
      expect(variations.every(v => typeof v === 'string')).toBe(true);
      
      // Variations should be unique
      const unique = new Set(variations);
      expect(unique.size).toBeGreaterThan(1);
    });
    
    test('should check model availability', async () => {
      const available = await qwen.checkModelAvailability();
      expect(typeof available).toBe('boolean');
    });
  });
});
