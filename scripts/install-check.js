/**
 * Installation Check Script
 * 检查基础架构是否完整
 */

const fs = require('fs');
const path = require('path');

class InstallationChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 基础架构安装检查');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  }

  async checkAll() {
    console.log('📋 检查项目结构...');
    await this.checkProjectStructure();
    
    console.log('');
    console.log('📋 检查配置文件...');
    await this.checkConfigurationFiles();
    
    console.log('');
    console.log('📋 检查文档...');
    await this.checkDocumentation();
    
    console.log('');
    console.log('📋 检查 Ollama 模型...');
    await this.checkOllamaModels();
    
    console.log('');
    console.log('📋 检查依赖...');
    await this.checkDependencies();
    
    console.log('');
    console.log('📋 检查测试...');
    await this.checkTests();
    
    console.log('');
    this.printSummary();
  }

  async checkProjectStructure() {
    const requiredFiles = [
      'package.json',
      'README.md',
      'src/ai-video-generation/index.js',
      'src/ai-video-generation/async-generator.js',
      'src/ai-video-generation/mode-ultra.js',
      'src/ai-video-generation/mode-32k.js',
      'scripts/video-cli.js',
      'scripts/switch-ultra.js',
      'scripts/ultra-train.js',
      'scripts/switch-to-ultra.js',
      'scripts/check-status.js',
      'scripts/rollback-to-default.js',
      'config/modes-backup.json'
    ];

    const missingFiles = [];
    requiredFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      } else {
        this.successes.push(`✅ ${file}`);
      }
    });

    if (missingFiles.length > 0) {
      this.errors.push(`缺失文件：${missingFiles.join(', ')}`);
    }
  }

  async checkConfigurationFiles() {
    // 检查模式备份配置
    const backupPath = path.join(__dirname, '..', 'config', 'modes-backup.json');
    try {
      const content = fs.readFileSync(backupPath, 'utf8');
      const config = JSON.parse(content);
      
      if (config.version && config.current_mode && config.ultra_mode) {
        this.successes.push('✅ 模式备份配置完整');
      } else {
        this.errors.push('❌ 模式备份配置不完整');
      }
    } catch (error) {
      this.errors.push(`❌ 模式备份配置读取失败：${error.message}`);
    }

    // 检查 16K 极致模式配置
    const modeUltraPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-ultra.js');
    try {
      const content = fs.readFileSync(modeUltraPath, 'utf8');
      const hasContext = content.includes("context: '16k'");
      const hasBuffer = content.includes("buffer: 'huge'");
      const hasBatch = content.includes('batch: 4096');
      
      if (hasContext && hasBuffer && hasBatch) {
        this.successes.push('✅ 16K 极致模式配置正确');
      } else {
        this.warnings.push('⚠️  16K 极致模式配置可能不完整');
      }
    } catch (error) {
      this.errors.push(`❌ 16K 极致模式配置读取失败：${error.message}`);
    }

    // 检查 32K 全能模式配置
    const mode32kPath = path.join(__dirname, '..', 'src', 'ai-video-generation', 'mode-32k.js');
    try {
      const content = fs.readFileSync(mode32kPath, 'utf8');
      const hasContext = content.includes("context: '32k'");
      const hasBuffer = content.includes("buffer: 'large'");
      const hasBatch = content.includes('batch: 1536');
      
      if (hasContext && hasBuffer && hasBatch) {
        this.successes.push('✅ 32K 全能模式配置正确');
      } else {
        this.warnings.push('⚠️  32K 全能模式配置可能不完整');
      }
    } catch (error) {
      this.errors.push(`❌ 32K 全能模式配置读取失败：${error.message}`);
    }
  }

  async checkDocumentation() {
    const requiredDocs = [
      'docs/README.md',
      'docs/PHASE2_AI_VIDEO_GENERATION.md',
      'docs/BASE_CONFIG.md',
      'docs/MODE_32K_ALLAROUND.md'
    ];

    const missingDocs = [];
    requiredDocs.forEach(doc => {
      const docPath = path.join(__dirname, '..', doc);
      if (!fs.existsSync(docPath)) {
        missingDocs.push(doc);
      } else {
        this.successes.push(`✅ ${doc}`);
      }
    });

    if (missingDocs.length > 0) {
      this.warnings.push(`⚠️  缺少文档：${missingDocs.join(', ')}`);
    }
  }

  async checkOllamaModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      
      const installedModels = data.models.map(m => m.name);
      
      const requiredModels = [
        'qwen-128k:latest',
        'qwen-64k:latest',
        'qwen3.5:35b'
      ];

      const missingModels = requiredModels.filter(model => !installedModels.includes(model));
      
      if (missingModels.length === 0) {
        this.successes.push('✅ 所有必要模型已安装');
      } else {
        this.errors.push(`❌ 缺失模型：${missingModels.join(', ')}`);
      }

      console.log('');
      console.log('📋 已安装模型:');
      installedModels.forEach(model => {
        this.successes.push(`   - ${model}`);
      });

    } catch (error) {
      this.errors.push(`❌ 无法连接 Ollama 服务：${error.message}`);
    }
  }

  async checkDependencies() {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const requiredDeps = ['uuid', 'ollama', 'axios'];
      const missingDeps = [];

      requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          this.successes.push(`✅ ${dep} 已安装`);
        } else {
          missingDeps.push(dep);
        }
      });

      if (missingDeps.length > 0) {
        this.errors.push(`❌ 缺失依赖：${missingDeps.join(', ')}`);
      }

    } catch (error) {
      this.errors.push(`❌ package.json 读取失败：${error.message}`);
    }
  }

  async checkTests() {
    const testFiles = [
      'tests/unit.test.js',
      'tests/auth.test.js',
      'tests/rbac.test.js',
      'tests/database.test.js',
      'tests/ai-video-generation.test.js',
      'tests/mode-configuration.test.js'
    ];

    const existingTests = [];
    const missingTests = [];

    testFiles.forEach(test => {
      const testPath = path.join(__dirname, '..', test);
      if (fs.existsSync(testPath)) {
        existingTests.push(test);
      } else {
        missingTests.push(test);
      }
    });

    this.successes.push(`✅ 测试文件：${existingTests.length}个存在`);
    
    if (missingTests.length > 0) {
      this.warnings.push(`⚠️  缺少测试：${missingTests.join(', ')}`);
    }
  }

  printSummary() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 检查总结');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    console.log(`✅ 成功：${this.successes.length}项`);
    console.log(`⚠️  警告：${this.warnings.length}项`);
    console.log(`❌ 错误：${this.errors.length}项`);
    console.log('');

    if (this.successes.length > 0) {
      console.log('📋 成功项:');
      this.successes.forEach(item => {
        console.log(`   ${item}`);
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  警告:');
      this.warnings.forEach(item => {
        console.log(`   ${item}`);
      });
      console.log('');
    }

    if (this.errors.length > 0) {
      console.log('❌ 错误:');
      this.errors.forEach(item => {
        console.log(`   ${item}`);
      });
      console.log('');
      console.log('💡 建议:');
      console.log('   1. 检查缺失的文件/配置');
      console.log('   2. 运行 npm install 安装依赖');
      console.log('   3. 确保 Ollama 服务正在运行');
      console.log('   4. 重新生成配置文件');
      console.log('');
    }

    if (this.errors.length === 0) {
      console.log('🎉 基础架构检查通过!');
      console.log('');
      console.log('📋 下一步操作:');
      console.log('   1. 切换到 32K 全能模式：node scripts/switch-to-32k.js');
      console.log('   2. 切换到 16K 极致模式：node scripts/switch-to-ultra.js');
      console.log('   3. 启动训练：node scripts/ultra-train.js');
      console.log('   4. 生成视频：node scripts/video-cli.js generate "提示词"');
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
  }
}

// 运行检查
async function main() {
  const checker = new InstallationChecker();
  await checker.checkAll();
}

main().catch(console.error);
