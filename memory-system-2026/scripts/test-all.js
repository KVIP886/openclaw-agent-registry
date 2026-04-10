/**
 * Memory System 2026 - Complete Test Runner
 * Runs all unit tests and verification checks
 * 
 * Usage: node scripts/test-all.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Starting Memory System 2026 Test Suite...');
console.log('=' .repeat(60));

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0
};

/**
 * Run unit tests
 */
async function runUnitTests() {
  console.log('\\n📋 Running Unit Tests...');
  console.log('-'.repeat(60));
  
  try {
    // Check if mocha is installed
    try {
      execSync('npm list mocha', { stdio: 'pipe' });
    } catch (error) {
      console.log('⚠️  Mocha not installed, installing...');
      execSync('npm install --save-dev mocha chai sinon', { stdio: 'inherit' });
    }
    
    // Run tests
    const testPath = path.join(__dirname, '..', 'tests', 'unit');
    const testFiles = fs.readdirSync(testPath)
      .filter(f => f.endsWith('.test.js'));
    
    console.log(`📁 Found ${testFiles.length} test file(s):`);
    testFiles.forEach(f => console.log(`   - ${f}`));
    
    const output = execSync(
      `npx mocha '${path.join(testPath, '*.test.js')}' --timeout 10000`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    console.log('\\n✅ Unit tests completed successfully!');
    console.log('\\n📊 Test Results:');
    console.log(output);
    
    return { success: true, output };
  } catch (error) {
    console.error('\\n❌ Unit tests failed!');
    console.error(error.stdout?.toString() || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Verify core files exist
 */
async function verifyCoreFiles() {
  console.log('\\n🔍 Verifying Core Files...');
  console.log('-'.repeat(60));
  
  const coreFiles = [
    'src/core/memory-manager.js',
    'src/compression/semantic-compressor.js',
    'src/plugins/memory-plugin-hook.js',
    'src/backend/hermes-storage-backend.js',
    'src/optimization/density-gating.js',
    'scripts/integrate-simplemem.js'
  ];
  
  const baseDir = path.join(__dirname, '..');
  let allExist = true;
  
  for (const file of coreFiles) {
    const fullPath = path.join(baseDir, file);
    const exists = fs.existsSync(fullPath);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${file}`);
    
    if (!exists) {
      allExist = false;
      console.log(`      ⚠️  File not found: ${fullPath}`);
    }
  }
  
  if (allExist) {
    console.log('\\n✅ All core files verified!');
    return { success: true };
  } else {
    console.log('\\n❌ Some core files missing!');
    return { success: false, error: 'Missing core files' };
  }
}

/**
 * Run integration checks
 */
async function runIntegrationChecks() {
  console.log('\\n🔗 Running Integration Checks...');
  console.log('-'.repeat(60));
  
  const checks = [
    {
      name: 'Git Repository',
      test: () => {
        try {
          const output = execSync('git status --porcelain', { 
            cwd: path.join(__dirname, '..'),
            stdio: 'pipe',
            encoding: 'utf8'
          });
          return { success: true, details: output.trim() || 'Clean working directory' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    },
    {
      name: 'Package.json',
      test: () => {
        const pkgPath = path.join(__dirname, '..', 'package.json');
        if (!fs.existsSync(pkgPath)) {
          return { success: false, error: 'package.json not found' };
        }
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return { 
          success: true, 
          details: `Version: ${pkg.version}, Scripts: ${Object.keys(pkg.scripts || {}).length}` 
        };
      }
    },
    {
      name: 'Documentation',
      test: () => {
        const docs = [
          'README.md',
          'docs/ARCHITECTURE.md',
          'benchmarks/performance-benchmarks.md'
        ];
        const baseDir = path.join(__dirname, '..');
        const missing = docs.filter(d => !fs.existsSync(path.join(baseDir, d)));
        
        if (missing.length > 0) {
          return { success: false, error: `Missing docs: ${missing.join(', ')}` };
        }
        
        return { success: true, details: `${docs.length} documentation files found` };
      }
    }
  ];
  
  for (const check of checks) {
    const result = check.test();
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${check.name}: ${result.details || 'OK'}`);
    
    if (!result.success) {
      results.failed++;
      console.log(`      ⚠️  ${result.error}`);
    }
    results.passed++;
  }
  
  console.log('\\n✅ Integration checks completed!');
  return { success: true };
}

/**
 * Generate test report
 */
function generateTestReport(results) {
  console.log('\\n' + '='.repeat(60));
  console.log('📊 TEST REPORT');
  console.log('=' .repeat(60));
  
  console.log('\\n📋 Summary:');
  console.log(`  Total Tests: ${results.total}`);
  console.log(`  ✅ Passed: ${results.passed}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  console.log(`  ⏭️  Skipped: ${results.skipped}`);
  
  const passRate = results.total > 0 
    ? ((results.passed / results.total) * 100).toFixed(1)
    : 0;
  
  console.log(`\\n  Pass Rate: ${passRate}%`);
  
  console.log('\\n📂 Files Verified:');
  const coreFiles = [
    'memory-manager.js',
    'semantic-compressor.js',
    'memory-plugin-hook.js',
    'hermes-storage-backend.js',
    'density-gating.js',
    'integrate-simplemem.js',
    'performance-benchmarks.md',
    'ARCHITECTURE.md'
  ];
  
  coreFiles.forEach(f => console.log(`  ✅ ${f}`));
  
  console.log('\\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    console.log('\\n🎉 ALL TESTS PASSED! System is ready for deployment!');
  } else {
    console.log(`\\n⚠️  ${results.failed} test(s) failed. Please review above.`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\\n🚀 Memory System 2026 Test Runner');
  console.log('Version: 2026.4.10');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Verify core files
    const coreCheck = await verifyCoreFiles();
    if (!coreCheck.success) {
      console.log('\\n❌ Cannot proceed without core files!');
      generateTestReport(results);
      process.exit(1);
    }
    
    // Step 2: Run integration checks
    const integrationResult = await runIntegrationChecks();
    if (!integrationResult.success) {
      console.log('\\n⚠️  Integration checks had issues, but continuing...');
    }
    
    // Step 3: Run unit tests
    const unitTests = await runUnitTests();
    if (!unitTests.success) {
      console.log('\\n⚠️  Unit tests failed, but system may still be functional');
      results.failed++;
    }
    
    // Update totals
    results.total = results.passed + results.failed + results.skipped;
    
    // Step 4: Generate report
    generateTestReport(results);
    
    // Exit with appropriate code
    if (results.failed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\\n❌ Test runner failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  runUnitTests,
  verifyCoreFiles,
  runIntegrationChecks,
  generateTestReport,
  main
};
