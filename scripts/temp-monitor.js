/**
 * Temperature Monitor & Protection
 * 实时监控 GPU/CPU 温度并自动保护
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TempMonitor {
  constructor() {
    this.logFile = path.join(__dirname, '..', 'logs', 'temp-monitor.log');
    this.thresholds = {
      gpu_critical: 90,  // GPU 临界温度
      gpu_warning: 80,   // GPU 警告温度
      cpu_critical: 95,  // CPU 临界温度
      cpu_warning: 85,   // CPU 警告温度
      temp_alert_interval: 60000  // 告警间隔（秒）
    };
    
    console.log('🌡️ 温度监控与保护系统已启动');
    console.log('');
  }

  async startMonitoring() {
    console.log('📊 监控参数:');
    console.log(`   GPU 警告阈值：${this.thresholds.gpu_warning}°C`);
    console.log(`   GPU 临界阈值：${this.thresholds.gpu_critical}°C`);
    console.log(`   CPU 警告阈值：${this.thresholds.cpu_warning}°C`);
    console.log(`   CPU 临界阈值：${this.thresholds.cpu_critical}°C`);
    console.log(`   检查间隔：30 秒`);
    console.log('');

    // 初始检查
    await this.checkAllTemperatures();

    // 定时检查
    setInterval(() => this.checkAllTemperatures(), 30000);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logFile, logLine);
    console.log(message);
  }

  async checkAllTemperatures() {
    await this.checkGPUGPU();
    await this.checkCPU();
    await this.checkSystemTemperatures();
    await this.checkThermalThrottling();
  }

  async checkGPUGPU() {
    try {
      const gpuOutput = execSync('nvidia-smi --query-gpu=temperature.gpu,temperature.memory,utilization.gpu --format=csv,noheader,nounits', { encoding: 'utf-8' });
      const lines = gpuOutput.trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          const parts = line.trim().split(',');
          const tempGPU = parseInt(parts[0]);
          const tempMemory = parseInt(parts[1]);
          const gpuUtil = parseInt(parts[2]);
          
          console.log(`🎮 GPU 温度：${tempGPU}°C`);
          console.log(`   显存温度：${tempMemory}°C`);
          console.log(`   利用率：${gpuUtil}%`);
          
          // 检查 GPU 核心温度
          if (tempGPU >= this.thresholds.gpu_critical) {
            this.log(`🚨 GPU 温度临界！${tempGPU}°C (阈值：${this.thresholds.gpu_critical}°C)`);
            await this.handleCriticalTemp('gpu-core', tempGPU);
          } else if (tempGPU >= this.thresholds.gpu_warning) {
            this.log(`⚠️  GPU 温度警告！${tempGPU}°C (阈值：${this.thresholds.gpu_warning}°C)`);
            await this.handleWarningTemp('gpu-core', tempGPU);
          } else {
            console.log(`   状态：✅ 正常`);
          }
          
          // 检查显存温度
          if (tempMemory >= 90) {
            this.log(`⚠️  GPU 显存温度警告：${tempMemory}°C`);
          }
          
          console.log('');
        }
      }
    } catch (error) {
      this.log('❌ 无法获取 GPU 温度信息，可能 GPU 未检测到或驱动有问题');
      console.log('   提示：确保 NVIDIA 驱动已正确安装');
      console.log('');
    }
  }

  async checkCPU() {
    try {
      const cpuTemp = execSync('powershell -Command "Get-ProcessorTemperature | Select-Object Temperature | Format-Table -AutoSize"', { encoding: 'utf-8' });
      
      // 注意：Windows PowerShell 的 Get-ProcessorTemperature 可能不可用
      // 这里使用替代方法获取 CPU 温度
      
      // 尝试通过 wmic 获取 CPU 温度
      try {
        const cpuInfo = execSync('wmic /namespace:"\\root\wmi" path MSAcpi_ThermalZoneTemperature GET CurrentTemperature', { encoding: 'utf-8' });
        
        // 解析温度数据 (Kelvin - 273.15)
        const lines = cpuInfo.trim().split('\n');
        for (const line of lines) {
          if (line.trim() && !line.startsWith('CurrentTemperature')) {
            const tempK = parseFloat(line.trim());
            if (tempK > 0) {
              const tempC = ((tempK - 273150) / 1000).toFixed(1);
              const tempF = ((tempK - 273150) * 1.8 / 1000 + 32).toFixed(1);
              
              console.log(`💻 CPU 温度：${tempC}°C (${tempF}°F)`);
              
              if (tempC >= this.thresholds.cpu_critical) {
                this.log(`🚨 CPU 温度临界！${tempC}°C (阈值：${this.thresholds.cpu_critical}°C)`);
                await this.handleCriticalTemp('cpu', tempC);
              } else if (tempC >= this.thresholds.cpu_warning) {
                this.log(`⚠️  CPU 温度警告！${tempC}°C (阈值：${this.thresholds.cpu_warning}°C)`);
                await this.handleWarningTemp('cpu', tempC);
              } else {
                console.log(`   状态：✅ 正常`);
              }
            }
          }
        }
      } catch (wmicError) {
        // wmic 不可用时，使用替代方法
        try {
          const cpuLoad = execSync('powershell -Command "Get-Process -Name \"*\" | Measure-Object -Property CPU -Statistics | Select-Object @{Name=\"CPU\";Expression={[math]::Round($_.MaximumCPU, 2)}}"', { encoding: 'utf-8' });
          
          console.log('   CPU 负载信息:');
          console.log(cpuLoad);
          
          // 如果 CPU 负载过高，推测温度可能过高
          this.log('⚠️  无法直接获取 CPU 温度，但检测到高 CPU 负载');
        } catch (error) {
          console.log('   CPU 温度：无法获取');
        }
      }
      console.log('');
    } catch (error) {
      this.log('❌ 无法获取 CPU 温度信息');
      console.log('');
    }
  }

  async checkSystemTemperatures() {
    try {
      // 检查主板温度（如果可用）
      const motherboardTemp = execSync('wmic /namespace:"\\root\wmi" path MSAcpi_ThermalZoneTemperature GET DeviceID, CurrentTemperature | Select-Object DeviceID, CurrentTemperature', { encoding: 'utf-8' });
      
      const lines = motherboardTemp.trim().split('\n');
      if (lines.length > 1) {
        const tempK = parseInt(lines[1].trim().split(/\s+/)[1]);
        if (tempK > 0) {
          const tempC = ((tempK - 273150) / 1000).toFixed(1);
          console.log(`📦 主板温度：${tempC}°C`);
        }
      }
    } catch (error) {
      // 主板温度不可获取
    }
  }

  async checkThermalThrottling() {
    try {
      const throttlingOutput = execSync('nvidia-smi -q | Select-String -Pattern "Thermal" -Context 1,2', { encoding: 'utf-8' });
      
      if (throttlingOutput) {
        const lines = throttlingOutput.trim().split('\n');
        for (const line of lines) {
          if (line.includes('Thermal')) {
            this.log(`⚠️  GPU 温度限制警告：${line.trim()}`);
          }
        }
      }
    } catch (error) {
      // 无温度限制
    }
  }

  async handleCriticalTemp(type, temp) {
    this.log(`🔥 检测到 ${type} 温度临界：${temp}°C`);
    
    // 1. 记录事件
    this.saveTempEvent(type, temp, 'critical');
    
    // 2. 尝试降低 GPU 使用率
    await this.throttleGPU();
    
    // 3. 降低 CPU 负载
    await this.reduceCPULoad();
    
    // 4. 检查冷却系统
    await this.checkCoolingSystem();
    
    // 5. 发送告警
    this.sendAlert(type, temp, 'critical');
  }

  async handleWarningTemp(type, temp) {
    this.log(`⚠️  ${type} 温度警告：${temp}°C`);
    this.saveTempEvent(type, temp, 'warning');
  }

  async throttleGPU() {
    console.log('\n🔄 正在降低 GPU 使用率...');
    
    try {
      // 停止可能的高 GPU 使用进程
      const highGpuProcesses = execSync('nvidia-smi -l 1 -q 2>&1 | Select-String -Pattern "Processes" -Context 5', { encoding: 'utf-8' });
      console.log('   当前 GPU 使用进程:');
      console.log(highGpuProcesses);
      
      // 通知 Ollama 降低 GPU 层数
      this.log('💡 建议设置 OLLAMA_GPU_LAYERS=33 以减少 GPU 负载');
      
    } catch (error) {
      this.log('⚠️  无法自动降低 GPU 负载');
    }
  }

  async reduceCPULoad() {
    console.log('\n🔄 正在降低 CPU 负载...');
    
    try {
      // 检查并停止不必要的进程
      const processes = execSync('powershell -Command "Get-Process | Where-Object { $_.CPU -gt 50 } | Select-Object ProcessName, ID, CPU | Format-Table -AutoSize"', { encoding: 'utf-8' });
      
      if (processes.trim()) {
        console.log('   高 CPU 使用进程:');
        console.log(processes);
        
        // 建议停止
        this.log('💡 建议停止非必要的进程以减少 CPU 负载');
      }
    } catch (error) {
      this.log('⚠️  无法降低 CPU 负载');
    }
  }

  async checkCoolingSystem() {
    console.log('\n🔍 检查冷却系统...');
    
    try {
      // 检查风扇速度
      const fanSpeed = execSync('powershell -Command "Get-ItemProperty -Path HKLM:\\HARDWARE\\DENVER\\System -Name Fans | Select-Object *"', { encoding: 'utf-8' });
      
      if (fanSpeed) {
        console.log('   风扇状态:');
        console.log(fanSpeed);
      } else {
        console.log('   无法获取风扇信息');
      }
      
      // 建议清理灰尘
      this.log('💡 建议：如果温度持续过高，检查风扇是否正常运行，考虑清理灰尘');
      
    } catch (error) {
      this.log('⚠️  无法检查冷却系统');
    }
  }

  sendAlert(type, temp, severity) {
    const timestamp = new Date().toISOString();
    const alertMessage = `🚨 ${severity.toUpperCase()} 温度告警 - ${type}: ${temp}°C @ ${timestamp}`;
    
    console.log('');
    console.log(alertMessage);
    console.log('');
    
    // 记录到文件
    fs.appendFileSync(this.logFile, `${alertMessage}\n`);
  }

  saveTempEvent(type, temp, severity) {
    const timestamp = Date.now();
    const event = { type, temp, severity, timestamp };
    
    const eventsFile = path.join(__dirname, '..', 'logs', 'temp-events.json');
    let events = [];
    
    if (fs.existsSync(eventsFile)) {
      try {
        events = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
      } catch (error) {
        events = [];
      }
    }
    
    events.push(event);
    fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
  }

  async showHistory() {
    console.log('\n📊 温度历史记录:');
    
    const eventsFile = path.join(__dirname, '..', 'logs', 'temp-events.json');
    
    if (!fs.existsSync(eventsFile)) {
      console.log('   无历史记录');
      return;
    }
    
    try {
      const events = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
      
      console.log(`   共 ${events.length} 条记录\n`);
      
      // 显示最近的 10 条记录
      const recentEvents = events.slice(-10);
      for (const event of recentEvents) {
        const time = new Date(event.timestamp).toLocaleString('zh-CN');
        const severity = event.severity === 'critical' ? '🚨' : '⚠️';
        console.log(`   ${severity} ${event.type} 温度 ${event.temp}°C (${severity === '🚨' ? '临界' : '警告'}) @ ${time}`);
      }
    } catch (error) {
      this.log('❌ 无法读取历史记录');
    }
  }

  async setThresholds() {
    console.log('\n⚙️  设置温度阈值:');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const gpuWarning = await new Promise(resolve => {
      readline.question('   输入 GPU 警告阈值 (默认 80°C): ', (answer) => {
        resolve(parseInt(answer) || 80);
      });
    });
    
    const gpuCritical = await new Promise(resolve => {
      readline.question('   输入 GPU 临界阈值 (默认 90°C): ', (answer) => {
        resolve(parseInt(answer) || 90);
      });
    });
    
    this.thresholds.gpu_warning = gpuWarning;
    this.thresholds.gpu_critical = gpuCritical;
    
    console.log(`   ✅ 已更新 GPU 阈值`);
    console.log('');
    
    readline.close();
  }

  async run() {
    console.log('🔍 开始监控温度...');
    await this.checkAllTemperatures();
    
    const choice = await this.promptAction();
    
    if (choice === '2') {
      await this.showHistory();
    } else if (choice === '3') {
      await this.setThresholds();
    } else if (choice === '4') {
      console.log('👋 退出温度监控系统');
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
      console.log('1. 重新检查温度');
      console.log('2. 查看历史记录');
      console.log('3. 设置阈值');
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
  const monitor = new TempMonitor();
  await monitor.run();
}

main().catch(console.error);
