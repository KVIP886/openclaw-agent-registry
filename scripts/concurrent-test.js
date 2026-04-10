#!/usr/bin/env node
/**
 * Concurrent Ollama Test
 * 并发测试两台机器的 Ollama 连接
 */

const { execSync } = require('child_process');

class ConcurrentTest {
  constructor() {
    this.mainHost = '192.168.1.4';
    this.mainPort = 11434;
    this.maxConcurrent = 5;
  }

  async run() {
    console.log('🚀 并发测试开始');
    console.log(`主服务器：${this.mainHost}:${this.mainPort}`);
    console.log('');

    // 1. 检查连接
    await this.checkConnection();

    // 2. 并发执行多个请求
    await this.runConcurrentTests();

    console.log('✅ 并发测试完成');
  }

  async checkConnection() {
    try {
      console.log('📡 测试连接...');
      const result = execSync(
        `powershell -Command "Invoke-WebRequest -Uri http://${this.mainHost}:${this.mainPort}/api/tags -TimeoutSec 5"`,
        { stdio: 'pipe' }
      );
      console.log('✅ 连接正常');
    } catch (error) {
      console.log('❌ 连接失败');
      return false;
    }
    return true;
  }

  async runConcurrentTests() {
    console.log(`\n🔥 并发 ${this.maxConcurrent} 个请求...`);
    
    const promises = [];
    
    for (let i = 1; i <= this.maxConcurrent; i++) {
      promises.push(
        this.executeRequest(i).then(result => {
          console.log(`✅ 请求 ${i}: ${result}`);
        }).catch(err => {
          console.log(`❌ 请求 ${i}: ${err.message}`);
        })
      );
    }
    
    await Promise.allSettled(promises);
  }

  async executeRequest(id) {
    const start = Date.now();
    
    try {
      // 发送一个简单请求
      const output = execSync(
        `powershell -Command "$env:OLLAMA_HOST='${this.mainHost}:${this.mainPort}'; ollama list 2>&1"`,
        { encoding: 'utf-8', timeout: 30000 }
      );
      
      const duration = Date.now() - start;
      return `成功 (${duration}ms)`;
    } catch (error) {
      const duration = Date.now() - start;
      throw new Error(`失败 (${duration}ms): ${error.message}`);
    }
  }
}

// 运行
const test = new ConcurrentTest();
test.run().catch(console.error);
