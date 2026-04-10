#!/usr/bin/env node
/**
 * Emergency Stop - Lite Version
 * 轻量版紧急停止工具 (无依赖，自动运行)
 * 只使用 Node.js 原生 API
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class EmergencyLite {
  constructor() {
    this.startTime = Date.now();
    console.log('🚨 紧急恢复系统 [Lite]');
    console.log(`启动时间：${new Date().toISOString()}`);
    console.log('');
  }

  async run() {
    console.log('🔍 诊断系统...');
    const stuck = await this.detectStuckProcesses();
    
    if (stuck.length === 0) {
      console.log('✅ 系统正常，未发现卡住进程');
      return;
    }

    console.log(`\n🔥 发现 ${stuck.length} 个异常进程:`);
    for (const proc of stuck) {
      console.log(`   - ${proc.name} (PID: ${proc.pid}, CPU: ${proc.cpu.toFixed(0)}%)`);
    }

    console.log('\n🔄 自动修复中...');
    await this.recover(stuck);
    
    console.log('✅ 恢复完成，耗时:', (Date.now() - this.startTime), 'ms');
  }

  async detectStuckProcesses() {
    const stuck = [];
    try {
      const output = execSync('powershell -Command "Get-Process | Where-Object { $_.CPU -gt 100 } | Select-Object ProcessName, ID, CPU, WorkingSet"', { encoding: 'utf-8', stdio: 'pipe' });
      const lines = output.trim().split('\n').slice(1);
      
      for (const line of lines) {
        if (line.trim()) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            stuck.push({
              name: parts[0],
              pid: parseInt(parts[1]),
              cpu: parseFloat(parts[2])
            });
          }
        }
      }
    } catch (error) {
      // 静默处理错误
    }
    return stuck;
  }

  async recover(stuck) {
    // 1. 停止异常进程
    for (const proc of stuck) {
      if (proc.pid > 1000 && proc.name !== 'System') { // 跳过系统进程
        try {
          execSync(`taskkill /F /PID ${proc.pid}`, { stdio: 'pipe' });
          console.log(`✅ 已停止：${proc.name} (PID: ${proc.pid})`);
        } catch (e) {
          // 静默失败
        }
      }
    }

    // 2. 清理临时文件
    try {
      const tempPath = path.join(__dirname, '..', 'temp');
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { recursive: true, force: true });
        console.log('✅ 已清理 temp 目录');
      }
    } catch (e) {
      // 静默
    }

    // 3. 检查服务状态
    try {
      const output = execSync('powershell -Command "Get-Service -Name ollama -ErrorAction SilentlyContinue | Select-Object Status"', { encoding: 'utf-8' });
      if (output.includes('Stopped')) {
        try {
          execSync('powershell -Command "Start-Service ollama"', { stdio: 'pipe' });
          console.log('✅ 已重启 Ollama 服务');
        } catch (e) {
          // 静默
        }
      }
    } catch (e) {
      // 服务不存在，静默
    }
  }
}

// 自动运行，无需交互
new EmergencyLite().run().catch(() => process.exit(0));
