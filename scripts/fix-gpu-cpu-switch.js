/**
 * GPU/CPU Switch Fix Script
 * 自动检测和修复 GPU/CPU 调度错误
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class GPU_CPUSwitchFix {
  constructor() {
    this.envFile = path.join(__dirname, '..', '.env');
    this.logFile = path.join(__dirname, '..', 'logs', 'gpu-fix.log');
    
    console.log('🎯 GPU/CPU 调度修复工具');
    console.log('');
  }

  async diagnose() {
    console.log('🔍 诊断 GPU/CPU 调度状态...\n');
    
    // 1. 检查 NVIDIA GPU 状态
    await this.checkNVIDIA();
    
    // 2. 检查 Ollama GPU 设置
    await this.checkOllamaGPU();
    
    // 3. 检查环境变量
    await this.checkEnvironment();
    
    // 4. 检查当前 GPU 使用情况
    await this.checkCurrentGPUUsage();
    
    console.log('');
    console.log('✅ 诊断完成\n');
  }

  async checkNVIDIA() {
    console.log('🎮 NVIDIA GPU 状态:');
    
    try {
      const nvidiaOutput = execSync('nvidia-smi --query-gpu=designation,temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits', { encoding: 'utf-8' });
      const lines = nvidiaOutput.trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          const parts = line.trim().split(',');
          const name = parts[0];
          const temp = parts[1];
          const gpuUtil = parts[2];
          const usedMem = parts[3];
          const totalMem = parts[4];
          
          console.log(`   名称：${name}`);
          console.log(`   温度：${temp}°C`);
          console.log(`   使用率：${gpuUtil}%`);
          console.log(`   显存：${usedMem}/${totalMem} MB`);
          console.log('');
          
          // 检查 GPU 是否在休眠
          if (parseInt(gpuUtil) < 5 && parseInt(usedMem) > 100) {
            console.log('   ⚠️  GPU 利用率低但显存占用高，可能正在使用 CPU');
          }
        }
      }
    } catch (error) {
      console.log('   ❌ 未检测到 NVIDIA GPU 或驱动有问题');
      console.log('   💡 建议：检查显卡驱动是否安装正确');
    }
  }

  async checkOllamaGPU() {
    console.log('🔧 Ollama GPU 配置:');
    
    try {
      // 检查 Ollama 环境变量
      const envOutput = execSync('powershell -Command "Get-ChildItem Env: | Where-Object { $_.Name -match \"OLLAMA|CUDA|GPU\" } | Select-Object Name, Value | Format-Table -AutoSize"', { encoding: 'utf-8' });
      
      if (envOutput.trim()) {
        console.log('   环境变量:');
        console.log(envOutput);
      } else {
        console.log('   未设置 Ollama GPU 相关环境变量');
        console.log('   💡 建议设置以下环境变量:');
        console.log('   - CUDA_VISIBLE_DEVICES=0');
        console.log('   - OLLAMA_GPU_LAYERS=33');
        console.log('   - OLLAMA_NUM_PARALLEL=4');
      }
    } catch (error) {
      console.log('   无法获取环境变量');
    }
  }

  async checkEnvironment() {
    console.log('📝 环境变量检查:');
    
    const requiredEnv = {
      'CUDA_VISIBLE_DEVICES': '限制使用的 GPU 设备',
      'OLLAMA_GPU_LAYERS': 'GPU 层数分配',
      'OLLAMA_NUM_PARALLEL': '并行请求数',
      'OLLAMA_NUM_THREAD': 'CPU 线程数'
    };
    
    for (const [env, desc] of Object.entries(requiredEnv)) {
      try {
        const value = execSync(`powershell -Command "$env:${env}"`, { encoding: 'utf-8' }).trim();
        if (value) {
          console.log(`   ✅ ${env} = ${value}`);
          console.log(`      ${desc}`);
        } else {
          console.log(`   ⚠️  ${env} = (未设置)`);
          console.log(`      建议设置：${desc}`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${env} = (未设置)`);
        console.log(`      建议设置：${desc}`);
      }
    }
  }

  async checkCurrentGPUUsage() {
    console.log('📊 当前 GPU 使用情况:');
    
    try {
      const gpuOutput = execSync('nvidia-smi dmon -s upe', { encoding: 'utf-8' });
      
      if (gpuOutput.trim()) {
        console.log(gpuOutput);
      } else {
        console.log('   无法获取 GPU 详细信息');
      }
    } catch (error) {
      console.log('   无法运行 GPU 监控');
    }
  }

  async fixCPUSwitchForGPU() {
    console.log('\n🔧 修复 GPU 调度错误...');
    
    // 1. 设置环境变量
    const envCommands = [
      'Set-Item -Force -Path Env:CUDA_VISIBLE_DEVICES -Value "0"',
      'Set-Item -Force -Path Env:OLLAMA_GPU_LAYERS -Value "33"',
      'Set-Item -Force -Path Env:OLLAMA_NUM_PARALLEL -Value "4"',
      'Set-Item -Force -Path Env:OLLAMA_NUM_THREAD -Value "8"'
    ];
    
    console.log('\n📝 设置环境变量:');
    for (const cmd of envCommands) {
      try {
        execSync(cmd, { encoding: 'utf-8' });
        const envVar = cmd.split(' -Value ')[0].replace('Set-Item -Force -Path Env:', '');
        const value = cmd.split(' -Value "')[1].replace('"', '');
        console.log(`   ✅ ${envVar} = ${value}`);
      } catch (error) {
        console.log(`   ❌ 设置 ${envVar} 失败`);
      }
    }
    
    // 2. 检查 Ollama 进程
    console.log('\n🔄 检查 Ollama 进程...');
    try {
      const ollamaProcesses = execSync('powershell -Command "Get-Process -Name ollama -ErrorAction SilentlyContinue | Select-Object ProcessName, ID, CPU, WorkingSet | Format-Table -AutoSize"', { encoding: 'utf-8' });
      
      if (ollamaProcesses.trim()) {
        console.log('   Ollama 进程状态:');
        console.log(ollamaProcesses);
        
        // 检查是否正在使用 CPU
        const lines = ollamaProcesses.trim().split('\n');
        for (const line of lines.slice(1)) {
          if (line.trim()) {
            const parts = line.trim().split(/\s+/);
            const cpu = parseFloat(parts[2]);
            
            if (cpu > 80) {
              console.log('   ⚠️  Ollama CPU 使用率过高，可能正在 CPU 处理');
              console.log('   🔧 正在重启 Ollama 服务...');
              
              execSync('powershell -Command "Restart-Service ollama"', { stdio: 'inherit' });
              
              console.log('   ✅ Ollama 服务已重启');
            }
          }
        }
      } else {
        console.log('   Ollama 未运行');
      }
    } catch (error) {
      console.log('   无法检查 Ollama 进程');
    }
    
    // 3. 清理临时文件
    console.log('\n🧹 清理临时文件...');
    const tempPaths = [
      path.join(__dirname, '..', 'temp'),
      path.join(__dirname, '..', 'cache'),
      path.join(__dirname, '..', 'logs', '*.lock')
    ];
    
    for (const tempPath of tempPaths) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.rmSync(tempPath, { recursive: true, force: true });
          console.log(`   ✅ 已清理：${tempPath}`);
        } catch (error) {
          console.log(`   ⚠️  无法清理：${tempPath}`);
        }
      }
    }
    
    console.log('\n✅ 修复完成');
  }

  async createEnvConfig() {
    console.log('\n📝 创建 .env 配置文件...');
    
    const envContent = `# GPU/CPU 调度配置
# 自动生成 - 2026-04-10

# CUDA GPU 设备
CUDA_VISIBLE_DEVICES=0

# Ollama GPU 配置
OLLAMA_GPU_LAYERS=33
OLLAMA_NUM_PARALLEL=4
OLLAMA_NUM_THREAD=8

# 显存管理
MAX_GPU_MEMORY=28GB
GPU_OVERALLOCATION_FACTOR=1.1

# 缓存配置
CACHE_DIR=./cache
TEMP_DIR=./temp

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# 监控配置
MONITOR_INTERVAL=60
ALERT_THRESHOLD_CPU=90
ALERT_THRESHOLD_MEMORY=95
`;
    
    if (fs.existsSync(this.envFile)) {
      const backupPath = this.envFile + '.backup.' + Date.now();
      fs.copyFileSync(this.envFile, backupPath);
      console.log(`   ✅ 备份现有配置：${backupPath}`);
    }
    
    fs.writeFileSync(this.envFile, envContent);
    console.log(`   ✅ 已创建：${this.envFile}`);
  }

  async verifyFix() {
    console.log('\n🔍 验证修复结果...');
    
    // 重启 Ollama
    console.log('🔄 重启 Ollama 服务...');
    try {
      execSync('powershell -Command "Restart-Service ollama"', { stdio: 'inherit' });
      console.log('   ✅ Ollama 服务已重启');
      
      // 等待服务启动
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 检查 GPU 使用
      console.log('\n📊 验证 GPU 使用情况:');
      const gpuOutput = execSync('nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits', { encoding: 'utf-8' });
      console.log(gpuOutput);
      
    } catch (error) {
      console.log('   ❌ Ollama 重启失败');
    }
  }

  async run() {
    await this.diagnose();
    
    const choice = await this.promptAction();
    
    if (choice === '1') {
      await this.fixCPUSwitchForGPU();
    } else if (choice === '2') {
      await this.createEnvConfig();
    } else if (choice === '3') {
      await this.verifyFix();
    } else {
      console.log('👋 退出修复工具');
    }
  }

  async promptAction() {
    return new Promise((resolve) => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      console.log('\n🔧 选择操作:');
      console.log('1. 修复 GPU/CPU 调度错误');
      console.log('2. 创建 .env 配置文件');
      console.log('3. 验证修复结果');
      console.log('4. 退出');
      console.log('');

      readline.question('请输入选项 (1-4): ', (answer) => {
        resolve(answer);
        readline.close();
      });
    });
  }
}

// 运行
async function main() {
  const fixer = new GPU_CPUSwitchFix();
  await fixer.run();
}

main().catch(console.error);
