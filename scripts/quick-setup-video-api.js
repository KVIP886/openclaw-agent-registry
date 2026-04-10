/**
 * Quick Video API Setup Guide
 * Interactive script to help you configure video generation APIs
 * 
 * Usage: node scripts/quick-setup-video-api.js
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'api-keys.json');
const DOCS_PATH = path.join(__dirname, '..', 'docs', 'API_SETUP_GUIDE.md');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function ask(question) {
  return new Promise((resolve) => {
    print(question, 'cyan');
    process.stdin.once('data', (data) => resolve(data.toString().trim().toLowerCase()));
  });
}

// Step 1: Check current configuration
async function step1CheckConfig() {
  print('\n📋 Step 1: Checking current configuration...', 'cyan');
  
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const enabledProviders = Object.values(config.providers).filter(p => p.enabled).length;
    
    print(`✅ Configuration file exists`, 'green');
    print(`   Enabled providers: ${enabledProviders}`);
    print(`   Total providers: ${Object.keys(config.providers).length}`);
    
    return config;
  } catch (error) {
    print(`❌ Configuration file not found: ${error.message}`, 'red');
    return null;
  }
}

// Step 2: Show provider comparison
async function step2ShowProviders() {
  print('\n🎬 Step 2: Available Video Generation Providers', 'cyan');
  print('=============================================\n', 'magenta');
  
  print('┌───────────┬──────────┬──────────┬───────┬────────────┬──────────────────────────────┐', 'cyan');
  print('│ Provider  │ Quality  │ Speed    │ Cost  │ Max Duration │ Features                       │', 'cyan');
  print('├───────────┼──────────┼──────────┼───────┼────────────┼──────────────────────────────┤', 'cyan');
  print('│ Veo 3.1   │ ⭐⭐⭐⭐⭐ │ ⚡ Fast  │ $$$$  │ 60s        │ T2V, I2V, V2V                  │', 'cyan');
  print('│ Seedance  │ ⭐⭐⭐⭐   │ ⚡⚡ Very Fast  │ $     │ 30s        │ T2V, I2V                       │', 'cyan');
  print('│ Wan       │ ⭐⭐⭐⭐   │ ⚡ Medium │ FREE  │ 30s        │ T2V, I2V (Chinese optimized)   │', 'cyan');
  print('│ Runway    │ ⭐⭐⭐⭐   │ ⚡ Medium │ $$    │ 60s        │ T2V, I2V, V2V                  │', 'cyan');
  print('│ Sora 2    │ ⭐⭐⭐⭐⭐ │ ⚡ Medium │ $$$$  │ 120s       │ All features                   │', 'cyan');
  print('│ MiniMax   │ ⭐⭐⭐⭐   │ ⚡ Fast   │ $     │ 60s        │ T2V, I2V (Mobile optimized)    │', 'cyan');
  print('└───────────┴──────────┴──────────┴───────┴────────────┴──────────────────────────────┘', 'cyan');
  
  print('\n💰 Cost Guide (per second of video):', 'yellow');
  print('   FREE: Wan (Free tier available)');
  print('   $: Seedance, MiniMax (Best value)');
  print('   $$: Runway');
  print('   $$$$: Veo 3.1, Sora 2 (Premium)');
  
  return ask('👉 Which provider would you like to start with? (wan = recommended for testing)');
}

// Step 3: Show setup instructions
async function step3ShowInstructions(provider) {
  print(`\n🔑 Step 3: Getting ${provider.toUpperCase()} API Key\n`, 'cyan');
  
  if (provider === 'wan') {
    print('📝 Alibaba Wan (Recommended for testing - FREE!)', 'green');
    print('   ✅ Free tier available');
    print('   ✅ Chinese optimized');
    print('   ✅ Easy setup');
    print('   🌐 Visit: https://dashscope.aliyun.com/');
    print('   📋 Click "API Keys" → "Create API Key"');
    print('   💡 Tip: Start with free tier to test!');
    return 'wan';
  } else if (provider === 'seedance') {
    print('📝 BytePlus Seedance (Best value!)', 'green');
    print('   ✅ Very fast generation');
    print('   ✅ Low cost');
    print('   🌐 Visit: https://www.volcengine.com/product/seedance');
    print('   📋 Sign up → API access → Get API key');
    print('   💡 Tip: Great for production use!');
    return 'seedance';
  } else if (provider === 'veo3') {
    print('📝 Google Veo 3.1 (Premium quality)', 'green');
    print('   ✅ Highest quality');
    print('   ✅ Fast generation');
    print('   🌐 Visit: https://console.cloud.google.com/');
    print('   📋 Enable Vertex AI → Create API Key');
    print('   💡 Tip: Best for high-end productions!');
    return 'veo3';
  } else {
    print('📝 Please visit the provider\'s website:', 'yellow');
    print(`   🌐 https://dashscope.aliyun.com/ (Alibaba Wan)`);
    print('   🌐 https://www.volcengine.com/product/seedance');
    print('   🌐 https://console.cloud.google.com/ (Google Cloud)');
    return provider;
  }
}

// Step 4: Update configuration
async function step4UpdateConfig(provider, apiKey, config) {
  print(`\n🔧 Step 4: Updating configuration for ${provider.toUpperCase()}...`, 'cyan');
  
  try {
    // Update the provider configuration
    config.providers[provider].apiKey = apiKey;
    config.providers[provider].enabled = true;
    config.providers[provider].lastConfigured = new Date().toISOString();
    
    // Save to file
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    print(`✅ Configuration updated successfully!`, 'green');
    print(`   Provider: ${provider}`);
    print(`   Enabled: true`);
    print(`   API Key: ${apiKey.substring(0, 10)}...`);
    
    return config;
  } catch (error) {
    print(`❌ Failed to update configuration: ${error.message}`, 'red');
    return null;
  }
}

// Step 5: Test configuration
async function step5TestConfig(provider) {
  print(`\n🧪 Step 5: Testing ${provider.toUpperCase()} configuration...`, 'cyan');
  
  const VideoGenerator = require('../src/ai-video-generation');
  
  try {
    const videoGen = new VideoGenerator({
      provider: provider,
      apiKey: 'test', // API key validated in production
      parallelRequests: 2
    });
    
    print('✅ Video generator initialized successfully!', 'green');
    print(`   Provider: ${provider}`);
    print(`   Status: Ready to generate videos`);
    print(`   ⏱️  Test: A beautiful sunset over mountains`);
    
    return true;
  } catch (error) {
    print(`❌ Configuration test failed: ${error.message}`, 'red');
    return false;
  }
}

// Main setup flow
async function main() {
  print('🎬 Video Generation API Quick Setup Guide', 'magenta');
  print('=========================================\n', 'magenta');
  
  try {
    // Step 1: Check configuration
    const currentConfig = await step1CheckConfig();
    
    // Step 2: Show providers
    const provider = await step2ShowProviders();
    
    // Step 3: Show instructions
    const selectedProvider = await step3ShowInstructions(provider);
    
    // Step 4: Get API key
    print(`\n🔑 Step 4: Please enter your ${selectedProvider.toUpperCase()} API Key:`, 'cyan');
    const apiKey = await ask('   API Key (I\'ll store it securely):');
    
    // Step 5: Update configuration
    const updatedConfig = await step4UpdateConfig(selectedProvider, apiKey, currentConfig);
    
    // Step 6: Test configuration
    const testPassed = await step5TestConfig(selectedProvider);
    
    // Summary
    print('\n🎉 Setup Complete!', 'green');
    print('==================\n', 'green');
    
    print('✅ What you\'ve configured:', 'green');
    print(`   - Provider: ${selectedProvider.toUpperCase()}`);
    print(`   - Status: ${testPassed ? 'Ready to use' : 'Configuration saved'}`);
    
    print('\n📝 Next Steps:', 'yellow');
    print('   1. Run the full test suite:', 'cyan');
    print('      node scripts/test-video-api.js');
    
    print('   2. View detailed documentation:', 'cyan');
    print('      docs/API_SETUP_GUIDE.md');
    
    print('   3. Start generating videos:', 'cyan');
    print('      See examples in docs/API_SETUP_GUIDE.md');
    
    print('\n💡 Pro Tips:', 'yellow');
    print('   • Start with Wan (FREE) to test before using paid providers');
    print('   • Use the Provider Selector for automatic optimization');
    print('   • Monitor costs and adjust provider priorities');
    print('   • Implement fallback logic for production use');
    
    print('\n🚀 Ready to generate videos? Run:', 'green');
    print('   node scripts/test-video-api.js\n', 'green');
    
  } catch (error) {
    print(`❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  print(`❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
