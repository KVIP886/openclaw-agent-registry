/**
 * Process Monitor & Auto-Recovery
 * 监控进程并自动处理卡死问题
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProcessMonitor {
  constructor() {
    this.monitoredProcesses = ['node', 'python', 'ollama'];
    this.checkInterval = 60000; // 60 秒检查一次
    this.maxCPU = 90; // CPU 使用率阈值 (%)
    this.maxMemory = 95; // 内存使用率阈值 (%)
    this.timeout = 300000; // 5 分钟超时
    this.logFile = path.join(__dirname, '..', 'logs', 'process-monitor.log');
    
    this.start();
  }

  start() {
    console.log('🔍 进程监控守护进程已启动');
    console.log(`检查间隔：${this.checkInterval / 1000}秒`);
    console.log(`CPU 阈值：${this.maxCPU}%`);
    console.log(`内存阈值：${this.maxMemory}%`);
    console.log('');

    // 初始检查
    this.checkAllProcesses();

    // 定时检查
    setInterval(() => this.checkAllProcesses(), this.checkInterval);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    
    // 写入日志文件
    fs.appendFileSync(this.logFile, logLine);
    
    // 打印到控制台
    console.log(message);
  }

  async checkAllProcesses() {
    this.log('📊 开始进程检查...');
    
    for (const processName of this.monitoredProcesses) {
      await this.checkProcess(processName);
    }
    
    await this.checkSystemResources();
    await this.checkOllamaGPUUsage();
  }

  async checkProcess(processName) {
    try {
      const psOutput = execSync(
        `powershell -Command "Get-Process -Name ${processName} -ErrorAction SilentlyContinue | Select-Object ProcessName, ID, CPU, WorkingSet | Format-Table -AutoSize"`,
        { encoding: 'utf-8' }
      );

      if (psOutput.trim()) {
        const lines = psOutput.trim().split('\n');
        for (const line of lines.slice(1)) {
          if (line.trim()) {
            const parts = line.trim().split(/\s+/);
            const processId = parseInt(parts[1]);
            const cpu = parseFloat(parts[2]);
            const memory = parseFloat(parts[3]);

            // 检查 CPU 使用率
            if (cpu > this.maxCPU) {
              this.log(`⚠️  检测到 ${processName} (PID: ${processId}) CPU 使用率过高：${cpu}%`);
              await this.handleHighCPU(processName, processId, cpu);
            }

            // 检查内存使用
            const memoryGB = (memory / 1024 / 1024).toFixed(2);
            if (memoryGB > 10) { // 超过 10GB 可能有问题
              this.log(`⚠️  检测到 ${processName} (PID: ${processId}) 内存占用过高：${memoryGB} GB`);
              await this.handleHighMemory(processName, processId, memoryGB);
            }
          }
        }
      }
    } catch (error) {
      // 进程不存在，正常
    }
  }

  async handleHighCPU(processName, processId, cpu) {
    const timestamp = Date.now();
    
    // 记录到日志
    this.log(`📝 记录：${processName} (PID: ${processId}) CPU ${cpu}% 在 ${timestamp}`);

    // 检查是否频繁触发
    const recentEvents = this.getRecentEvents(processId, 'high-cpu');
    if (recentEvents.length >= 3) {
      this.log(`🚨 ${processName} (PID: ${processId}) 频繁 CPU 过高，正在处理...`);
      
      // 尝试优雅重启
      await this.restartProcess(processName, processId);
      return;
    }

    // 保存事件记录
    this.saveEvent(processId, 'high-cpu', timestamp, cpu);
  }

  async handleHighMemory(processName, processId, memoryGB) {
    const timestamp = Date.now();
    
    this.log(`📝 记录：${processName} (PID: ${processId}) 内存 ${memoryGB} GB 在 ${timestamp}`);

    const recentEvents = this.getRecentEvents(processId, 'high-memory');
    if (recentEvents.length >= 2) {
      this.log(`🚨 ${processName} (PID: ${processId}) 内存泄漏，正在处理...`);
      
      await this.restartProcess(processName, processId);
      return;
    }

    this.saveEvent(processId, 'high-memory', timestamp, memoryGB);
  }

  async checkSystemResources() {
    try {
      const systemInfo = execSync(
        'powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory | ConvertFrom-Json"',
        { encoding: 'utf-8' }
      );

      const totalGB = (systemInfo.TotalVisibleMemorySize / 1024 / 1024).toFixed(0);
      const freeGB = (systemInfo.FreePhysicalMemory / 1024 / 1024).toFixed(0);
      const usedPercent = ((1 - systemInfo.FreePhysicalMemory / systemInfo.TotalVisibleMemorySize) * 100).toFixed(1);

      if (parseFloat(usedPercent) > this.maxMemory) {
        this.log(`🚨 系统内存使用率过高：${usedPercent}% (${totalGB}GB 总内存，${freeGB}GB 空闲)`);
        await this.handleSystemMemory(usedPercent);
      }
    } catch (error) {
      // 无法获取系统信息
    }
  }

  async handleSystemMemory(usedPercent) {
    this.log(`📝 系统内存使用率：${usedPercent}%`);

    // 清理 Python 和 Node.js 进程
    await this.restartProcess('python');
    await this.restartProcess('node');

    // 清理临时文件
    await this.cleanupTempFiles();

    this.log('✅ 系统资源已优化');
  }

  async checkOllamaGPUUsage() {
    try {
      const gpuOutput = execSync('nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader', { encoding: 'utf-8' });
      const lines = gpuOutput.trim().split('\n');
      
      if (lines.length > 0) {
        const line = lines[0].trim().split(',');
        const usedMB = parseInt(line[0]);
        const totalMB = parseInt(line[1]);
        const gpuUtil = parseInt(line[2]);

        const usedGB = (usedMB / 1024).toFixed(1);
        const totalGB = (totalMB / 1024).toFixed(1);
        const utilization = `${gpuUtil}%`;

        // 检查 GPU 使用情况
        if (gpuUtil < 10 && usedGB > 10) {
          this.log(`⚠️  Ollama GPU 利用率低 (${utilization}) 但显存占用高 (${usedGB}/${totalGB} GB)`);
          this.log(`💡 可能正在使用 CPU 处理，建议检查 GPU 是否被正确识别`);
          await this.handleCPUUsageForGPU();
        }
      }
    } catch (error) {
      // 未检测到 GPU 或 nvidia-smi 不可用
    }
  }

  async handleCPUUsageForGPU() {
    this.log('🔧 检测 CPU 处理 GPU 任务...');
    
    // 检查 Ollama 进程
    try {
      const ollamaProcesses = execSync(
        'powershell -Command "Get-Process -Name ollama -ErrorAction SilentlyContinue | Select-Object ProcessName, ID, CPU, WorkingSet | Format-Table -AutoSize"',
        { encoding: 'utf-8' }
      );

      if (ollamaProcesses.trim()) {
        this.log('📊 Ollama 进程:');
        this.log(ollamaProcesses);
        
        // 建议检查环境变量
        this.log('💡 建议检查环境变量:');
        this.log('   - OLLAMA_GPU_LAYERS');
        this.log('   - CUDA_VISIBLE_DEVICES');
        this.log('   - OLLAMA_NUM_PARALLEL');
      }
    } catch (error) {
      this.log('Ollama 进程未运行');
    }
  }

  async cleanupTempFiles() {
    const tempPaths = [
      path.join(__dirname, '..', 'temp'),
      path.join(__dirname, '..', 'cache'),
      path.join(__dirname, '..', 'logs', '*.lock')
    ];

    for (const tempPath of tempPaths) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.rmSync(tempPath, { recursive: true, force: true });
          this.log(`🧹 清理临时文件：${tempPath}`);
        } catch (error) {
          this.log(`⚠️  无法清理 ${tempPath}`);
        }
      }
    }
  }

  async restartProcess(processName, processId = null) {
    this.log(`🔄 重启进程：${processName}`);
    
    try {
      if (processId) {
        execSync(`powershell -Command "Stop-Process -Id ${processId} -Force -ErrorAction SilentlyContinue"`, { stdio: 'inherit' });
      } else {
        execSync(`powershell -Command "Get-Process -Name ${processName} -ErrorAction SilentlyContinue | Stop-Process -Force"`, { stdio: 'inherit' });
      }
      
      // 等待 2 秒
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.log(`✅ 进程 ${processName} 已重启`);
      
      // 如果是 Ollama，尝试重新启动
      if (processName === 'python' || processName === 'node') {
        await this.restartOllama();
      }
    } catch (error) {
      this.log(`❌ 重启 ${processName} 失败`);
    }
  }

  async restartOllama() {
    this.log('🔄 重启 Ollama 服务...');
    
    try {
      execSync('powershell -Command "Restart-Service ollama -ErrorAction SilentlyContinue"', { stdio: 'inherit' });
      this.log('✅ Ollama 服务已重启');
    } catch (error) {
      this.log('⚠️  Ollama 服务重启失败，请手动检查');
    }
  }

  getRecentEvents(processId, eventType) {
    // 简化实现：实际应该从日志文件读取
    return [];
  }

  saveEvent(processId, eventType, timestamp, value) {
    // 简化实现：实际应该写入日志文件
    const logLine = `[${new Date().toISOString()}] ${eventType}: ProcessID=${processId}, Value=${value}\n`;
    fs.appendFileSync(this.logFile, logLine);
  }
}

// 启动监控
const monitor = new ProcessMonitor();

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n👋 进程监控已停止');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 进程监控已停止');
  process.exit(0);
});
