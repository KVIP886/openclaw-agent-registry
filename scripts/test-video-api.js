/**
 * Video API Configuration Test Script
 * Tests video generation with all supported providers
 * 
 * Usage: node scripts/test-video-api.js [provider]
 * Examples:
 *   node scripts/test-video-api.js           # Test all providers
 *   node scripts/test-video-api.js veo3      # Test specific provider
 */

const VideoGenerator = require('../src/ai-video-generation');
const ProviderSelector = require('../src/provider-selector');
const fs = require('fs');
const path = require('path');

// Load API keys configuration
function loadApiKeys() {
  const configPath = path.join(__dirname, '..', 'config', 'api-keys.json');
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.providers;
  } catch (error) {
    console.error('❌ Failed to load API keys:', error.message);
    console.log('📝 Please edit config/api-keys.json and add your API keys');
    return null;
  }
}

// Load provider selector configuration
function loadProviderConfig() {
  try {
    return require('../config/provider-config.js');
  } catch (error) {
    console.log('⚠️  No provider config found, using defaults');
    return {
      strategy: 'balanced',
      priority: ['veo3', 'seedance', 'wan', 'runway'],
      loadBalance: true,
      maxRetries: 3
    };
  }
}

// Test a single provider
async function testProvider(providerId, apiKey, providerSelector) {
  console.log(`\n🎬 Testing ${providerId}...`);
  console.log(`   Status: ${apiKey.enabled ? '🟢 Enabled' : '🔴 Disabled'}`);
  
  if (!apiKey.enabled) {
    console.log('   ⏭️  Skipping disabled provider');
    return;
  }

  try {
    // Initialize video generator
    const videoGen = new VideoGenerator({
      provider: providerId,
      apiKey: apiKey.apiKey,
      parallelRequests: 2
    });

    // Select best provider
    const bestProvider = providerSelector.selectBestProvider({
      priority: 'balanced',
      requirements: {
        maxDuration: 30,
        resolution: '1080p'
      }
    });

    console.log(`   Selected: ${bestProvider.name}`);
    console.log(`   Expected Speed: ${bestProvider.speed}`);
    console.log(`   Expected Quality: ${bestProvider.quality}`);
    console.log(`   Cost: ${bestProvider.cost}/5`);

    // Test video generation
    console.log('   🎯 Test prompt: "A beautiful sunset over mountains"');
    
    const startTime = Date.now();
    
    const result = await videoGen.generateTextToVideo(
      'A beautiful sunset over mountains with orange and pink sky',
      {
        duration: 6,
        resolution: '1080p',
        sessionId: 'test_video_api'
      }
    );

    const duration = (Date.now() - startTime) / 1000;
    
    console.log('   ✅ SUCCESS!');
    console.log(`   ⏱️  Generation time: ${duration.toFixed(2)}s`);
    console.log(`   📹 Video URL: ${result.video.videoUrl}`);
    console.log(`   ⏱️  Duration: ${result.metadata.duration}s`);
    console.log(`   📐 Resolution: ${result.metadata.resolution}`);
    console.log(`   💾 Size: ${(result.video.size / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   🏷️  Provider: ${result.metadata.provider}`);
    
    return {
      success: true,
      provider: providerId,
      duration,
      result
    };
    
  } catch (error) {
    console.log('   ❌ FAILED');
    console.log(`   Error: ${error.message}`);
    return {
      success: false,
      provider: providerId,
      error: error.message
    };
  }
}

// Test all providers
async function testAllProviders() {
  console.log('🎬 Video Generation API Test Suite');
  console.log('===================================\n');
  
  const apiKeys = loadApiKeys();
  if (!apiKeys) return;
  
  const providerConfig = loadProviderConfig();
  const providerSelector = new ProviderSelector(providerConfig);
  
  let results = [];
  
  // Test each provider
  for (const [providerId, config] of Object.entries(apiKeys)) {
    const result = await testProvider(providerId, config, providerSelector);
    results.push(result);
    
    // Wait a bit between providers
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successCount}/${results.length}`);
  console.log(`❌ Failed: ${failCount}/${results.length}`);
  
  console.log('\n🏆 Provider Rankings:');
  results
    .filter(r => r.success)
    .sort((a, b) => a.duration - b.duration)
    .forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.provider}: ${r.duration.toFixed(2)}s`);
    });
  
  if (failCount > 0) {
    console.log('\n⚠️  Failed Providers:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.provider}: ${r.error}`);
      });
  }
  
  console.log('\n📝 Next Steps:');
  console.log('   1. Edit config/api-keys.json with your actual API keys');
  console.log('   2. Enable providers by setting "enabled": true');
  console.log('   3. Re-run this test to verify working configuration');
  
  return results;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('📖 Video API Test Script');
    console.log('');
    console.log('Usage: node scripts/test-video-api.js [provider]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h    Show this help message');
    console.log('  provider      Test specific provider (veo3, seedance, wan, runway)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/test-video-api.js           # Test all providers');
    console.log('  node scripts/test-video-api.js veo3      # Test specific provider');
    return;
  }
  
  if (args.length > 0) {
    // Test specific provider
    const providerId = args[0];
    const apiKeys = loadApiKeys();
    
    if (!apiKeys || !apiKeys[providerId]) {
      console.log(`❌ Provider ${providerId} not found in config`);
      return;
    }
    
    const providerConfig = loadProviderConfig();
    const providerSelector = new ProviderSelector(providerConfig);
    
    await testProvider(providerId, apiKeys[providerId], providerSelector);
  } else {
    // Test all providers
    await testAllProviders();
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
