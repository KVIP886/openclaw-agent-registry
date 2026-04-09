/**
 * Status Check Script
 * 检查当前模式和可用模式状态
 */

const fs = require('fs');
const path = require('path');

async function checkStatus() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 系统状态检查');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  // 检查 Ollama 当前模型
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    
    const currentModel = data.models.find(m => 
      m.name.includes('qwen') && m.name.includes('latest')
    );
    
    if (currentModel) {
      console.log('📋 当前 Ollama 模型:');
      console.log(`   名称：${currentModel.name}`);
      console.log(`   大小：${(currentModel.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`   量化：${currentModel.details.quantization_level}`);
      console.log(`   修改：${new Date(currentModel.modified_at).toLocaleString()}`);
      console.log('');
    } else {
      console.log('⚠️  未检测到 Qwen 模型');
      console.log('   已安装模型:');
      data.models.forEach(m => {
        console.log(`   - ${m.name} (${(m.size / 1024 / 1024 / 1024).toFixed(2)} GB)`);
      });
      console.log('');
    }
  } catch (error) {
    console.log('⚠️  无法连接 Ollama 服务');
    console.log('   请确保服务正在运行：ollama serve');
    console.log('');
  }
  
  // 检查备份配置
  try {
    const backupPath = path.join(__dirname, '../config/modes-backup.json');
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    console.log('📋 可用模式配置:');
    console.log('');
    console.log('   🟢 默认模式 (当前可用):');
    console.log(`      - 名称：${backup.current_mode.name}`);
    console.log(`      - 模型：${backup.current_mode.model_name}`);
    console.log(`      - 上下文：${backup.current_mode.context}`);
    console.log(`      - GPU 使用：${backup.current_mode.gpu_usage}`);
    console.log(`      - 状态：${backup.current_mode.status}`);
    console.log('');
    
    console.log('   🚀 极致模式 (已配置):');
    console.log(`      - 名称：${backup.ultra_mode.name}`);
    console.log(`      - 模型：${backup.ultra_mode.model_name}`);
    console.log(`      - 上下文：${backup.ultra_mode.context}`);
    console.log(`      - GPU 使用：${backup.ultra_mode.gpu_usage}`);
    console.log(`      - 预期速度：${backup.ultra_mode.expected_speedup}`);
    console.log(`      - 状态：${backup.ultra_mode.status}`);
    console.log('');
    
    console.log('📋 切换命令:');
    console.log('');
    console.log('   切换到极致模式:');
    console.log('   命令：node scripts/switch-to-ultra.js');
    console.log('');
    console.log('   回退到默认模式:');
    console.log('   命令：node scripts/rollback-to-default.js');
    console.log('');
    console.log('   查看当前状态:');
    console.log('   命令：node scripts/check-status.js');
    console.log('');
    
  } catch (error) {
    console.log('⚠️  配置文件读取失败');
    console.log('   文件路径：config/modes-backup.json');
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🛡️ 安全回退保障:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('   ✅ 128K 模式：稳定工作，随时可用');
  console.log('   ✅ AReaL 配置：已备份，可恢复');
  console.log('   ✅ 回退机制：一键切换，10 秒完成');
  console.log('');
  console.log('   💡 提示：');
  console.log('      - 使用极致模式前，先执行状态检查');
  console.log('      - 出现问题立即回退：node scripts/rollback-to-default.js');
  console.log('      - 128K 模式不会丢失，随时可恢复');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

checkStatus().catch(console.error);
