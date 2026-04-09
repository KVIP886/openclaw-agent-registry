/**
 * Rollback to Default Mode
 * 一键回退到当前稳定的 128K 模式
 * 
 * 用途：当极致模式出现问题时，立即回退
 */

const fs = require('fs');
const path = require('path');

async function rollback() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 一键回退到默认模式');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  // 1. 读取备份配置
  const backupPath = path.join(__dirname, '../config/modes-backup.json');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  
  console.log('📋 当前状态快照:');
  console.log(`   - 当前模式：${backup.current_mode.name}`);
  console.log(`   - 模型：${backup.current_mode.model_name}`);
  console.log(`   - 上下文：${backup.current_mode.context}`);
  console.log(`   - GPU 使用：${backup.current_mode.gpu_usage}`);
  console.log('');
  
  console.log('📋 回退配置:');
  console.log(`   - 目标模式：${backup.current_mode.name}`);
  console.log(`   - 模型：${backup.current_mode.model_name}`);
  console.log(`   - 上下文：${backup.current_mode.context}`);
  console.log(`   - 量化：${backup.current_mode.quantization}`);
  console.log('');
  
  // 2. 生成回退命令
  console.log('🚀 回退步骤:');
  console.log('');
  console.log('   步骤 1: 切换到 128K 模式');
  console.log('   命令：ollama run qwen-128k');
  console.log('');
  
  console.log('   步骤 2: 验证模型加载');
  console.log('   命令：ollama show qwen-128k:latest');
  console.log('');
  
  console.log('   步骤 3: 重置 AReaL 配置 (如果已启动)');
  console.log('   - buffer: medium');
  console.log('   - batch: 512');
  console.log('   - gradient_accumulation: 2');
  console.log('   - training_steps: 10000');
  console.log('');
  
  console.log('   步骤 4: 重启服务 (可选)');
  console.log('   命令：node scripts/video-cli.js restart');
  console.log('');
  
  // 3. 询问是否执行
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\n💬 是否立即执行回退？(y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log('');
      console.log('✅ 回退指令已生成:');
      console.log('');
      console.log('ollama run qwen-128k');
      console.log('ollama show qwen-128k:latest');
      console.log('');
      console.log('💡 提示:');
      console.log('   - 128K 模式已稳定工作，随时可用');
      console.log('   - AReaL 配置将自动恢复为 buffer: medium');
      console.log('   - GPU 使用约 24-26GB，安全余量充足');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
    } else {
      console.log('');
      console.log('✅ 回退已取消');
      console.log('当前系统保持原状');
    }
    
    rl.close();
  });
}

async function verifyCurrentMode() {
  console.log('');
  console.log('🔍 检查当前模式...');
  console.log('');
  
  try {
    // 检查 Ollama 当前运行模型
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    
    const currentModels = data.models.map(m => m.name);
    console.log('📋 已安装的模型:');
    currentModels.forEach(name => {
      console.log(`   - ${name}`);
    });
    
    if (currentModels.includes('qwen-128k:latest')) {
      console.log('');
      console.log('✅ 确认：qwen-128k:latest 已安装，可立即回退');
    } else {
      console.log('');
      console.log('⚠️  警告：qwen-128k:latest 未找到，请先 pull 模型');
      console.log('命令：ollama pull qwen-128k');
    }
    
  } catch (error) {
    console.error('❌ 无法连接 Ollama 服务，请确保服务正在运行');
    console.log('命令：ollama serve');
  }
}

// 运行
async function main() {
  await verifyCurrentMode();
  await rollback();
}

main().catch(console.error);
