/**
 * Mode Configuration Tests
 * 测试所有视频生成模式的配置和切换功能
 */

const fs = require('fs');
const path = require('path');

describe('Mode Configuration Tests', () => {
  
  // 测试文件结构
  describe('Mode Files Structure', () => {
    const expectedFiles = [
      'src/ai-video-generation/mode-ultra.js',
      'src/ai-video-generation/mode-32k.js',
      'scripts/switch-ultra.js',
      'scripts/ultra-train.js',
      'scripts/switch-to-ultra.js',
      'scripts/check-status.js',
      'scripts/rollback-to-default.js',
      'config/modes-backup.json'
    ];

    test('所有模式配置文件应存在', () => {
      const missingFiles = expectedFiles.filter(file => {
        const filePath = path.join(__dirname, '..', file);
        return !fs.existsSync(filePath);
      });

      expect(missingFiles).toEqual([]);
      console.log('✅ 所有模式配置文件存在:', expectedFiles.length, '个');
    });

    test('16K 极致模式配置应存在', () => {
      const modeUltraPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-ultra.js');
      const content = fs.readFileSync(modeUltraPath, 'utf8');
      
      expect(content).toContain('context:');
      expect(content).toContain('buffer:');
      expect(content).toContain('batch:');
      expect(content).toContain('quantization:');
      expect(content).toContain('training_steps:');
      console.log('✅ 16K 极致模式配置完整');
    });

    test('32K 全能模式配置应存在', () => {
      const mode32kPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-32k.js');
      const content = fs.readFileSync(mode32kPath, 'utf8');
      
      expect(content).toContain('context:');
      expect(content).toContain('buffer:');
      expect(content).toContain('batch:');
      expect(content).toContain('quantization:');
      expect(content).toContain('training_steps:');
      console.log('✅ 32K 全能模式配置完整');
    });

    test('模式备份配置文件应存在', () => {
      const backupPath = path.join(__dirname, '..', 'config', 'modes-backup.json');
      const content = fs.readFileSync(backupPath, 'utf8');
      const config = JSON.parse(content);
      
      expect(config).toHaveProperty('version');
      expect(config).toHaveProperty('backup_timestamp');
      expect(config).toHaveProperty('current_mode');
      expect(config).toHaveProperty('ultra_mode');
      expect(config).toHaveProperty('rollback_instructions');
      console.log('✅ 模式备份配置完整');
    });
  });

  // 测试 16K 极致模式配置
  describe('16K Ultra Mode Configuration', () => {
    const expectedConfig = {
      context: '16k',
      buffer: 'huge',
      batch: 4096,
      quantization: 'q4_k_m',
      training_steps: 20000,
      gradient_accumulation: 1,
      learning_rate: 2.5e-5,
      auto_train: true,
      train_interval: 50
    };

    test('16K 极致模式应有正确的上下文配置', () => {
      const modeUltraPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-ultra.js');
      const content = fs.readFileSync(modeUltraPath, 'utf8');
      
      expect(content).toContain("context: '16k'");
      console.log('✅ 16K 极致模式上下文配置正确');
    });

    test('16K 极致模式应有正确的缓存配置', () => {
      const modeUltraPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-ultra.js');
      const content = fs.readFileSync(modeUltraPath, 'utf8');
      
      expect(content).toContain("buffer: 'huge'");
      console.log('✅ 16K 极致模式缓存配置正确');
    });

    test('16K 极致模式应有正确的 batch 配置', () => {
      const modeUltraPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-ultra.js');
      const content = fs.readFileSync(modeUltraPath, 'utf8');
      
      expect(content).toContain('batch: 4096');
      console.log('✅ 16K 极致模式 batch 配置正确');
    });

    test('16K 极致模式应有正确的量化配置', () => {
      const modeUltraPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-ultra.js');
      const content = fs.readFileSync(modeUltraPath, 'utf8');
      
      expect(content).toContain("quantization: 'q4_k_m'");
      console.log('✅ 16K 极致模式量化配置正确');
    });

    test('16K 极致模式应有正确的训练配置', () => {
      const modeUltraPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-ultra.js');
      const content = fs.readFileSync(modeUltraPath, 'utf8');
      
      expect(content).toContain('training_steps: 20000');
      console.log('✅ 16K 极致模式训练步数配置正确');
    });
  });

  // 测试 32K 全能模式配置
  describe('32K All-Around Mode Configuration', () => {
    const expectedConfig = {
      context: '32k',
      buffer: 'large',
      batch: 1536,
      quantization: 'q4_k_m',
      training_steps: 18000,
      gradient_accumulation: 1,
      learning_rate: 1.8e-5,
      auto_train: true,
      train_interval: 50
    };

    test('32K 全能模式应有正确的上下文配置', () => {
      const mode32kPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-32k.js');
      const content = fs.readFileSync(mode32kPath, 'utf8');
      
      expect(content).toContain("context: '32k'");
      console.log('✅ 32K 全能模式上下文配置正确');
    });

    test('32K 全能模式应有正确的缓存配置', () => {
      const mode32kPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-32k.js');
      const content = fs.readFileSync(mode32kPath, 'utf8');
      
      expect(content).toContain("buffer: 'large'");
      console.log('✅ 32K 全能模式缓存配置正确');
    });

    test('32K 全能模式应有正确的 batch 配置', () => {
      const mode32kPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-32k.js');
      const content = fs.readFileSync(mode32kPath, 'utf8');
      
      expect(content).toContain('batch: 1536');
      console.log('✅ 32K 全能模式 batch 配置正确');
    });

    test('32K 全能模式应有正确的量化配置', () => {
      const mode32kPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-32k.js');
      const content = fs.readFileSync(mode32kPath, 'utf8');
      
      expect(content).toContain("quantization: 'q4_k_m'");
      console.log('✅ 32K 全能模式量化配置正确');
    });

    test('32K 全能模式应有正确的训练配置', () => {
      const mode32kPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-32k.js');
      const content = fs.readFileSync(mode32kPath, 'utf8');
      
      expect(content).toContain('training_steps: 18000');
      console.log('✅ 32K 全能模式训练步数配置正确');
    });
  });

  // 测试安全回退机制
  describe('Safety Rollback Mechanism', () => {
    test('回退脚本应存在', () => {
      const rollbackScript = path.join(__dirname, '..', 'scripts', 'rollback-to-default.js');
      expect(fs.existsSync(rollbackScript)).toBe(true);
      console.log('✅ 回退脚本存在');
    });

    test('回退脚本应包含回退逻辑', () => {
      const rollbackScript = path.join(__dirname, '..', 'scripts', 'rollback-to-default.js');
      const content = fs.readFileSync(rollbackScript, 'utf8');
      
      expect(content).toContain('rollback');
      expect(content).toContain('128k');
      expect(content).toContain('ollama run qwen-128k');
      console.log('✅ 回退脚本包含正确逻辑');
    });

    test('状态检查脚本应存在', () => {
      const statusScript = path.join(__dirname, '..', 'scripts', 'check-status.js');
      expect(fs.existsSync(statusScript)).toBe(true);
      console.log('✅ 状态检查脚本存在');
    });

    test('模式备份配置应完整', () => {
      const backupPath = path.join(__dirname, '..', 'config', 'modes-backup.json');
      const content = fs.readFileSync(backupPath, 'utf8');
      const config = JSON.parse(content);
      
      expect(config.current_mode).toBeDefined();
      expect(config.current_mode.name).toBe('qwen-128k-default');
      expect(config.current_mode.model_name).toBe('qwen-128k:latest');
      expect(config.current_mode.context).toBe('128k');
      
      expect(config.ultra_mode).toBeDefined();
      expect(config.ultra_mode.name).toBe('ultra-ultra-performance');
      expect(config.ultra_mode.model_name).toBe('qwen-64k:latest');
      expect(config.ultra_mode.context).toBe('16k');
      
      console.log('✅ 模式备份配置完整');
    });
  });

  // 测试配置完整性
  describe('Configuration Completeness', () => {
    test('16K 极致模式应有性能预期', () => {
      const modeUltraPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-ultra.js');
      const content = fs.readFileSync(modeUltraPath, 'utf8');
      
      expect(content).toContain('4.5-5.5x');
      expect(content).toContain('12-15GB');
      expect(content).toContain('95-98%');
      console.log('✅ 16K 极致模式性能预期完整');
    });

    test('32K 全能模式应有性能预期', () => {
      const mode32kPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-32k.js');
      const content = fs.readFileSync(mode32kPath, 'utf8');
      
      expect(content).toContain('4.0-4.5x');
      expect(content).toContain('13-17GB');
      expect(content).toContain('95-97%');
      console.log('✅ 32K 全能模式性能预期完整');
    });

    test('所有模式应有适用场景说明', () => {
      const modeUltraPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-ultra.js');
      const content = fs.readFileSync(modeUltraPath, 'utf8');
      
      expect(content).toMatch(/适用|适合|recommended/i);
      
      const mode32kPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-32k.js');
      const content32k = fs.readFileSync(mode32kPath, 'utf8');
      
      expect(content32k).toMatch(/适用|适合|recommended/i);
      console.log('✅ 所有模式有适用场景说明');
    });
  });

  // 测试文档完整性
  describe('Documentation Completeness', () => {
    test('BASE_CONFIG.md 应存在', () => {
      const docPath = path.join(__dirname, '..', 'docs', 'BASE_CONFIG.md');
      expect(fs.existsSync(docPath)).toBe(true);
      console.log('✅ BASE_CONFIG.md 文档存在');
    });

    test('MODE_32K_ALLAROUND.md 应存在', () => {
      const docPath = path.join(__dirname, '..', 'docs', 'MODE_32K_ALLAROUND.md');
      expect(fs.existsSync(docPath)).toBe(true);
      console.log('✅ MODE_32K_ALLAROUND.md 文档存在');
    });

    test('文档应包含模式配置说明', () => {
      const docPath = path.join(__dirname, '..', 'docs', 'BASE_CONFIG.md');
      const content = fs.readFileSync(docPath, 'utf8');
      
      expect(content).toContain('32K');
      expect(content).toContain('16K');
      expect(content).toContain('模式配置');
      console.log('✅ 文档包含模式配置说明');
    });

    test('README.md 应更新', () => {
      const readmePath = path.join(__dirname, '..', 'README.md');
      const content = fs.readFileSync(readmePath, 'utf8');
      
      expect(content).toContain('多模式配置系统');
      expect(content).toContain('AReaL 集成');
      console.log('✅ README.md 已更新');
    });
  });

  // 测试实际执行
  describe('Execution Tests', () => {
    test('切换脚本应可执行', () => {
      const switchScript = path.join(__dirname, '..', 'scripts', 'switch-to-ultra.js');
      const content = fs.readFileSync(switchScript, 'utf8');
      
      expect(content).toMatch(/async\s+function\s+switchToUltra/);
      console.log('✅ 切换脚本函数结构正确');
    });

    test('训练脚本应可执行', () => {
      const trainScript = path.join(__dirname, '..', 'scripts', 'ultra-train.js');
      const content = fs.readFileSync(trainScript, 'utf8');
      
      expect(content).toMatch(/async\s+function\s+main/);
      console.log('✅ 训练脚本函数结构正确');
    });

    test('回退脚本应可执行', () => {
      const rollbackScript = path.join(__dirname, '..', 'scripts', 'rollback-to-default.js');
      const content = fs.readFileSync(rollbackScript, 'utf8');
      
      expect(content).toMatch(/async\s+function\s+rollback/);
      console.log('✅ 回退脚本函数结构正确');
    });
  });
});

// 运行测试
async function runTests() {
  console.log('🧪 开始运行模式配置测试...\n');
  
  try {
    await require('jest').runCLI({
      testPathPatterns: ['<rootDir>/tests/mode-configuration.test.js'],
      maxWorkers: 4
    }, ['<rootDir>']);
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
  }
}

// 直接运行
runTests();
