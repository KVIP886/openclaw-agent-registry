#!/usr/bin/env node
/**
 * Temperature Protection - Lite Version
 * 轻量版温度保护 (自动执行，无交互)
 */

const { execSync } = require('child_process');

class ProtectLite {
  constructor() {
    this.thresholds = {
      warning: 80,
      critical: 90
    };
  }

  run() {
    const gpuStatus = this.checkGPU();
    
    if (!gpuStatus) {
      return;
    }

    if (gpuStatus.temp >= this.thresholds.critical) {
      this.emergencyProtect();
    } else if (gpuStatus.temp >= this.thresholds.warning) {
      this.normalProtect();
    } else {
      console.log('✅ 温度正常，无需保护');
    }
  }

  checkGPU() {
    try {
      const output = execSync('nvidia-smi --query-gpu=temperature.gpu,utilization.gpu --format=csv,noheader,nounits', { encoding: 'utf-8', stdio: 'pipe' });
      const lines = output.trim().split('\n');
      
      if (lines.length > 0) {
        const temp = parseInt(lines[0].split(',')[0]);
        const util = parseInt(lines[0].split(',')[1]);
        return { temp, util };
      }
    } catch (e) {
      // 静默
    }
    return null;
  }

  emergencyProtect() {
    console.log('🚨 紧急保护模式!');
    
    // 1. 停止高 GPU 使用进程
    try {
      const output = execSync('powershell -Command "Get-Process | Where-Object { $_.CPU -gt 500 } | Select-Object ID | ForEach-Object { $_.ID }"', { encoding: 'utf-8', stdio: 'pipe' });
      const pids = output.trim().split('\n').filter(p => p.trim());
      
      for (const pid of pids) {
        if (pid.trim()) {
          try {
            execSync(`taskkill /F /PID ${pid.trim()}`, { stdio: 'pipe' });
            console.log(`✅ 停止进程 PID: ${pid.trim()}`);
          } catch (e) {
            // 静默
          }
        }
      }
    } catch (e) {
      // 静默
    }

    // 2. 降低 Ollama GPU 层数
    try {
      execSync('powershell -Command "$env:OLLAMA_GPU_LAYERS=20"', { stdio: 'pipe' });
      console.log('✅ GPU 层数降低至 20');
    } catch (e) {
      // 静默
    }
  }

  normalProtect() {
    console.log('⚠️ 保护模式');
    
    // 1. 降低 GPU 使用
    try {
      execSync('powershell -Command "$env:OLLAMA_GPU_LAYERS=25"', { stdio: 'pipe' });
      console.log('✅ GPU 层数降低至 25');
    } catch (e) {
      // 静默
    }
    
    // 2. 减少并行
    try {
      execSync('powershell -Command "$env:OLLAMA_NUM_PARALLEL=2"', { stdio: 'pipe' });
      console.log('✅ 并行数减少至 2');
    } catch (e) {
      // 静默
    }
  }
}

new ProtectLite().run();
