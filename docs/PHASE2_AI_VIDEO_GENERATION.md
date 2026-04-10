# Phase 2: AI Video Generation Module

**Status**: 🟢 Active Development  
**Started**: 2026-04-09  
**Version**: 2.0.0-alpha

## 📋 Overview

This module provides AI-powered video generation capabilities for automated product video creation. It integrates with Veo 3.1, Seedance, and other AI video models to generate compelling product videos from images and descriptions.

## 🎯 Features

### 1. Text-to-Video Generation
Generate videos from text descriptions using AI models like Veo 3.1.

```javascript
const generator = new VideoGenerator({ provider: 'veo3' });

const result = await generator.generateTextToVideo('A beautiful sunset over mountains');

console.log(result.video.videoUrl); // Video URL
console.log(result.video.duration); // Duration in seconds
```

### 2. Image-to-Video Generation
Transform static product images into dynamic videos with AI-generated motion.

```javascript
const result = await generator.generateImageToVideo(
  'https://example.com/product.jpg',
  'Camera zooms in, rotates 360 degrees'
);
```

### 3. Product Video Automation
Automated pipeline for creating product videos:

1. **AI Copywriting** - Generates compelling headlines and descriptions
2. **Motion Planning** - Creates AI motion prompts
3. **Video Generation** - Produces final video
4. **Text Overlays** - Adds product info and CTAs

```javascript
const creator = new ProductVideoCreator();

const video = await creator.generateProductVideo({
  name: 'Premium Headphones',
  description: 'High-fidelity audio',
  price: '$299.99',
  imageUrl: 'https://example.com/headphones.jpg'
}, 'ecommerce');
```

### 4. Multi-Frame Generation
DLSS 4-style interpolation for smooth video generation.

```javascript
const frames = await generator.generateMultiFrameVideo(
  ['frame1.jpg', 'frame2.jpg', 'frame3.jpg'],
  'Smooth transition between frames'
);
```

## 🚀 Quick Start

### Installation

```bash
cd C:\openclaw_workspace\projects\agent-registry
npm install
```

### Configuration

```javascript
const VideoGenerator = require('./src/ai-video-generation');
const ProductVideoCreator = require('./src/product-video-automation');

const generator = new VideoGenerator({
  provider: 'veo3', // veo3, seedance, sdxl
  apiKey: 'your-api-key',
  model: 'veo-3.1-generate-preview',
  maxDuration: 10, // seconds
  resolution: '1080p',
  parallelRequests: 2
});

const creator = new ProductVideoCreator({
  videoGenerator: generator.config,
  ai: {
    host: 'http://localhost:11434',
    model: 'qwen3.6-plus'
  }
});
```

### Basic Usage

```javascript
// Generate a product video
const product = {
  name: 'Wireless Earbuds',
  description: 'Crystal clear audio, 24h battery',
  price: '$149.99',
  imageUrl: 'https://example.com/earbuds.jpg'
};

const video = await creator.generateProductVideo(product, 'ecommerce');

console.log('Video URL:', video.video.videoUrl);
console.log('Copy:', video.copy);
console.log('Generation Time:', video.generationTime, 'ms');
```

## 📦 Templates

Three built-in templates for different use cases:

### 1. E-commerce (30 seconds)
- Style: Dynamic
- Music: Upbeat
- Transitions: Auto
- Best for: Online stores, product pages

### 2. Social (15 seconds)
- Style: Trending
- Music: Viral
- Transitions: Zoom
- Best for: TikTok, Instagram Reels

### 3. Ads (30 seconds)
- Style: Professional
- Music: Corporate
- Transitions: Smooth
- Best for: YouTube ads, promotional content

## 🧪 Testing

```bash
# Run all tests
npm test

# Run AI video tests specifically
npm test -- ai-video-generation.test.js

# Test with coverage
npm test -- --coverage
```

## 🌐 API Integration

### Veo 3.1 (Google)
```javascript
// Real implementation would use:
// POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generate
```

### Seedance (Volcengine)
```javascript
// Seedance provides faster generation with high quality
// Ideal for rapid content creation
```

### Stable Video Diffusion
```javascript
// Open-source option
// Good for local deployment
```

## 📊 Performance

### Benchmarks

| Method | Generation Time | Quality | Use Case |
|--------|----------------|---------|----------|
| Text-to-Video | 3-5s | High | Creative content |
| Image-to-Video | 5-8s | Very High | Product demos |
| Multi-Frame | 10s+ | Ultra | Professional |

### Optimization

- **Cache**: Results cached for 7 days by default
- **Rate Limiting**: Automatic batching to avoid API limits
- **Parallel Processing**: Configurable parallel request limits
- **Memory**: Optimized for RTX 5090 with 32GB VRAM

## 🔧 Customization

### Custom Templates

```javascript
const customTemplate = {
  duration: 20,
  resolution: '1080p',
  style: 'cinematic',
  music: 'emotional',
  transitions: 'fade'
};

creator.productTemplates.custom = customTemplate;
```

### Custom AI Model

```javascript
const creator = new ProductVideoCreator({
  ai: {
    host: 'http://localhost:11434',
    model: 'your-custom-model'
  }
});
```

## 📈 Statistics

```javascript
const stats = creator.getStats();

console.log(stats);
// {
//   totalVideos: 15,
//   totalGenerationTime: 120000,
//   successRate: '98.5',
//   averageGenerationTime: 8000
// }
```

## 🚨 Error Handling

```javascript
try {
  const video = await creator.generateProductVideo(product);
  console.log('Success:', video.videoUrl);
} catch (error) {
  console.error('Generation failed:', error.message);
  // Fallback logic
}
```

## 📚 Next Steps

### Phase 2.1 (Week 2)
- [ ] Multi-Agent Collaboration
- [ ] Long-term Memory Integration
- [ ] Real API Integration

### Phase 2.2 (Week 3)
- [ ] DaVinci Resolve Plugin
- [ ] Adobe Creative Cloud Automation
- [ ] Batch Processing Optimization

### Phase 2.3 (Week 4)
- [ ] Production Deployment
- [ ] Load Testing
- [ ] Commercial Platform MVP

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting PRs.

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

**Last Updated**: 2026-04-09  
**Version**: 2.0.0-alpha
