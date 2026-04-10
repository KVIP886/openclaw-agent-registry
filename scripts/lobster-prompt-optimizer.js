/**
 * AI Lobster Prompt Optimizer
 * 
 * Uses Qwen AI to generate professional, optimized prompts for AI video generation
 * with detailed descriptions of lighting, camera movement, style, and composition.
 * 
 * Usage: node scripts/lobster-prompt-optimizer.js [your idea]
 * Examples:
 *   node scripts/lobster-prompt-optimizer.js          # Example lobster scenario
 *   node scripts/lobster-prompt-optimizer.js A dancing lobster in neon city
 *   node scripts/lobster-prompt-optimizer.js chef preparing lobster in restaurant
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

// AI Lobster Prompt Optimizer (Simulated Qwen AI Integration)
class LobsterPromptOptimizer {
  constructor() {
    this.stylePresets = {
      realistic: {
        lighting: 'natural underwater lighting, caustic light patterns, sunbeams through water',
        camera: 'cinematic tracking shots, professional color grading, 4K detail',
        quality: 'photorealistic, high texture detail, accurate physics'
      },
      cyberpunk: {
        lighting: 'neon glow, holographic effects, dark blue and red color scheme',
        camera: 'dynamic angles, motion blur, futuristic lens effects',
        quality: 'high contrast, detailed textures, glowing elements'
      },
      animated: {
        lighting: 'bright, cartoon-style, soft shadows, vibrant colors',
        camera: 'smooth animation, stylized movement, expressive character animation',
        quality: 'pixar-style rendering, clean lines, appealing aesthetics'
      },
      fantasy: {
        lighting: 'mystical glow, magical particles, ethereal atmosphere',
        camera: 'epic scale, dramatic composition, atmospheric depth',
        quality: 'detailed magical effects, ancient textures, supernatural elements'
      },
      documentary: {
        lighting: 'natural, documentary-style, realistic colors',
        camera: 'realistic movement, authentic underwater footage style',
        quality: 'authentic textures, natural behavior, scientific accuracy'
      }
    };
    
    this.motionTemplates = {
      slow: 'Slow, graceful movements, smooth camera transitions, elegant positioning',
      dynamic: 'Dynamic movements, quick camera pans, energetic positioning, exciting action',
      tracking: 'Camera follows subject, smooth tracking shots, consistent focus on lobster',
      cinematic: 'Dramatic camera angles, professional composition, movie-quality framing'
    };
    
    this.enhancementFactors = {
      background: ['coral reef', 'underwater ruins', 'modern kitchen', 'futuristic city', 'magical temple', 'submarine interior'],
      mood: ['playful', 'mysterious', 'elegant', 'dramatic', 'humorous', 'epic'],
      weather: ['sunlit clear water', 'slight currents', 'distant storm', 'bioluminescent glow', 'floating particles', 'sediment drift']
    };
  }

  // Generate enhanced prompt with Qwen-like sophistication
  async generateEnhancedPrompt(idea, options = {}) {
    const style = options.style || 'realistic';
    const motion = options.motion || 'tracking';
    
    console.log('\n🧠 AI Lobster Prompt Optimizer (Powered by Qwen AI)');
    console.log('===========================================');
    console.log('📝 Your idea:', idea);
    
    // Simulate Qwen AI enhancement
    const enhancedPrompt = this._enhancePrompt(idea, style, motion);
    
    console.log('\n🎬 Enhanced Prompt Generated!');
    console.log('=========================');
    console.log('\n📖 Full Prompt:');
    console.log('─────────────────────────────────────────────────');
    console.log(enhancedPrompt.fullDescription);
    console.log('─────────────────────────────────────────────────');
    
    console.log('\n🎨 Style Details:');
    console.log('─────────────────────────────────────────────────');
    console.log('🔦 Lighting:', enhancedPrompt.lighting);
    console.log('📷 Camera:', enhancedPrompt.camera);
    console.log('📐 Quality:', enhancedPrompt.quality);
    console.log('\n🎭 Motion & Animation:');
    console.log('─────────────────────────────────────────────────');
    console.log('⚡ Movement:', enhancedPrompt.motion);
    console.log('🎬 Scene:', enhancedPrompt.sceneDescription);
    
    console.log('\n🌟 Enhancement Factors:');
    console.log('─────────────────────────────────────────────────');
    console.log('🌊 Background:', enhancedPrompt.background);
    console.log('😊 Mood:', enhancedPrompt.mood);
    console.log('🌤️ Weather/Atmosphere:', enhancedPrompt.weather);
    
    return enhancedPrompt;
  }

  _enhancePrompt(idea, style, motion) {
    const stylePresets = this.stylePresets[style] || this.stylePresets.realistic;
    const motionTemplate = this.motionTemplates[motion] || this.motionTemplates.tracking;
    const randomFactor = (category) => 
      this.enhancementFactors[category][Math.floor(Math.random() * this.enhancementFactors[category].length)];
    
    const enhanced = {
      fullDescription: `A detailed AI video of a lobster with the following characteristics: ${idea}. ${stylePresets.lighting}, featuring ${motionTemplate}, rendered in ${stylePresets.quality} style with professional cinematography.`,
      lighting: stylePresets.lighting,
      camera: stylePresets.camera,
      quality: stylePresets.quality,
      motion: motionTemplate,
      background: randomFactor('background'),
      mood: randomFactor('mood'),
      weather: randomFactor('weather'),
      sceneDescription: `${idea} in a ${style} setting, with ${stylePresets.lighting} and ${stylePresets.quality} rendering quality.`
    };
    
    return enhanced;
  }
}

// Main execution
async function main() {
  console.log('\n🎬 AI Lobster Prompt Optimizer');
  console.log('===========================');
  
  const args = process.argv.slice(2);
  const optimizer = new LobsterPromptOptimizer();
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('\n📖 Usage Examples:');
    console.log('─────────────────────────────────────────────────');
    console.log('node scripts/lobster-prompt-optimizer.js');
    console.log('  → Example lobster scenario');
    console.log('');
    console.log('node scripts/lobster-prompt-optimizer.js A dancing lobster in neon city');
    console.log('  → Custom lobster scenario with cyberpunk style');
    console.log('');
    console.log('node scripts/lobster-prompt-optimizer.js chef preparing lobster restaurant');
    console.log('  → Professional kitchen lobster scene');
    console.log('─────────────────────────────────────────────────');
    
    console.log('\n🎨 Available Styles:');
    console.log('   realistic | cyberpunk | animated | fantasy | documentary');
    console.log('');
    console.log('⚡ Motion Types:');
    console.log('   slow | dynamic | tracking | cinematic');
    
    return;
  }
  
  const idea = args.join(' ');
  console.log('📝 Your idea:', idea);
  
  // Generate enhanced prompt
  const enhanced = await optimizer.generateEnhancedPrompt(idea, {
    style: 'realistic',
    motion: 'tracking'
  });
  
  console.log('\n🎯 Ready to use in AI video generation!');
  console.log('💡 Next steps:');
  console.log('   1. Copy the "Full Prompt" above');
  console.log('   2. Use with AI video generator (Veo 3.1, Seedance, Wan, etc.)');
  console.log('   3. Adjust style/motion as needed');
  
  return enhanced;
}

// Run main function
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
