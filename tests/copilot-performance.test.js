/**
 * Copilot - Performance Tests
 * Created: 2026-04-10 (Week 4 Day 5)
 * Function: Performance benchmarking and stress testing
 */

const CopilotCore = require('../src/copilot/CopilotCore');
const ContextManager = require('../src/copilot/ContextManager');
const ContextIndexer = require('../src/copilot/ContextIndexer');
const AgentGenerator = require('../src/copilot/AgentGenerator');
const PermissionInferencer = require('../src/copilot/PermissionInferencer');
const ConflictDetector = require('../src/copilot/ConflictDetector');
const ConflictResolver = require('../src/copilot/ConflictResolver');

class CopilotPerformance {
  constructor() {
    this.metrics = {
      latencies: [],
      throughput: [],
      errorRates: [],
      memoryUsage: []
    };
  }

  async runBenchmarks() {
    console.log('[Performance] Starting benchmarks...\n');

    await this.benchmarkNLP();
    await this.benchmarkContext();
    await this.benchmarkAgentGeneration();
    await this.benchmarkConflictDetection();
    await this.benchmarkFullPipeline();
    await this.benchmarkScalability();

    this.printReport();
  }

  async benchmarkNLP() {
    console.log('[Performance] NLP Benchmark...\n');

    const copilot = new CopilotCore();
    const iterations = 1000;
    const queries = [
      'Create a GitHub review agent',
      'List all agents',
      'Update agent "bot" to version 2.0',
      'Delete agent "old-bot"',
      'Show monitoring agents'
    ];

    const latencies = [];
    for (let i = 0; i < iterations; i++) {
      const query = queries[i % queries.length];
      const startTime = process.hrtime.bigint();
      copilot.process(query);
      const endTime = process.hrtime.bigint();
      latencies.push(Number(endTime - startTime) / 1e6);
    }

    this.metrics.latencies.push({
      test: 'NLP',
      iterations,
      avg: this.calculateAverage(latencies),
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      p95: this.getPercentile(latencies, 95),
      p99: this.getPercentile(latencies, 99)
    });

    console.log('NLP Benchmark:');
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Avg: ${this.metrics.latencies[0].avg.toFixed(2)}ms`);
    console.log(`  Min: ${this.metrics.latencies[0].min.toFixed(2)}ms`);
    console.log(`  Max: ${this.metrics.latencies[0].max.toFixed(2)}ms`);
    console.log(`  P95: ${this.metrics.latencies[0].p95.toFixed(2)}ms`);
    console.log(`  P99: ${this.metrics.latencies[0].p99.toFixed(2)}ms\n`);
  }

  async benchmarkContext() {
    console.log('[Performance] Context Benchmark...\n');

    const contextManager = new ContextManager();
    const iterations = 1000;
    const userIds = [];
    
    // Pre-create contexts
    for (let i = 0; i < 100; i++) {
      contextManager.updateUserContext({
        userId: `user-${i}`,
        roles: ['admin'],
        permissions: ['agent:read', 'agent:deploy']
      });
    }

    const latencies = [];
    for (let i = 0; i < iterations; i++) {
      const userId = `user-${i % 100}`;
      const startTime = process.hrtime.bigint();
      contextManager.getUserContext(userId);
      const endTime = process.hrtime.bigint();
      latencies.push(Number(endTime - startTime) / 1e6);
    }

    this.metrics.latencies.push({
      test: 'Context',
      iterations,
      avg: this.calculateAverage(latencies),
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      p95: this.getPercentile(latencies, 95),
      p99: this.getPercentile(latencies, 99)
    });

    console.log('Context Benchmark:');
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Avg: ${this.metrics.latencies[1].avg.toFixed(2)}ms`);
    console.log(`  Min: ${this.metrics.latencies[1].min.toFixed(2)}ms`);
    console.log(`  Max: ${this.metrics.latencies[1].max.toFixed(2)}ms`);
    console.log(`  P95: ${this.metrics.latencies[1].p95.toFixed(2)}ms`);
    console.log(`  P99: ${this.metrics.latencies[1].p99.toFixed(2)}ms\n`);
  }

  async benchmarkAgentGeneration() {
    console.log('[Performance] Agent Generation Benchmark...\n');

    const agentGenerator = new AgentGenerator();
    const iterations = 100;
    const inputs = [
      { name: 'GitHub Review Agent', description: 'Code quality analyzer', domain: 'devops' },
      { name: 'Monitoring Agent', description: 'Health checks', domain: 'monitoring' },
      { name: 'Analytics Agent', description: 'Data analysis', domain: 'analytics' }
    ];

    const latencies = [];
    for (let i = 0; i < iterations; i++) {
      const input = inputs[i % inputs.length];
      const startTime = process.hrtime.bigint();
      agentGenerator.generate(input);
      const endTime = process.hrtime.bigint();
      latencies.push(Number(endTime - startTime) / 1e6);
    }

    this.metrics.latencies.push({
      test: 'AgentGeneration',
      iterations,
      avg: this.calculateAverage(latencies),
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      p95: this.getPercentile(latencies, 95),
      p99: this.getPercentile(latencies, 99)
    });

    console.log('Agent Generation Benchmark:');
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Avg: ${this.metrics.latencies[2].avg.toFixed(2)}ms`);
    console.log(`  Min: ${this.metrics.latencies[2].min.toFixed(2)}ms`);
    console.log(`  Max: ${this.metrics.latencies[2].max.toFixed(2)}ms`);
    console.log(`  P95: ${this.metrics.latencies[2].p95.toFixed(2)}ms`);
    console.log(`  P99: ${this.metrics.latencies[2].p99.toFixed(2)}ms\n`);
  }

  async benchmarkConflictDetection() {
    console.log('[Performance] Conflict Detection Benchmark...\n');

    const detector = new ConflictDetector();
    const iterations = 100;
    const configs = [
      { id: 'agent-001', name: 'Agent', version: '1.0.0', domain: 'devops' },
      { id: 'agent-001', name: 'Agent', version: '1.0.0', domain: 'devops' }, // ID conflict
      { id: 'agent-001', name: 'Agent', version: '2.0.0', domain: 'devops' }, // Version conflict
      { id: 'agent-002', name: 'Agent', version: '1.0.0', domain: 'invalid' } // Domain conflict
    ];

    const latencies = [];
    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      detector.detect(configs[0], configs[i % 4]);
      const endTime = process.hrtime.bigint();
      latencies.push(Number(endTime - startTime) / 1e6);
    }

    this.metrics.latencies.push({
      test: 'ConflictDetection',
      iterations,
      avg: this.calculateAverage(latencies),
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      p95: this.getPercentile(latencies, 95),
      p99: this.getPercentile(latencies, 99)
    });

    console.log('Conflict Detection Benchmark:');
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Avg: ${this.metrics.latencies[3].avg.toFixed(2)}ms`);
    console.log(`  Min: ${this.metrics.latencies[3].min.toFixed(2)}ms`);
    console.log(`  Max: ${this.metrics.latencies[3].max.toFixed(2)}ms`);
    console.log(`  P95: ${this.metrics.latencies[3].p95.toFixed(2)}ms`);
    console.log(`  P99: ${this.metrics.latencies[3].p99.toFixed(2)}ms\n`);
  }

  async benchmarkFullPipeline() {
    console.log('[Performance] Full Pipeline Benchmark...\n');

    const copilot = new CopilotCore();
    const iterations = 50;
    const inputs = [
      'Create a GitHub review agent',
      'Create a monitoring agent',
      'Create a data analytics agent'
    ];

    const latencies = [];
    const errors = [];

    for (let i = 0; i < iterations; i++) {
      const input = inputs[i % inputs.length];
      const startTime = process.hrtime.bigint();
      
      try {
        const result = copilot.process(input, { author: 'admin' });
        const endTime = process.hrtime.bigint();
        latencies.push(Number(endTime - startTime) / 1e6);
      } catch (error) {
        errors.push(error);
      }
    }

    this.metrics.latencies.push({
      test: 'FullPipeline',
      iterations,
      avg: this.calculateAverage(latencies),
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      p95: this.getPercentile(latencies, 95),
      p99: this.getPercentile(latencies, 99)
    });
    this.metrics.errorRates.push({
      test: 'FullPipeline',
      errorCount: errors.length,
      totalCount: iterations,
      errorRate: (errors.length / iterations * 100).toFixed(2) + '%'
    });

    console.log('Full Pipeline Benchmark:');
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Avg: ${this.metrics.latencies[4].avg.toFixed(2)}ms`);
    console.log(`  Min: ${this.metrics.latencies[4].min.toFixed(2)}ms`);
    console.log(`  Max: ${this.metrics.latencies[4].max.toFixed(2)}ms`);
    console.log(`  P95: ${this.metrics.latencies[4].p95.toFixed(2)}ms`);
    console.log(`  P99: ${this.metrics.latencies[4].p99.toFixed(2)}ms`);
    console.log(`  Error Rate: ${this.metrics.errorRates[0].errorRate}\n`);
  }

  async benchmarkScalability() {
    console.log('[Performance] Scalability Benchmark...\n');

    const iterations = 10;
    const userCounts = [10, 50, 100, 200, 500];

    for (const count of userCounts) {
      const contextManager = new ContextManager();
      
      // Pre-create contexts
      for (let i = 0; i < count; i++) {
        contextManager.updateUserContext({
          userId: `user-${i}`,
          roles: ['admin'],
          permissions: ['agent:read']
        });
      }

      const latencies = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        const result = contextManager.getStats();
        const endTime = process.hrtime.bigint();
        latencies.push(Number(endTime - startTime) / 1e6);
      }

      console.log(`  Users: ${count}`);
      console.log(`    Avg: ${this.calculateAverage(latencies).toFixed(2)}ms`);
      console.log(`    Throughput: ${(count / this.calculateAverage(latencies) * 1000).toFixed(0)} ops/sec\n`);
    }
  }

  calculateAverage(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  getPercentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  printReport() {
    console.log('='.repeat(80));
    console.log('PERFORMANCE BENCHMARK SUMMARY');
    console.log('='.repeat(80));

    for (const metric of this.metrics.latencies) {
      console.log(`\n${metric.test}`);
      console.log(`  Iterations: ${metric.iterations}`);
      console.log(`  Avg: ${metric.avg.toFixed(2)}ms`);
      console.log(`  Min: ${metric.min.toFixed(2)}ms`);
      console.log(`  Max: ${metric.max.toFixed(2)}ms`);
      console.log(`  P95: ${metric.p95.toFixed(2)}ms`);
      console.log(`  P99: ${metric.p99.toFixed(2)}ms`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(80));

    if (this.metrics.latencies[0].avg > 50) {
      console.log('⚠️  NLP processing is slow. Consider caching parsed intents.');
    }

    if (this.metrics.latencies[1].avg > 10) {
      console.log('⚠️  Context lookups are slow. Consider implementing LRU cache.');
    }

    if (this.metrics.latencies[2].avg > 20) {
      console.log('⚠️  Agent generation is slow. Consider pre-computed templates.');
    }

    if (this.metrics.latencies[3].avg > 10) {
      console.log('⚠️  Conflict detection is slow. Consider indexing optimizations.');
    }

    console.log('\n✅ Performance benchmarks complete!');
    console.log('='.repeat(80));
  }
}

// Run if executed directly
if (require.main === module) {
  const performance = new CopilotPerformance();
  performance.runBenchmarks().catch(console.error);
}

module.exports = CopilotPerformance;
