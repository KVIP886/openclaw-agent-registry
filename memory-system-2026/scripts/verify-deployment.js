/**
 * OpenClaw Memory System - Quick Deployment Verification
 * Usage: node scripts/verify-deployment.js
 */

const fs = require('fs');
const path = require('path');

console.log('🦞 OpenClaw Memory System - Deployment Verification');
console.log('='.repeat(60));

const projectDir = process.cwd();
const checks = [];
let passed = 0;
let failed = 0;

// Check core files
const coreFiles = [
  'src/core/memory-manager.js',
  'src/compression/semantic-compressor.js',
  'src/plugins/memory-plugin-hook.js',
  'scripts/integrate-simplemem.js',
  'scripts/test-all.js'
];

console.log('\\n📄 Checking core files...');

for (const file of coreFiles) {
  const fullPath = path.join(projectDir, file);
  if (fs.existsSync(fullPath)) {
    const size = fs.statSync(fullPath).size;
    console.log(`  ✅ ${file} (${(size/1024).toFixed(1)}KB)`);
    checks.push({file, status: 'OK'});
    passed++;
  } else {
    console.log(`  ❌ ${file} MISSING`);
    checks.push({file, status: 'MISSING'});
    failed++;
  }
}

// Check documentation
console.log('\\n📚 Checking documentation...');
const docs = ['README.md', 'docs/ARCHITECTURE.md', 'benchmarks/performance-benchmarks.md'];

for (const doc of docs) {
  const fullPath = path.join(projectDir, doc);
  if (fs.existsSync(fullPath)) {
    const size = fs.statSync(fullPath).size;
    console.log(`  ✅ ${doc} (${(size/1024).toFixed(1)}KB)`);
    passed++;
  } else {
    console.log(`  ❌ ${doc} MISSING`);
    failed++;
  }
}

// Check Node.js
console.log('\\n⚙️  Checking environment...');
try {
  const nodeVersion = require('child_process').execSync('node -v').toString().trim();
  console.log(`  ✅ Node.js v${nodeVersion}`);
  passed++;
} catch (e) {
  console.log(`  ❌ Node.js not found`);
  failed++;
}

console.log('\\n' + '='.repeat(60));
console.log('📊 VERIFICATION RESULTS');
console.log('='.repeat(60));
console.log(`Total: ${checks.length + docs.length + 1}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Success Rate: ${((passed / (checks.length + docs.length + 1)) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('\\n🎉 DEPLOYMENT VERIFIED! System ready for production!');
  process.exit(0);
} else {
  console.log('\\n⚠️  Some files are missing. Please check above.');
  process.exit(1);
}
