#!/usr/bin/env node
/**
 * Temperature Monitor - Lite Version
 * 轻量版温度监控 (只监控 GPU，无依赖)
 */

const { execSync } = require('child_process');

class TempLite {
  constructor() {
    this.thresholds = {
      warning: 80,
      critical: 90
    };
  }

  run() {
    const status = this.checkGPU();
    this.printStatus(status);
    return status;
  }

  checkGPU() {
    try {
      const output = execSync('nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits', { encoding: 'utf-8' });
      const lines = output.trim().split('\n');
      
      if (lines.length > 0) {
        const parts = lines[0].split(',');
        const temp = parseInt(parts[0]);
        const util = parseInt(parts[1]);
        const used = parseInt(parts[2]);
        const total = parseInt(parts[3]);

        return {
          temp,
          util,
          used,
          total,
          status: this.getTempStatus(temp)
        };
      }
    } catch (e) {
      // 静默
    }

    return null;
  }

  getTempStatus(temp) {
    if (temp >= this.thresholds.critical) return 'CRITICAL';
    if (temp >= this.thresholds.warning) return 'WARNING';
    return 'OK';
  }

  printStatus(status) {
    if (!status) {
      console.log('❌ GPU 不可用');
      return;
    }

    const statusIcon = status.status === 'OK' ? '✅' : 
                       status.status === 'WARNING' ? '⚠️' : '🚨';

    console.log(`\n${statusIcon} GPU 状态:`);
    console.log(`   温度：${status.temp}°C`);
    console.log(`   状态：${status.status}`);
    console.log(`   使用率：${status.util}%`);
    console.log(`   显存：${status.used}/${status.total} MB`);

    if (status.status === 'CRITICAL') {
      console.log('🚨 温度过高，需要立即处理!');
    } else if (status.status === 'WARNING') {
      console.log('⚠️ 温度偏高，请注意监控');
    }
  }
}

const monitor = new TempLite();
const status = monitor.run();

// 退出码：0=OK, 1=WARNING, 2=CRITICAL
process.exit(status?.status === 'CRITICAL' ? 2 : 
             status?.status === 'WARNING' ? 1 : 0);
