# 🎬 Video Generation API Setup Guide

Complete guide to configure and use video generation APIs with the OpenClaw Agent Registry.

## 📋 Supported Providers

| Provider | Quality | Speed | Cost | Max Duration | Features | Best For |
|----------|---------|-------|------|--------------|----------|----------|
| **Veo 3.1** | Highest | Fast | $$$ | 60s | T2V, I2V, V2V | Premium quality |
| **Seedance** | High | Very Fast | $ | 30s | T2V, I2V | Best value |
| **Wan** | High | Medium | Free | 30s | T2V, I2V | Chinese users |
| **Runway** | High | Medium | $$ | 60s | T2V, I2V, V2V | Professional |
| **Sora 2** | Highest | Medium | $$$$ | 120s | All features | Future-proof |
| **MiniMax** | High | Fast | $ | 60s | T2V, I2V | Mobile optimized |

## 🚀 Quick Start

### Step 1: Get API Keys

1. **Google Veo 3.1**: 
   - Sign up at [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Vertex AI API
   - Create API key
   - **Cost**: Highest, $0.002-0.005 per second

2. **BytePlus Seedance**:
   - Visit [Seedance Portal](https://www.volcengine.com/product/seedance)
   - Apply for API access
   - **Cost**: Lowest, $0.0005-0.001 per second
   - **Note**: Best value for money

3. **Alibaba Wan**:
   - Register at [DashScope](https://dashscope.aliyun.com/)
   - Get API key
   - **Cost**: Free tier available
   - **Note**: Chinese optimized

4. **Runway**:
   - Sign up at [RunwayML](https://runwayml.com/)
   - Purchase credits
   - **Cost**: $$, $0.001-0.002 per second
   - **Note**: Professional quality

### Step 2: Configure API Keys

Create/Edit `config/api-keys.json`:

```json
{
  "providers": {
    "veo3": {
      "name": "Google Veo 3.1",
      "apiKey": "YOUR_ACTUAL_GOOGLE_API_KEY_HERE",
      "apiEndpoint": "https://generativelanguage.googleapis.com/v1beta",
      "enabled": true,
      "cost": "highest"
    },
    "seedance": {
      "name": "BytePlus Seedance",
      "apiKey": "YOUR_ACTUAL_SEEDANCE_API_KEY_HERE",
      "apiEndpoint": "https://api.volcengine.com/v1",
      "enabled": true,
      "cost": "low"
    },
    "wan": {
      "name": "Alibaba Wan",
      "apiKey": "YOUR_ACTUAL_ALIBABA_API_KEY_HERE",
      "apiEndpoint": "https://dashscope.aliyun.com/api",
      "enabled": true,
      "cost": "free"
    }
  },
  "globalSettings": {
    "maxRetries": 3,
    "timeoutMs": 30000,
    "fallbackToMultipleProviders": true,
    "healthCheckInterval": 300000
  }
}
```

### Step 3: Install Dependencies

```bash
cd C:\openclaw_workspace\projects\agent-registry
npm install
```

### Step 4: Configure Provider Selector

Create `config/provider-config.js`:

```javascript
module.exports = {
  // Default selection strategy
  strategy: 'balanced', // cost, quality, speed, balanced
  
  // Provider order (fallback chain)
  priority: ['veo3', 'seedance', 'wan', 'runway'],
  
  // Health check settings
  healthCheckInterval: 300000, // 5 minutes
  
  // Load balancing
  loadBalance: true,
  
  // Fallback settings
  maxRetries: 3,
  
  // Cost limits (in $/second)
  costLimits: {
    veo3: 0.005,
    seedance: 0.002,
    wan: 0.001,
    runway: 0.003
  }
};
```

## 💻 Usage Examples

### Example 1: Basic Text-to-Video

```javascript
const VideoGenerator = require('./src/ai-video-generation');
const ProviderSelector = require('./src/provider-selector');

// Initialize with API keys
const videoGen = new VideoGenerator({
  provider: 'veo3',
  apiKey: process.env.VEO3_API_KEY,
  model: 'veo-3.1-generate-preview'
});

const selector = new ProviderSelector(require('./config/provider-config'));

// Generate video
async function createVideo() {
  const bestProvider = selector.selectBestProvider({
    priority: 'quality',
    requirements: {
      maxDuration: 30,
      resolution: '1080p'
    }
  });

  const result = await videoGen.generateTextToVideo(
    'A stunning cyberpunk cityscape at night with neon lights and flying cars',
    {
      duration: 6,
      resolution: '1080p',
      sessionId: 'cyberpunk_demo'
    }
  );

  console.log('✅ Video generated:', result.video.videoUrl);
  console.log('Duration:', result.metadata.duration, 'seconds');
  console.log('Resolution:', result.metadata.resolution);
  console.log('Provider:', result.metadata.provider);
}

createVideo();
```

### Example 2: Image-to-Video

```javascript
async function createImageToVideo() {
  const result = await videoGen.generateImageToVideo(
    'https://example.com/scene.jpg',
    'Camera pans slowly to the right, buildings move in background',
    {
      duration: 8,
      resolution: '1080p'
    }
  );

  console.log('✅ Image-to-video created:', result.video.videoUrl);
}
```

### Example 3: Multi-Provider Fallback

```javascript
async function generateWithFallback() {
  const providers = ['veo3', 'seedance', 'wan'];
  
  for (const provider of providers) {
    try {
      videoGen.config.provider = provider;
      
      const result = await videoGen.generateTextToVideo(
        'Beautiful sunrise over mountains',
        { duration: 6 }
      );
      
      console.log(`✅ Generated using ${provider}:`, result.video.videoUrl);
      break; // Success!
      
    } catch (error) {
      console.warn(`⚠️ ${provider} failed:`, error.message);
      if (provider === providers[providers.length - 1]) {
        throw new Error('All providers failed');
      }
    }
  }
}
```

### Example 4: AI-Assisted Video Generation

```javascript
const QwenAI = require('./src/qwen-ai');

async function createSmartVideo() {
  // Use Qwen AI to generate better prompt
  const qwen = new QwenAI();
  const enhancedPrompt = await qwen.generateVideoPrompt(
    'Make a video of a robot dancing in a neon city',
    {
      style: 'cyberpunk',
      duration: 'long',
      camera: 'dynamic'
    }
  );

  console.log('🎬 Enhanced prompt:', enhancedPrompt);

  // Generate video with enhanced prompt
  const result = await videoGen.generateTextToVideo(
    enhancedPrompt,
    {
      provider: 'seedance',
      duration: 8,
      resolution: '1080p'
    }
  );

  return result;
}
```

## 🔧 Configuration Options

### Video Generation Parameters

```javascript
const options = {
  // Duration in seconds (1-60)
  duration: 6,
  
  // Resolution
  resolution: '1080p', // 720p, 1080p, 2k, 4k
  
  // Quality settings
  quality: 'high', // low, medium, high, ultra
  
  // Motion parameters
  motion: 'smooth', // smooth, dynamic, fast, slow
  
  // Style presets
  style: 'realistic', // realistic, anime, cartoon, cyberpunk
  
  // Aspect ratio
  aspectRatio: '16:9', // 16:9, 9:16, 1:1, 21:9
  
  // Negative prompt
  negativePrompt: 'blurry, low quality, distorted'
};
```

### Provider Selector Strategy

```javascript
// Cost optimization
const costConfig = {
  priority: 'cost',
  costLimits: {
    veo3: 0.005,
    seedance: 0.002,
    wan: 0.001,
    runway: 0.003
  }
};

// Quality focus
const qualityConfig = {
  priority: 'quality',
  costLimits: {
    veo3: 0.01,
    runway: 0.005
  }
};

// Speed focus
const speedConfig = {
  priority: 'speed',
  costLimits: {
    seedance: 0.002,
    wan: 0.001
  }
};

// Balanced (default)
const balancedConfig = {
  priority: 'balanced'
};
```

## 🌐 Environment Variables

Set environment variables for API keys (recommended):

```bash
# Linux/macOS
export VEO3_API_KEY="your_google_api_key"
export SEEDANCE_API_KEY="your_seedance_api_key"
export WAN_API_KEY="your_alibaba_api_key"

# Windows
set VEO3_API_KEY=your_google_api_key
set SEEDANCE_API_KEY=your_seedance_api_key
set WAN_API_KEY=your_alibaba_api_key
```

Or in `.env` file:

```
VEO3_API_KEY=your_google_api_key
SEEDANCE_API_KEY=your_seedance_api_key
WAN_API_KEY=your_alibaba_api_key
RUNWAY_API_KEY=your_runway_api_key
```

## 📊 Monitoring & Health

### Check Provider Status

```javascript
async function checkProviders() {
  const health = await selector.checkAllHealth();
  
  console.log('📊 Provider Health Status:');
  health.forEach(p => {
    console.log(`  ${p.name}: ${p.status} (${p.uptime}% uptime)`);
  });
}
```

### Get Generation Statistics

```javascript
const stats = videoGen.getStatistics();
console.log('📈 Generation Statistics:');
console.log('  Total requests:', stats.totalRequests);
console.log('  Active requests:', stats.activeRequests);
console.log('  Cache hit rate:', stats.cacheHitRate, '%');
console.log('  Avg generation time:', stats.averageGenerationTime, 's');
```

## 🎯 Best Practices

### 1. Start with Free Tier
```javascript
// Use Wan (free) for testing
videoGen.config.provider = 'wan';
const result = await videoGen.generateTextToVideo('test prompt');
```

### 2. Use Provider Selector
```javascript
// Let system choose best provider automatically
const best = selector.selectBestProvider({
  priority: 'balanced',
  requirements: { maxDuration: 30 }
});
```

### 3. Implement Fallback
```javascript
// Try multiple providers
const providers = ['wan', 'seedance', 'veo3'];
for (const p of providers) {
  try {
    videoGen.config.provider = p;
    return await videoGen.generateTextToVideo(prompt);
  } catch (error) {
    continue;
  }
}
```

### 4. Optimize Costs
```javascript
// Set cost limits
selector.config.costLimits = {
  veo3: 0.005,  // Max $0.005/sec
  runway: 0.003 // Max $0.003/sec
};
```

### 5. Cache Results
```javascript
// Cache video generation for reuse
const cacheKey = `video_${requestId}`;
videoGen.cache.set(cacheKey, result);

// Retrieve cached result later
const cached = videoGen.cache.get(cacheKey);
```

## 🐛 Troubleshooting

### Common Issues

**Issue**: API Key Invalid
```
Error: Invalid API key for provider veo3
Solution: Check your API key in config/api-keys.json
```

**Issue**: Provider Unavailable
```
Error: No healthy providers available
Solution: Check provider health status and enable fallback
```

**Issue**: Generation Timeout
```
Error: Request timeout after 30s
Solution: Increase timeout or use faster provider (seedance)
```

**Issue**: Cost Exceeded
```
Error: Cost limit exceeded for veo3
Solution: Adjust costLimits in provider configuration
```

## 🚀 Next Steps

1. ✅ Get API keys from providers
2. ✅ Configure `config/api-keys.json`
3. ✅ Test with free provider (Wan)
4. ✅ Configure provider selector
5. ✅ Implement fallback logic
6. ✅ Monitor usage and costs
7. ✅ Optimize for your use case

## 📚 Resources

- [Google Veo 3.1 Documentation](https://cloud.google.com/vertex-ai/docs)
- [BytePlus Seedance API](https://www.volcengine.com/product/seedance)
- [Alibaba DashScope](https://dashscope.aliyun.com/)
- [RunwayML API](https://docs.runwayml.com/)

---

**Need Help?** Check the [PHASE2_AI_VIDEO_GENERATION.md](./PHASE2_AI_VIDEO_GENERATION.md) for detailed API documentation!

**Current Time**: 2026-04-10 17:10 (Asia/Shanghai)  
**Status**: Ready to integrate! 🎬✨
