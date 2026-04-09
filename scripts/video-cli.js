/**
 * Video Generation CLI Tool
 * Phase 2: AI Native Development
 * 
 * Command line interface for managing video generation tasks
 * 
 * Usage:
 *   node scripts/video-cli.js generate "description" --provider veo3
 *   node scripts/video-cli.js status <taskId>
 *   node scripts/video-cli.js list
 *   node scripts/video-cli.js cancel <taskId>
 *   node scripts/video-cli.js health
 */

const AsyncVideoGenerator = require('../src/ai-video-generation/async-generator');
const { v4: uuidv4 } = require('uuid');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    printHelp();
    return;
  }

  const generator = new AsyncVideoGenerator();

  switch (command) {
    case 'generate':
      await handleGenerate(generator, args.slice(1));
      break;

    case 'status':
      await handleStatus(generator, args[1]);
      break;

    case 'list':
      await handleList(generator, args);
      break;

    case 'cancel':
      await handleCancel(generator, args[1]);
      break;

    case 'health':
      await handleHealth(generator);
      break;

    case 'wait':
      await handleWait(generator, args[1], args[2]);
      break;

    case 'demo':
      await handleDemo(generator);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      printHelp();
  }
}

// Command handlers

async function handleGenerate(generator, args) {
  const prompt = args[0];
  
  if (!prompt) {
    console.error('❌ Prompt required');
    console.log('Usage: node scripts/video-cli.js generate "description" [options]');
    return;
  }

  // Parse options
  const options = {
    provider: null,
    duration: null,
    resolution: null
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--provider':
        options.provider = args[++i];
        break;
      case '--duration':
        options.duration = parseInt(args[++i]);
        break;
      case '--resolution':
        options.resolution = args[++i];
        break;
      default:
        break;
    }
  }

  console.log(`🚀 Generating video...`);
  console.log(`   Prompt: "${prompt}"`);
  console.log(`   Provider: ${options.provider || 'auto-select'}`);
  console.log('');

  try {
    const taskId = await generator.generateTextToVideo(prompt, options);
    
    console.log(`✅ Task created!`);
    console.log(`   Task ID: ${taskId.taskId}`);
    console.log(`   Status: ${taskId.status}`);
    console.log(`   Estimated time: ${taskId.estimatedTime}`);
    console.log('');
    console.log(`💡 Use "node scripts/video-cli.js status ${taskId.taskId}" to check progress`);
    console.log(`   Or "node scripts/video-cli.js wait ${taskId.taskId}" to wait for completion`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function handleStatus(generator, taskId) {
  if (!taskId) {
    console.error('❌ Task ID required');
    console.log('Usage: node scripts/video-cli.js status <taskId>');
    return;
  }

  console.log(`📊 Checking status of task ${taskId}...`);
  console.log('');

  try {
    const status = await generator.getStatus(taskId);

    if (status.status === 'not_found') {
      console.log('❌ Task not found');
      return;
    }

    console.log(`   Task ID: ${status.taskId}`);
    console.log(`   Status: ${status.status.toUpperCase()}`);
    console.log(`   Type: ${status.params?.type || 'text-to-video'}`);
    console.log(`   Provider: ${status.params?.provider || 'auto'}`);
    console.log(`   Progress: ${status.progress || 0}%`);
    console.log(`   Created: ${new Date(status.createdAt).toISOString()}`);
    console.log(`   Updated: ${new Date(status.updatedAt).toISOString()}`);
    
    if (status.error) {
      console.log(`   Error: ${status.error}`);
    }

    if (status.status === 'succeeded' && status.result) {
      console.log(`   Duration: ${status.result.duration}s`);
      console.log(`   Resolution: ${status.result.resolution}`);
      console.log(`   Size: ${Math.round(status.result.size / 1024 / 1024)}MB`);
      console.log(`   URL: ${status.result.videoUrl}`);
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function handleList(generator, args) {
  const options = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--status') {
      options.status = args[++i];
    } else if (args[i] === '--limit') {
      options.limit = parseInt(args[++i]);
    }
  }

  console.log('📋 Video Generation Tasks');
  console.log('=========================');
  console.log('');

  const tasks = generator.getTasks(options);
  
  if (tasks.length === 0) {
    console.log('No tasks found.');
    return;
  }

  tasks.forEach(task => {
    console.log(`   ${task.id.substring(0, 8)}...`);
    console.log(`      Status: ${task.status.toUpperCase()}`);
    console.log(`      Type: ${task.type}`);
    console.log(`      Progress: ${task.progress}%`);
    console.log(`      Created: ${new Date(task.createdAt).toLocaleString()}`);
    if (task.error) {
      console.log(`      Error: ${task.error}`);
    }
    console.log('');
  });

  console.log(`   Total: ${tasks.length} tasks`);
}

async function handleCancel(generator, taskId) {
  if (!taskId) {
    console.error('❌ Task ID required');
    console.log('Usage: node scripts/video-cli.js cancel <taskId>');
    return;
  }

  console.log(`⏹️ Cancelling task ${taskId}...`);

  try {
    const success = await generator.cancelTask(taskId);
    
    if (success) {
      console.log('✅ Task cancelled successfully');
    } else {
      console.log('❌ Task could not be cancelled (not running or not found)');
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function handleHealth(generator) {
  console.log('🏥 Provider Health Check');
  console.log('========================');
  console.log('');

  const health = await generator.checkHealth();

  health.forEach(h => {
    const statusEmoji = h.status === 'healthy' ? '✅' : 
                       h.status === 'degraded' ? '⚠️' : '❌';
    
    console.log(`   ${statusEmoji} ${h.name}`);
    console.log(`      Status: ${h.status}`);
    console.log(`      Uptime: ${h.uptime}%`);
    console.log(`      Last checked: ${new Date(h.lastChecked).toISOString()}`);
    console.log('');
  });

  const stats = generator.getStatistics();
  console.log('📊 Statistics:');
  console.log(`   Total tasks: ${stats.total}`);
  console.log(`   Running: ${stats.running}`);
  console.log(`   Success rate: ${stats.successRate}%`);
}

async function handleWait(generator, taskId, timeoutStr) {
  if (!taskId) {
    console.error('❌ Task ID required');
    console.log('Usage: node scripts/video-cli.js wait <taskId> [timeout_in_seconds]');
    return;
  }

  const timeout = parseInt(timeoutStr) || 300000; // 5 minutes default

  console.log(`⏳ Waiting for task ${taskId}... (timeout: ${timeout/1000}s)`);
  console.log('');

  try {
    const result = await generator.waitForCompletion(taskId, timeout);
    
    console.log('✅ Task completed!');
    console.log('');
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${result.result?.duration}s`);
    console.log(`   Resolution: ${result.result?.resolution}`);
    console.log(`   Size: ${Math.round(result.result?.size / 1024 / 1024)}MB`);
    console.log(`   URL: ${result.result?.videoUrl}`);
    console.log(`   Completed at: ${new Date().toLocaleString()}`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function handleDemo(generator) {
  console.log('🎬 Video Generation Demo');
  console.log('=========================');
  console.log('');

  const demos = [
    { prompt: 'A beautiful sunset over mountains', options: { duration: 6, resolution: '1080p' } },
    { prompt: 'A futuristic city with flying cars', options: { duration: 8, resolution: '1080p' } },
    { prompt: 'A cute cat playing with yarn', options: { duration: 5, resolution: '720p' } }
  ];

  const taskIds = [];

  for (let i = 0; i < demos.length; i++) {
    const demo = demos[i];
    console.log(`📝 Task ${i + 1}: "${demo.prompt}"`);
    
    const taskId = await generator.generateTextToVideo(demo.prompt, demo.options);
    taskIds.push(taskId.taskId);
    
    console.log(`   Task ID: ${taskId.taskId}`);
    console.log(`   Status: ${taskId.status}`);
    console.log('');
  }

  console.log('🕐 Starting to monitor all tasks...');
  console.log('');

  // Wait for first completion
  while (true) {
    for (const taskId of taskIds) {
      const status = await generator.getStatus(taskId);
      
      if (status.status === 'succeeded') {
        console.log(`✅ ${taskId.substring(0, 8)}... - SUCCESS`);
        console.log(`   URL: ${status.result.videoUrl}`);
      } else if (status.status === 'failed') {
        console.log(`❌ ${taskId.substring(0, 8)}... - FAILED: ${status.error}`);
      } else {
        console.log(`⏳ ${taskId.substring(0, 8)}... - ${status.status} (${Math.round(status.progress)}%)`);
      }
    }

    const allDone = taskIds.every(taskId => {
      const status = generator.taskManager.tasks.get(taskId);
      return status && (status.status === 'succeeded' || status.status === 'failed');
    });

    if (allDone) break;

    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');
  }
}

function printHelp() {
  console.log('🎬 OpenClaw Video Generation CLI');
  console.log('=================================');
  console.log('');
  console.log('Usage: node scripts/video-cli.js <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  generate <prompt>   Generate a video from text description');
  console.log('                      Options: --provider <id>, --duration <seconds>, --resolution <resolution>');
  console.log('');
  console.log('  status <taskId>     Get task status');
  console.log('');
  console.log('  list [options]      List all tasks');
  console.log('                      Options: --status <status>, --limit <count>');
  console.log('');
  console.log('  cancel <taskId>     Cancel a running task');
  console.log('');
  console.log('  health              Check provider health');
  console.log('');
  console.log('  wait <taskId> [timeout] Wait for task completion');
  console.log('');
  console.log('  demo                Run a demo with multiple tasks');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/video-cli.js generate "A sunset" --duration 6');
  console.log('  node scripts/video-cli.js status abc12345');
  console.log('  node scripts/video-cli.js list --limit 10');
  console.log('  node scripts/video-cli.js cancel abc12345');
  console.log('  node scripts/video-cli.js wait abc12345 300');
  console.log('  node scripts/video-cli.js health');
}

// Run
main().catch(console.error);
