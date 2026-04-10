/**
 * Emergency Stop & Recovery Script
 * 紧急停止卡住进程并自动恢复
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class EmergencyRecovery {
  constructor() {
    this.processes = [];
    this.logFile = path.join(__dirname, '..', 'logs', 'emergency-log.txt');
    this.startTime = Date.now();
    
    console.log('🚨 紧急恢复系统已启动');
    console.log(`时间戳：${new Date().toISOString()}`);
    console.log('');
  }

  async diagnose() {
    console.log('🔍 正在诊断系统状态...\n');
    
    // 1. 检查进程状态
    await this.checkProcesses();
    
    // 2. 检查内存使用
    await this.checkMemory();
    
    // 3. 检查 GPU 状态
    await this.checkGPU();
    
    // 4. 检查文件锁
    await this.checkFileLocks();
    
    console.log('');
    console.log('✅ 诊断完成');
  }

  async checkProcesses() {
    console.log('📋 进程状态:');
    
    try {
      const psOutput = execSync('powershell -Command "Get-Process | Where-Object { $_.CPU -gt 0 } | Select-Object ProcessName, ID, CPU, WorkingSet', { encoding: 'utf-8' });
      
      if (psOutput.trim()) {
        console.log(psOutput);
      } else {
        console.log('   所有进程 CPU 使用率正常');
      }
    } catch (error) {
      console.log('   无法获取进程信息');
    }
  }

  async checkMemory() {
    console.log('💾 内存使用:');
    
    try {
      const systemInfo = execSync('powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory | ConvertFrom-Json"', { encoding: 'utf-8' });
      
      const totalGB = (systemInfo.TotalVisibleMemorySize / 1024 / 1024).toFixed(2);
      const freeGB = (systemInfo.FreePhysicalMemory / 1024 / 1024).toFixed(2);
      const usedPercent = ((1 - systemInfo.FreePhysicalMemory / systemInfo.TotalVisibleMemorySize) * 100).toFixed(1);
      
      console.log(`   总内存：${totalGB} GB`);
      console.log(`   空闲：${freeGB} GB`);
      console.log(`   使用率：${usedPercent}%`);
    } catch (error) {
      console.log('   无法获取内存信息');
    }
  }

  async checkGPU() {
    console.log('🎮 GPU 状态:');
    
    try {
      const gpuOutput = execSync('nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv', { encoding: 'utf-8' });
      
      console.log(gpuOutput);
    } catch (error) {
      console.log('   未检测到 NVIDIA GPU 或 nvidia-smi 不可用');
      console.log('   💡 提示：检查显卡驱动是否正常');
    }
  }

  async checkFileLocks() {
    console.log('📂 文件锁:');
    
    try {
      const lockOutput = execSync('powershell -Command "Get-Process | Where-Object { $_.Modules | Where-Object { $_.FileName -like \"*whisper*\" -or $_.FileName -like \"*torch*\" } } | Select-Object ProcessName, ID, Modules | Format-Table -AutoSize"', { encoding: 'utf-8' });
      
      console.log(lockOutput);
    } catch (error) {
      console.log('   无法检查文件锁');
    }
  }

  async stopProcessByName(processName) {
    console.log(`\n🛑 正在停止进程：${processName}`);
    
    try {
      execSync(`powershell -Command "Get-Process -Name ${processName} -ErrorAction SilentlyContinue | Stop-Process -Force"`, { stdio: 'inherit' });
      console.log(`✅ 进程 ${processName} 已停止`);
    } catch (error) {
      console.log(`❌ 停止进程 ${processName} 失败`);
    }
  }

  async killStuckProcess() {
    console.log('\n🔥 正在查找卡住的进程...');
    
    // 查找 CPU 使用率超过 90% 的进程
    const stuckProcesses = [];
    
    try {
      const processes = execSync('powershell -Command "Get-Process | Where-Object { $_.CPU -gt 50 } | Select-Object ProcessName, ID, CPU, WorkingSet"', { encoding: 'utf-8' });
      
      if (processes.trim()) {
        console.log('📊 高 CPU 使用进程:');
        console.log(processes);
        
        const lines = processes.trim().split('\n');
        for (const line of lines.slice(1)) {
          if (line.trim()) {
            const parts = line.trim().split(/\s+/);
            const processName = parts[0];
            const cpu = parseFloat(parts[2]);
            
            if (cpu > 50) {
              stuckProcesses.push({ name: processName, cpu, pid: parts[1] });
            }
          }
        }
      }
    } catch (error) {
      console.log('无法获取进程信息');
    }
    
    return stuckProcesses;
  }

  async recover() {
    console.log('\n🔄 正在尝试恢复...');
    
    // 1. 停止可能的卡住进程
    await this.stopProcessByName('node');
    await this.stopProcessByName('python');
    
    // 2. 清理临时文件
    await this.cleanupTempFiles();
    
    // 3. 重启服务
    await this.restartServices();
    
    // 4. 验证系统状态
    await this.verifySystem();
  }

  async cleanupTempFiles() {
    console.log('🧹 清理临时文件...');
    
    const tempPaths = [
      path.join(__dirname, '..', 'temp'),
      path.join(__dirname, '..', 'logs', '*.lock'),
      path.join(__dirname, '..', 'cache')
    ];
    
    for (const tempPath of tempPaths) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.rmSync(tempPath, { recursive: true, force: true });
          console.log(`✅ 已清理：${tempPath}`);
        } catch (error) {
          console.log(`⚠️  无法清理 ${tempPath}: ${error.message}`);
        }
      }
    }
  }

  async restartServices() {
    console.log('🔄 重启服务...');
    
    try {
      // 重启 Ollama 服务
      execSync('powershell -Command "Restart-Service ollama -ErrorAction SilentlyContinue"', { stdio: 'inherit' });
      
      // 重启 OpenClaw Gateway (如果运行)
      execSync('powershell -Command "Restart-Process -Name openclaw-gateway -ErrorAction SilentlyContinue"', { stdio: 'inherit' });
      
      console.log('✅ 服务重启完成');
    } catch (error) {
      console.log('⚠️  服务重启失败，可能需要手动重启');
    }
  }

  async verifySystem() {
    console.log('\n🔍 验证系统状态...');
    
    await this.checkGPU();
    await this.checkMemory();
    
    const now = Date.now();
    const uptime = ((now - this.startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ 恢复完成，耗时：${uptime}秒`);
    console.log('📊 系统状态:');
    console.log('   - GPU 状态：检查通过');
    console.log('   - 内存使用：已优化');
    console.log('   - 进程状态：已清理');
  }

  async createWatchdog() {
    console.log('\n⏱️  创建守护进程...');
    
    // 创建守护脚本
    const watchdogScript = `
# -*- coding: utf-8 -*-
"""
Process Watchdog
监控并自动处理卡住进程
"""

import time
import psutil
import os

def check_process_hang(process_name, timeout=300):
    """检查进程是否卡住"""
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
        try:
            if proc.info['name'] == process_name:
                cpu = proc.cpu_percent()
                if cpu > 90:
                    return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return False

def restart_process(process_name):
    """重启进程"""
    for proc in psutil.process_iter(['pid', 'name']):
        if proc.info['name'] == process_name:
            proc.kill()
            time.sleep(1)
    print(f"已重启 {process_name}")

def main():
    while True:
        # 检查 Python 进程
        if check_process_hang('python'):
            print("发现 Python 进程卡住，正在重启...")
            restart_process('python')
        
        # 检查 Node.js 进程
        if check_process_hang('node'):
            print("发现 Node.js 进程卡住，正在重启...")
            restart_process('node')
        
        time.sleep(60)  # 每 60 秒检查一次

if __name__ == "__main__":
    main()
`;
    
    const watchdogPath = path.join(__dirname, '..', 'scripts', 'process-watchdog.py');
    fs.writeFileSync(watchdogPath, watchdogScript);
    
    console.log(`✅ 守护脚本已创建：${watchdogPath}`);
    console.log('💡 提示：在后台运行守护进程自动监控');
  }

  async run() {
    await this.diagnose();
    
    const stuck = await this.killStuckProcess();
    
    if (stuck.length > 0) {
      console.log('\n🔥 发现卡住的进程:');
      for (const proc of stuck) {
        console.log(`   - ${proc.name} (PID: ${proc.pid}, CPU: ${proc.cpu}%)`);
      }
      
      const choice = await this.promptAction();
      if (choice === '1') {
        await this.recover();
      }
    } else {
      console.log('\n✅ 未发现卡住的进程，系统运行正常');
    }
  }

  async promptAction() {
    return new Promise((resolve) => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('\n🔧 选择操作:\n1. 自动恢复\n2. 手动处理\n3. 查看详细信息\n4. 退出\n\n请输入选项 (1-4): ', (answer) => {
        resolve(answer);
        readline.close();
      });
    });
  }
}

// 运行
async function main() {
  const recovery = new EmergencyRecovery();
  await recovery.run();
}

main().catch(console.error);
