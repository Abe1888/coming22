/**
 * Master Build Validation Script
 * 
 * Runs all validation checks:
 * 1. Checksum validation
 * 2. Bundle analysis
 * 3. Compression validation
 * 
 * Fails the build if any check fails
 * Outputs detailed validation report
 * 
 * Usage: node scripts/validate-build.js
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const VALIDATIONS = [
  {
    name: 'Checksum Validation',
    script: 'validate-checksums.js',
    critical: true
  },
  {
    name: 'Bundle Analysis',
    script: 'analyze-bundle.js',
    critical: true
  },
  {
    name: 'Compression Validation',
    script: 'validate-compression.js',
    critical: false // Warnings only
  }
];

/**
 * Run a validation script
 */
function runValidation(validation) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔍 Running: ${validation.name}`);
    console.log('='.repeat(70));

    const scriptPath = join(__dirname, validation.script);
    // Use quoted path for Windows compatibility
    const child = spawn('node', [`"${scriptPath}"`], {
      stdio: 'inherit',
      shell: true,
      windowsVerbatimArguments: false
    });

    child.on('close', (code) => {
      resolve({
        name: validation.name,
        passed: code === 0,
        critical: validation.critical,
        exitCode: code
      });
    });

    child.on('error', (error) => {
      console.error(`Failed to run ${validation.name}:`, error);
      resolve({
        name: validation.name,
        passed: false,
        critical: validation.critical,
        exitCode: 1,
        error: error.message
      });
    });
  });
}

/**
 * Run all validations
 */
async function validateBuild() {
  console.log('🚀 Starting Build Validation');
  console.log('='.repeat(70));
  console.log(`Running ${VALIDATIONS.length} validation checks...\n`);

  const startTime = Date.now();
  const results = [];

  // Run validations sequentially
  for (const validation of VALIDATIONS) {
    const result = await runValidation(validation);
    results.push(result);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Generate report
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 Build Validation Report');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const criticalFailed = results.filter(r => !r.passed && r.critical).length;

  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    const critical = result.critical ? ' (CRITICAL)' : '';
    console.log(`${status} - ${result.name}${critical}`);
    if (result.error) {
      console.log(`         Error: ${result.error}`);
    }
  });

  console.log('─'.repeat(70));
  console.log(`Total checks:      ${results.length}`);
  console.log(`Passed:            ${passed}`);
  console.log(`Failed:            ${failed}`);
  console.log(`Critical failures: ${criticalFailed}`);
  console.log(`Duration:          ${duration}s`);
  console.log('='.repeat(70));

  // Determine overall result
  if (criticalFailed > 0) {
    console.error('\n❌ BUILD VALIDATION FAILED');
    console.error(`${criticalFailed} critical check(s) failed\n`);
    process.exit(1);
  }

  if (failed > 0) {
    console.warn('\n⚠️  BUILD VALIDATION COMPLETED WITH WARNINGS');
    console.warn(`${failed} non-critical check(s) failed\n`);
    process.exit(0); // Don't fail build for non-critical issues
  }

  console.log('\n✅ BUILD VALIDATION PASSED');
  console.log('All checks completed successfully\n');
  process.exit(0);
}

// Run validation
validateBuild().catch(error => {
  console.error('Fatal error during validation:', error);
  process.exit(1);
});
