#!/usr/bin/env node
/**
 * GPU/CPU Fix - Lite Version
 * 轻量版 GPU/CPU 调度修复 (无依赖，静默执行)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class GPULite {
  constructor() {
    this.envFile = path.join(__dirname, '..', '.env');
    console.log('🔧 GPU/CPU 调度修复 [Lite]');
  }

  async run() {
    // 1. 检查 GPU 状态
    const gpuOk = await this.checkGPU();
    if (!gpuOk) {
      console.log('⚠️ GPU 未就绪');
      return;
    }

    console.log('✅ GPU 状态正常');

    // 2. 设置环境变量
    await this.setEnv();

    // 3. 检查并清理卡死进程
    await this.cleanupStuck();

    console.log('✅ 修复完成');
  }

  async checkGPU() {
    try {
      const output = execSync('nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits', { encoding: 'utf-8', stdio: 'pipe' });
      const temp = parseInt(output.trim());
      if (temp > 0 && temp < 100) {
        return true;
      }
    } catch (error) {
      // GPU 不可用
    }
    return false;
  }

  async setEnv() {
    const envContent = `# GPU/CPU 调度配置 - Auto-generated
CUDA_VISIBLE_DEVICES=0
OLLAMA_GPU_LAYERS=33
OLLAMA_NUM_PARALLEL=4
OLLAMA_NUM_THREAD=8
MAX_GPU_MEMORY=28GB
`;

    if (!fs.existsSync(this.envFile) || fs.readFileSync(this.envFile, 'utf8').trim() === '') {
      fs.writeFileSync(this.envFile, envContent);
      console.log('✅ 环境变量已配置');
    } else {
      console.log('✅ 环境变量已存在');
    }

    // 立即生效
    try {
      execSync('powershell -Command "$env:CUDA_VISIBLE_DEVICES=0; $env:OLLAMA_GPU_LAYERS=33; $env:OLLAMA_NUM_PARALLEL=4; $env:OLLAMA_NUM_THREAD=8"');
    } catch (e) {
      // 静默
    }
  }

  async cleanupStuck() {
    try {
      // 停止高 CPU 使用率进程
      const output = execSync('powershell -Command "Get-Process | Where-Object { $_.CPU -gt 1000 } | Select-Object ProcessName, ID"', { encoding: 'utf-8', stdio: 'pipe' });
      const lines = output.trim().split('\n');
      let stopped = 0;

      for (const line of lines) {
        if (line.trim()) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const pid = parseInt(parts[1]);
            const name = parts[2];
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
              stopped++;
            } catch (e) {
              // 静默
            }
          }
        }
      }

      if (stopped > 0) {
        console.log(`✅ 已停止 ${stopped} 个高 CPU 进程`);
      }
    } catch (e) {
      // 静默
    }
  }
}

new GPULite().run().catch(() => process.exit(0));
