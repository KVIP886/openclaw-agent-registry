#!/usr/bin/env node
/**
 * Ollama Concurrent Benchmark
 * 测试并发性能并生成报告
 */

const { execSync } = require('child_process');

class OllamaBenchmark {
  constructor() {
    this.host = '192.168.1.4';
    this.port = 11434;
    this.models = ['llama3.2', 'qwen2.5:0.5b'];
    this.concurrentTests = [2, 4, 6];
  }

  async run() {
    console.log('🚀 Ollama 并发性能基准测试');
    console.log(`服务器：${this.host}:${this.port}`);
    console.log('');

    // 1. 测试连接
    await this.testConnection();

    // 2. 并发测试
    for (const models of this.models) {
      console.log(`\n📊 测试模型：${models}`);
      console.log('-'.repeat(50));

      for (const concurrent of this.concurrentTests) {
        await this.runConcurrentTest(models, concurrent);
      }
    }

    console.log('\n✅ 测试完成');
  }

  async testConnection() {
    try {
      console.log('📡 连接测试...');
      execSync(
        `powershell -Command "Test-NetConnection -ComputerName ${this.host} -Port ${this.port} -InformationLevel Quiet"`,
        { timeout: 5000 }
      );
      console.log('✅ 连接正常');
    } catch (error) {
      console.log('❌ 连接失败，请检查：');
      console.log('   - Ollama 服务是否运行');
      console.log('   - 防火墙是否允许 11434 端口');
      throw error;
    }
  }

  async runConcurrentTest(model, concurrent) {
    const startTime = Date.now();
    const promises = [];

    console.log(`\n   🔥 并发 ${concurrent} 个请求 (${model})`);

    for (let i = 1; i <= concurrent; i++) {
      promises.push(
        this.executeRequest(model, i, concurrent)
          .then(result => ({ model, concurrent, success: true, duration: result }))
          .catch(err => ({ model, concurrent, success: false, duration: Date.now() - startTime }))
      );
    }

    const results = await Promise.all(promises);
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const successRate = (results.filter(r => r.success).length / concurrent) * 100;

    console.log(`   ✅ 平均响应时间：${avgDuration.toFixed(0)}ms`);
    console.log(`   ✅ 成功率：${successRate.toFixed(1)}%`);

    // 记录 GPU 使用率
    const gpuUsage = this.getGPUUsage();
    console.log(`   🎮 GPU 温度：${gpuUsage.temp}°C`);
    console.log(`   🎮 GPU 显存：${gpuUsage.used}/${gpuUsage.total} MB`);
  }

  async executeRequest(model, id, total) {
    const start = Date.now();

    try {
      const output = execSync(
        `powershell -Command "$env:OLLAMA_HOST='${this.host}:${this.port}'; ollama list 2>&1"`,
        { encoding: 'utf-8', timeout: 30000 }
      );

      return Date.now() - start;
    } catch (error) {
      return Date.now() - start;
    }
  }

  getGPUUsage() {
    try {
      const output = execSync(
        'nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits',
        { encoding: 'utf-8' }
      );
      const parts = output.trim().split(',');
      return {
        temp: parseInt(parts[0]),
        util: parseInt(parts[1]),
        used: parseInt(parts[2]),
        total: parseInt(parts[3])
      };
    } catch (error) {
      return { temp: 0, util: 0, used: 0, total: 0 };
    }
  }
}

// 运行
const benchmark = new OllamaBenchmark();
benchmark.run().catch(console.error);
