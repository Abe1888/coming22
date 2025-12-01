/**
 * Generate Baseline Screenshots Script
 * 
 * This script runs the visual regression tests to generate baseline screenshots.
 * Run this script whenever you make intentional visual changes to the application.
 * 
 * Usage: node scripts/generate-baselines.js
 */

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASELINE_DIR = join(__dirname, '../tests/baselines');

console.log('🎨 Generating baseline screenshots...\n');

// Remove existing baselines
if (existsSync(BASELINE_DIR)) {
  console.log('📁 Removing existing baselines...');
  rmSync(BASELINE_DIR, { recursive: true, force: true });
  console.log('✅ Existing baselines removed\n');
}

// Run Playwright tests to generate new baselines
console.log('🎬 Running visual regression tests...');
try {
  execSync('npx playwright test tests/visual-regression.spec.ts', {
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  });
  
  console.log('\n✅ Baseline screenshots generated successfully!');
  console.log(`📁 Baselines saved to: ${BASELINE_DIR}`);
} catch (error) {
  console.error('\n❌ Failed to generate baselines');
  console.error(error.message);
  process.exit(1);
}
