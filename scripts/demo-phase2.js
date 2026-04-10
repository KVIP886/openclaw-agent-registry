/**
 * Phase 2 AI Video Generation Demo
 * Demonstrates the new AI video generation capabilities
 */

const ProductVideoCreator = require('../src/product-video-automation');
const QwenAI = require('../src/qwen-ai');
const VideoGenerator = require('../src/ai-video-generation');

async function runDemo() {
  console.log('🎬 OpenClaw Agent Registry - Phase 2 Demo');
  console.log('=========================================\n');

  // 1. Initialize modules
  console.log('📦 Initializing modules...');
  const creator = new ProductVideoCreator({
    videoGenerator: { provider: 'veo3' },
    ai: { model: 'qwen2.5' }
  });
  console.log('✅ Modules initialized\n');

  // 2. Demo AI Copywriting
  console.log('📝 AI Copywriting Demo');
  console.log('----------------------');
  const product = {
    name: 'Premium Wireless Headphones',
    description: 'High-fidelity audio with active noise cancellation and 30-hour battery life',
    price: '$299.99',
    imageUrl: 'https://example.com/headphones.jpg'
  };

  const copy = await creator._generateCopywriting(product, 'social');
  console.log('Generated Copy:');
  console.log('  Headline:', copy.headline);
  console.log('  Body:', copy.body);
  console.log('  CTA:', copy.cta);
  console.log('  Hashtags:', copy.hashtags.join(', '));
  console.log('  Motion Prompt:', copy.motionDescription);
  console.log('');

  // 3. Demo Product Video Generation
  console.log('🎥 Product Video Generation Demo');
  console.log('----------------------------------');
  try {
    const startTime = Date.now();
    const video = await creator.generateProductVideo(product, 'social');
    const duration = Date.now() - startTime;
    
    console.log('Video Generated Successfully!');
    console.log('  Video URL:', video.video.videoUrl);
    console.log('  Thumbnail:', video.video.thumbnailUrl);
    console.log('  Duration:', video.video.duration, 'seconds');
    console.log('  Resolution:', video.video.resolution);
    console.log('  File Size:', (video.video.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('  Generation Time:', duration, 'ms');
    console.log('  Template:', video.template);
    console.log('');
  } catch (error) {
    console.log('⚠️  Video generation simulated (API not connected)');
    console.log('   In production, this would call Veo 3.1/Seedance API\n');
  }

  // 4. Demo Batch Processing
  console.log('📦 Batch Processing Demo');
  console.log('-------------------------');
  const products = [
    { name: 'Smart Watch', description: 'Fitness tracking', price: '$199', imageUrl: 'https://example.com/watch.jpg' },
    { name: 'Wireless Earbuds', description: 'Crystal clear audio', price: '$149', imageUrl: 'https://example.com/earbuds.jpg' },
    { name: 'Tablet Pro', description: 'Professional tablet', price: '$999', imageUrl: 'https://example.com/tablet.jpg' }
  ];

  console.log(`Processing ${products.length} products...\n`);
  
  for (const p of products) {
    console.log(`  🎬 Generating video for: ${p.name}`);
    try {
      const result = await creator.generateProductVideo(p, 'social');
      console.log(`    ✅ Success - ${Math.round(result.generationTime/1000)}s`);
    } catch (error) {
      console.log(`    ⚠️  Skipped (simulated)`);
    }
  }
  console.log('');

  // 5. Show Statistics
  console.log('📊 Statistics');
  console.log('-------------');
  const stats = creator.getStats();
  console.log('  Total Videos Generated:', stats.totalVideos);
  console.log('  Average Generation Time:', Math.round(stats.averageGenerationTime), 'ms');
  console.log('  Success Rate:', stats.successRate, '%');
  console.log('');

  // 6. Demo Qwen AI
  console.log('🤖 Qwen AI Integration');
  console.log('-----------------------');
  const ai = new QwenAI({ model: 'qwen2.5' });
  
  console.log('Generating product headline...');
  const headline = await ai.generateHeadline('Smart Home Hub', 'Voice control, AI assistant, 100+ device compatibility');
  console.log('  Result:', headline);
  console.log('');

  console.log('Generating motion prompt...');
  const motion = await ai.generateMotionPrompt(
    { name: 'Smart Speaker', description: '360° audio' },
    'rotating'
  );
  console.log('  Result:', motion);
  console.log('');

  // 7. Summary
  console.log('=========================================');
  console.log('🎉 Phase 2 Demo Complete!');
  console.log('=========================================');
  console.log('\n✅ Features Demonstrated:');
  console.log('   • AI-powered copywriting');
  console.log('   • Product video generation');
  console.log('   • Batch processing');
  console.log('   • Motion prompt generation');
  console.log('   • Qwen AI integration');
  console.log('');
  console.log('📚 Next Steps:');
  console.log('   1. Connect to Veo 3.1 API');
  console.log('   2. Add real video rendering');
  console.log('   3. Deploy to production');
  console.log('');
  console.log('📖 Documentation: docs/PHASE2_AI_VIDEO_GENERATION.md');
}

// Run the demo
runDemo().catch(console.error);
