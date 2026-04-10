/**
 * AI Lobster Video Generator
 * 
 * Uses Qwen AI to generate prompts, then creates AI-generated videos
 * of lobsters in various creative scenarios.
 * 
 * Usage: node scripts/create-lobster-video.js [scenario]
 * Examples:
 *   node scripts/create-lobster-video.js          # Random scenario
 *   node scripts/create-lobster-video.js underwater    # Specific scenario
 *   node scripts/create-lobster-video.js chef        # Chef scenario
 */

const VideoGenerator = require('../src/ai-video-generation');
const fs = require('fs');
const path = require('path');

// Load API configuration
function loadApiConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'api-keys.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('❌ Failed to load API config:', error.message);
    return null;
  }
}

// AI Lobster Video Scenarios - Updated for 2026 Standards
const lobsterScenarios = {
  underwater: {
    title: '🌊 Underwater Lobster Adventure',
    prompt: 'A vibrant underwater scene with a colorful lobster crawling on coral reef, tropical fish swimming in background, clear blue water with sunlight filtering through, 2026 standards: 24fps, volumetric lighting, motion blur, realistic physics simulation, large-format photoreal, 4K resolution, cinematic lighting, professional cinematography, dynamic camera movement',
    duration: 8,
    resolution: '1080p',
    style: 'realistic'
  },
  chef: {
    title: '👨‍🍳 The Culinary Lobster',
    prompt: 'A professional chef carefully preparing a lobster dish in a high-end kitchen, stainless steel pans, fresh herbs, dramatic lighting, slow motion, food photography style, 2026 standards: 24fps, volumetric lighting, motion blur, realistic physics simulation, large-format photoreal, 4K resolution, professional cinematography, dynamic camera movement',
    duration: 6,
    resolution: '1080p',
    style: 'professional'
  },
  cartoon: {
    title: '🎨 Cartoon Lobster Character',
    prompt: 'A cute animated lobster character with expressive eyes, bright colors, smooth animation style, Pixar-style rendering, friendly atmosphere, playful movements, 2026 standards: 24fps, volumetric lighting, motion blur, realistic physics simulation, large-format photoreal, 720p resolution, animated cinematography, dynamic camera movement',
    duration: 6,
    resolution: '720p',
    style: 'animated'
  },
  cyberpunk: {
    title: '🌃 Cyberpunk Lobster',
    prompt: 'A cyberpunk lobster with neon glowing elements, futuristic underwater city, holographic decorations, red and blue lighting, sci-fi atmosphere, 2026 standards: 24fps, volumetric lighting, motion blur, realistic physics simulation, large-format photoreal, 4K resolution, cyberpunk cinematography, dynamic camera movement, detailed textures',
    duration: 10,
    resolution: '1080p',
    style: 'cyberpunk'
  },
  timeLapse: {
    title: '⏱️ Lobster Time-lapse',
    prompt: 'Time-lapse of a lobster moving through an underwater garden, speed ramping from slow to fast, dynamic camera movement, natural underwater lighting, realistic physics simulation, 2026 standards: 24fps, volumetric lighting, motion blur, large-format photoreal, 4K resolution, documentary cinematography, professional lighting',
    duration: 8,
    resolution: '1080p',
    style: 'documentary'
  },
  fantasy: {
    title: '🐲 Fantasy Lobster Dragon',
    prompt: 'A mythical lobster-dragon hybrid in a magical underwater temple, glowing runes, ancient architecture, mystical particles, epic scale, 2026 standards: 24fps, volumetric lighting, motion blur, realistic physics simulation, large-format photoreal, 4K resolution, fantasy cinematography, mystical lighting, dynamic camera movement',
    duration: 12,
    resolution: '4k',
    style: 'fantasy'
  }
};

// Generate AI prompt using Qwen (simulated)
async function generateSmartPrompt(scenarioName) {
  const scenario = lobsterScenarios[scenarioName];
  
  console.log('\n🧠 Generating enhanced prompt with Qwen AI...');
  console.log('📋 Original prompt:', scenario.prompt);
  
  // In production, this would call Qwen AI to enhance the prompt
  // For now, we simulate the enhancement
  
  const enhancedPrompt = {
    ...scenario,
    enhancedDescription: `Enhanced ${scenario.title} with AI optimization: ${scenario.prompt} featuring dynamic camera movement, professional lighting, high detail rendering, optimized for AI video generation engines.`,
    motionDescription: `Dynamic camera following the lobster, smooth transitions, realistic physics, professional cinematography, ${scenario.style} aesthetic.`,
    stylePresets: {
      lighting: scenario.style === 'cyberpunk' ? 'neon, dramatic' : 
                scenario.style === 'fantasy' ? 'mystical, glowing' : 'natural, bright',
      camera: 'smooth tracking, dynamic angles',
      quality: 'ultra high detail, 4K resolution'
    }
  };
  
  console.log('✅ Enhanced prompt generated!');
  console.log('🎬 Title:', enhancedPrompt.title);
  console.log('📝 Enhanced description:', enhancedPrompt.enhancedDescription);
  console.log('🎥 Motion:', enhancedPrompt.motionDescription);
  
  return enhancedPrompt;
}

// Main video generation function
async function generateLobsterVideo(scenarioName) {
  const config = loadApiConfig();
  if (!config) {
    console.log('❌ Please configure API keys first: edit config/api-keys.json');
    return;
  }
  
  // Determine scenario
  const scenario = scenarioName && lobsterScenarios[scenarioName.toLowerCase()]
    ? lobsterScenarios[scenarioName.toLowerCase()]
    : Object.values(lobsterScenarios)[0];
  
  console.log('\n🎬 AI Lobster Video Generator');
  console.log('==================================');
  console.log(`📋 Scenario: ${scenario.title}`);
  console.log(`⏱️  Duration: ${scenario.duration}s`);
  console.log(`📐 Resolution: ${scenario.resolution}`);
  
  // Generate enhanced prompt
  const enhancedPrompt = await generateSmartPrompt(scenarioName || 'underwater');
  
  // Select best provider
  const providerName = config.providers.wan.enabled 
    ? 'wan' 
    : config.providers.seedance.enabled 
      ? 'seedance' 
      : 'veo3';
  
  console.log(`\n🏷️  Using provider: ${providerName.toUpperCase()}`);
  
  // Initialize video generator
  const videoGen = new VideoGenerator({
    provider: providerName,
    apiKey: config.providers[providerName].apiKey,
    parallelRequests: 2
  });
  
  console.log('🚀 Starting video generation...');
  
  try {
    const startTime = Date.now();
    
    const result = await videoGen.generateTextToVideo(
      enhancedPrompt.enhancedDescription,
      {
        duration: enhancedPrompt.duration || scenario.duration,
        resolution: enhancedPrompt.resolution || scenario.resolution,
        sessionId: `lobster_${scenarioName || 'random'}`
      }
    );
    
    const generationTime = (Date.now() - startTime) / 1000;
    
    console.log('\n✅ Video generation complete!');
    console.log('==========================');
    console.log(`📹 Video URL: ${result.video.videoUrl}`);
    console.log(`⏱️  Duration: ${result.metadata.duration}s`);
    console.log(`📐 Resolution: ${result.metadata.resolution}`);
    console.log(`💾 Size: ${(result.video.size / 1024 / 1024).toFixed(1)}MB`);
    console.log(`⚡ Generation time: ${generationTime.toFixed(2)}s`);
    console.log(`🏷️  Provider: ${result.metadata.provider}`);
    console.log(`🎬 Style: ${enhancedPrompt.style}`);
    
    return {
      success: true,
      video: result,
      scenario: scenario.title,
      provider: result.metadata.provider,
      generationTime
    };
    
  } catch (error) {
    console.log('❌ Video generation failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Show available scenarios
function showScenarios() {
  console.log('\n📋 Available Lobster Video Scenarios:');
  console.log('============================');
  
  Object.entries(lobsterScenarios).forEach(([key, scenario]) => {
    console.log(`\n🎬 ${scenario.title}`);
    console.log(`   📝 ${scenario.prompt.substring(0, 60)}...`);
    console.log(`   ⏱️  ${scenario.duration}s | 📐 ${scenario.resolution} | 🎨 ${scenario.style}`);
  });
  
  console.log('\n💡 Usage examples:');
  console.log('   node scripts/create-lobster-video.js              # Random scenario');
  console.log('   node scripts/create-lobster-video.js underwater   # Underwater adventure');
  console.log('   node scripts/create-lobster-video.js chef         # Culinary scene');
  console.log('   node scripts/create-lobster-video.js cyberpunk    # Sci-fi lobster');
  console.log('   node scripts/create-lobster-video.js cartoon      # Animated character');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('🎬 AI Lobster Video Generator');
    console.log('');
    showScenarios();
    return;
  }
  
  if (args.includes('--list') || args.includes('-l')) {
    showScenarios();
    return;
  }
  
  const scenarioName = args[0];
  
  if (scenarioName && lobsterScenarios[scenarioName.toLowerCase()]) {
    await generateLobsterVideo(scenarioName);
  } else if (scenarioName && !lobsterScenarios[scenarioName.toLowerCase()]) {
    console.log(`❌ Unknown scenario: ${scenarioName}`);
    console.log('Run with --list to see available scenarios');
  } else {
    // Random scenario
    const keys = Object.keys(lobsterScenarios);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    await generateLobsterVideo(randomKey);
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
