/**
 * Switch to Ultra Mode
 * 一键切换到极致性能模式
 * 
 * 用途：在安全的前提下，快速切换到极致性能
 * 回退：随时可回退到 128K 默认模式
 */

const fs = require('fs');
const path = require('path');

async function switchToUltra() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 切换到极致性能模式');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  // 读取备份配置
  const backupPath = path.join(__dirname, '../config/modes-backup.json');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  
  console.log('📋 当前状态:');
  console.log(`   - 当前模式：${backup.current_mode.name}`);
  console.log(`   - 模型：${backup.current_mode.model_name}`);
  console.log(`   - GPU 使用：${backup.current_mode.gpu_usage}`);
  console.log('');
  
  console.log('📋 切换至:');
  console.log(`   - 目标模式：${backup.ultra_mode.name}`);
  console.log(`   - 模型：${backup.ultra_mode.model_name}`);
  console.log(`   - 上下文：${backup.ultra_mode.context}`);
  console.log(`   - GPU 使用：${backup.ultra_mode.gpu_usage}`);
  console.log(`   - 预期速度：${backup.ultra_mode.expected_speedup}`);
  console.log('');
  
  console.log('⚡ 切换步骤:');
  console.log('');
  console.log('   步骤 1: 切换到 16K/64K 模式 (取决于配置)');
  console.log('   命令：ollama run qwen-64k');
  console.log('');
  
  console.log('   步骤 2: 验证模型加载');
  console.log('   命令：ollama show qwen-64k:latest');
  console.log('');
  
  console.log('   步骤 3: 启动 AReaL (配置已更新)');
  console.log('   - buffer: huge');
  console.log('   - batch: 4096');
  console.log('   - gradient_accumulation: 1');
  console.log('   - training_steps: 20000');
  console.log('');
  
  console.log('   步骤 4: 监控 GPU');
  console.log('   命令：nvidia-smi');
  console.log('');
  
  console.log('🛡️ 回退保障:');
  console.log('   - 随时可回退到 128K 模式');
  console.log('   - 命令：node scripts/rollback-to-default.js');
  console.log('   - 128K 模式状态：✅ 稳定工作');
  console.log('');
  
  // 询问是否执行
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\n💬 是否立即切换至极致模式？(y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log('');
      console.log('✅ 切换指令已生成:');
      console.log('');
      console.log('ollama run qwen-64k');
      console.log('ollama show qwen-64k:latest');
      console.log('');
      console.log('💡 提示:');
      console.log('   - 极致模式预期速度：4.5-5.5x');
      console.log('   - GPU 使用：12-15GB (更节省)');
      console.log('   - 可立即回退：node scripts/rollback-to-default.js');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
    } else {
      console.log('');
      console.log('✅ 切换已取消');
      console.log('当前系统保持 128K 默认模式');
    }
    
    rl.close();
  });
}

// 运行
switchToUltra().catch(console.error);
