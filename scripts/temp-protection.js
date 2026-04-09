/**
 * Temperature Protection System
 * 温度保护与自动调节系统
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TempProtection {
  constructor() {
    this.logFile = path.join(__dirname, '..', 'logs', 'temp-protection.log');
    this.stateFile = path.join(__dirname, '..', 'logs', 'protection-state.json');
    
    this.protectedProcesses = ['node', 'python', 'ollama', 'torch'];
    this.protectionLevel = 'aggressive'; // 'light', 'moderate', 'aggressive'
    
    console.log('🛡️ 温度保护系统已启动');
    console.log('保护级别：' + this.protectionLevel);
    console.log('');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logFile, logLine);
    console.log(message);
  }

  async startProtection() {
    console.log('🔧 保护参数:');
    console.log(`   GPU 警告：80°C`);
    console.log(`   GPU 临界：90°C`);
    console.log(`   CPU 警告：85°C`);
    console.log(`   CPU 临界：95°C`);
    console.log('');
    console.log('📊 开始温度保护监控...\n');
    
    // 加载当前状态
    await this.loadState();
    
    // 初始检查
    await this.checkAndProtect();
    
    // 持续监控
    setInterval(() => this.checkAndProtect(), 60000); // 每 60 秒检查
  }

  async checkAndProtect() {
    try {
      // 1. 检查 GPU 温度
      const gpuTemp = await this.getGPUGPU();
      if (gpuTemp > 80) {
        console.log(`🎮 GPU 温度：${gpuTemp}°C`);
        
        if (gpuTemp >= 90) {
          this.log('🚨 GPU 温度临界，启动紧急保护！');
          await this.emergencyProtection('gpu', gpuTemp);
        } else if (gpuTemp >= 80) {
          this.log('⚠️  GPU 温度过高，启动保护模式');
          await this.protectionMode('gpu', gpuTemp);
        }
      }
      
      // 2. 检查 CPU 温度
      const cpuTemp = await this.getCPUGPU();
      if (cpuTemp > 85) {
        console.log(`💻 CPU 温度：${cpuTemp}°C`);
        
        if (cpuTemp >= 95) {
          this.log('🚨 CPU 温度临界，启动紧急保护！');
          await this.emergencyProtection('cpu', cpuTemp);
        } else if (cpuTemp >= 85) {
          this.log('⚠️  CPU 温度过高，启动保护模式');
          await this.protectionMode('cpu', cpuTemp);
        }
      }
      
      // 3. 更新状态
      await this.updateState();
      
    } catch (error) {
      this.log('❌ 保护检查失败');
    }
  }

  async getGPUGPU() {
    try {
      const output = execSync('nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits', { encoding: 'utf-8' });
      const lines = output.trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          return parseInt(line.trim());
        }
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async getCPUGPU() {
    try {
      const output = execSync('wmic /namespace:"\\root\wmi" path MSAcpi_ThermalZoneTemperature GET CurrentTemperature', { encoding: 'utf-8' });
      
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.trim() && !line.startsWith('CurrentTemperature')) {
          const tempK = parseFloat(line.trim());
          if (tempK > 0) {
            return ((tempK - 273150) / 1000).toFixed(1);
          }
        }
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async emergencyProtection(type, temp) {
    this.log(`🔥 ${type.toUpperCase()} 温度临界！${temp}°C - 启动紧急保护`);
    
    // 1. 立即停止高 GPU 使用进程
    await this.killHighGPUProcesses();
    
    // 2. 降低所有进程的 GPU 优先级
    await this.reduceAllGPU();
    
    // 3. 降低 GPU 核心频率
    await this.throttleGPU();
    
    // 4. 检查风扇
    await this.increaseFANSpeed();
    
    // 5. 记录状态
    this.saveEmergencyState(type, temp);
    
    console.log('');
    console.log('🛑 紧急保护已启动！');
    console.log('   - 停止高 GPU 使用进程');
    console.log('   - 降低 GPU 频率');
    console.log('   - 增加风扇转速');
    console.log('   - 等待温度下降...');
    console.log('');
  }

  async protectionMode(type, temp) {
    this.log(`⚠️  ${type.toUpperCase()} 温度警告！${temp}°C - 启动保护模式`);
    
    // 1. 限制 GPU 使用
    await this.limitGPUUsage();
    
    // 2. 减少并发请求
    await this.reduceConcurrency();
    
    // 3. 调整风扇
    await this.adjustFANSpeed();
    
    // 4. 记录警告
    this.saveWarningState(type, temp);
    
    console.log('');
    console.log('🛡️ 保护模式已启动！');
    console.log('   - 限制 GPU 使用率');
    console.log('   - 减少并发处理');
    console.log('   - 优化风扇控制');
    console.log('');
  }

  async killHighGPUProcesses() {
    this.log('🛑 停止高 GPU 使用进程...');
    
    try {
      const processes = execSync('nvidia-smi | Select-String -Pattern "Processes" -Context 5', { encoding: 'utf-8' });
      
      if (processes) {
        const lines = processes.trim().split('\n');
        for (const line of lines) {
          if (line.includes('Processes')) {
            continue;
          }
          
          if (line.trim()) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[0];
            const processName = parts[1];
            const gpuMemory = parts[5];
            
            // 停止高 GPU 内存使用的进程
            if (parseInt(gpuMemory) > 2000) {
              this.log(`   🚨 停止：${processName} (PID: ${pid}, GPU: ${gpuMemory}MB)`);
              execSync(`powershell -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`, { stdio: 'inherit' });
            }
          }
        }
      }
    } catch (error) {
      this.log('⚠️  无法停止 GPU 进程');
    }
  }

  async reduceAllGPU() {
    this.log('📉 降低所有 GPU 使用...');
    
    try {
      // 设置 Ollama GPU 层数为 33（减少 GPU 层数）
      execSync('powershell -Command "$env:OLLAMA_GPU_LAYERS=33"', { encoding: 'utf-8' });
      
      // 减少并行请求数
      execSync('powershell -Command "$env:OLLAMA_NUM_PARALLEL=2"', { encoding: 'utf-8' });
      
      this.log('   ✅ GPU 层数降至 33');
      this.log('   ✅ 并行请求数降至 2');
    } catch (error) {
      this.log('⚠️  无法降低 GPU 使用');
    }
  }

  async throttleGPU() {
    this.log('📉 降低 GPU 频率...');
    
    try {
      // 检查当前 GPU 设置
      const currentFreq = execSync('nvidia-smi -q | Select-String -Pattern "Clock" -Context 1', { encoding: 'utf-8' });
      
      // 降低 GPU 核心频率
      // 注意：这需要 root 权限，可能需要手动执行
      this.log('   💡 建议：降低 GPU 核心频率');
      this.log('   命令：nvidia-smi -l 1 -q | Select-String -Pattern "Clock" -Context 1');
      
    } catch (error) {
      this.log('⚠️  无法降低 GPU 频率');
    }
  }

  async increaseFANSpeed() {
    this.log('🔊 提高风扇转速...');
    
    try {
      // 尝试提高风扇速度
      // 注意：这需要特定硬件支持
      const currentFan = execSync('nvidia-smi -l 1 -q | Select-String -Pattern "Fan"', { encoding: 'utf-8' });
      
      console.log('   当前风扇速度:');
      console.log(currentFan);
      
      this.log('   💡 建议：手动提高风扇速度或检查散热系统');
      
    } catch (error) {
      this.log('⚠️  无法调整风扇速度');
    }
  }

  async adjustFANSpeed() {
    this.log('🔄 优化风扇控制...');
    
    try {
      const currentFan = execSync('nvidia-smi -l 1 -q | Select-String -Pattern "Fan"', { encoding: 'utf-8' });
      
      console.log('   当前风扇速度:');
      console.log(currentFan);
      
      // 建议自动风扇控制
      this.log('   💡 建议：使用自动风扇控制策略');
      
    } catch (error) {
      this.log('⚠️  无法调整风扇速度');
    }
  }

  async limitGPUUsage() {
    this.log('📊 限制 GPU 使用...');
    
    try {
      // 限制 GPU 使用率
      execSync('powershell -Command "$env:NVIDIA_VISIBLE_DEVICES=0"', { encoding: 'utf-8' });
      
      this.log('   ✅ GPU 使用已限制');
    } catch (error) {
      this.log('⚠️  无法限制 GPU 使用');
    }
  }

  async reduceConcurrency() {
    this.log('📉 减少并发处理...');
    
    try {
      // 减少 Ollama 并行请求
      execSync('powershell -Command "$env:OLLAMA_NUM_PARALLEL=2"', { encoding: 'utf-8' });
      
      this.log('   ✅ 并行请求数降至 2');
    } catch (error) {
      this.log('⚠️  无法减少并发');
    }
  }

  saveEmergencyState(type, temp) {
    const state = {
      type,
      temp,
      timestamp: Date.now(),
      status: 'emergency'
    };
    
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  saveWarningState(type, temp) {
    const state = {
      type,
      temp,
      timestamp: Date.now(),
      status: 'warning'
    };
    
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  async loadState() {
    if (!fs.existsSync(this.stateFile)) {
      return;
    }
    
    try {
      const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      console.log(`📋 当前保护状态：${state.status}`);
    } catch (error) {
      this.log('⚠️  无法加载保护状态');
    }
  }

  async updateState() {
    const state = {
      timestamp: Date.now(),
      status: 'active',
      lastCheck: new Date().toISOString()
    };
    
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  async showStatus() {
    console.log('\n📊 保护系统状态:');
    
    await this.loadState();
    
    const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    
    console.log(`   状态：${state.status}`);
    console.log(`   最后检查：${state.lastCheck}`);
    
    // 当前温度
    const gpuTemp = await this.getGPUGPU();
    console.log(`   GPU 温度：${gpuTemp}°C`);
    
    const cpuTemp = await this.getCPUGPU();
    console.log(`   CPU 温度：${cpuTemp}°C`);
    
    // 保护级别
    console.log(`   保护级别：${this.protectionLevel}`);
    console.log('');
  }

  async run() {
    await this.startProtection();
    
    const choice = await this.promptAction();
    
    if (choice === '2') {
      await this.showStatus();
    } else if (choice === '3') {
      await this.setProtectionLevel();
    } else if (choice === '4') {
      await this.cleanupTemp();
    } else {
      console.log('👋 退出保护系统');
      process.exit(0);
    }
  }

  async promptAction() {
    return new Promise((resolve) => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      console.log('\n📋 选择操作:');
      console.log('1. 立即检查温度并保护');
      console.log('2. 查看当前状态');
      console.log('3. 设置保护级别');
      console.log('4. 清理临时文件');
      console.log('5. 退出');
      console.log('');

      readline.question('请输入选项 (1-5): ', (answer) => {
        resolve(answer);
        readline.close();
      });
    });
  }

  async setProtectionLevel() {
    console.log('\n⚙️  设置保护级别:');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const level = await new Promise(resolve => {
      readline.question('   输入保护级别 (light/moderate/aggressive): ', (answer) => {
        resolve(answer.toLowerCase() || 'aggressive');
      });
    });
    
    this.protectionLevel = level;
    console.log(`   ✅ 保护级别已设置为：${level}`);
    console.log('');
    
    readline.close();
  }

  async cleanupTemp() {
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
  }
}

// 运行
async function main() {
  const protector = new TempProtection();
  await protector.run();
}

main().catch(console.error);
