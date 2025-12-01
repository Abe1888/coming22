/**
 * Checksum Validation Script
 * 
 * Validates asset integrity by computing and comparing SHA-256 checksums
 * Ensures assets haven't been corrupted or modified
 * 
 * Usage: node scripts/validate-checksums.js
 */

import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  distDir: join(__dirname, '../dist'),
  manifestPath: join(__dirname, '../dist/asset-manifest.json'),
  criticalAssets: [
    'index.html',
    'assets/three-',
    'assets/react-vendor-',
    'assets/index-'
  ]
};

/**
 * Compute SHA-256 checksum for a file
 */
function computeChecksum(filePath) {
  try {
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  } catch (error) {
    console.error(`❌ Failed to compute checksum for ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Validate checksums against manifest
 */
function validateChecksums() {
  console.log('🔐 Starting checksum validation...\n');

  // Check if manifest exists
  if (!existsSync(CONFIG.manifestPath)) {
    console.error('❌ Asset manifest not found:', CONFIG.manifestPath);
    console.error('   Run `npm run build` first to generate the manifest');
    process.exit(1);
  }

  // Load manifest
  let manifest;
  try {
    const manifestContent = readFileSync(CONFIG.manifestPath, 'utf-8');
    manifest = JSON.parse(manifestContent);
  } catch (error) {
    console.error('❌ Failed to load asset manifest:', error.message);
    process.exit(1);
  }

  console.log(`📋 Loaded manifest with ${manifest.assets.length} assets`);
  console.log(`   Build ID: ${manifest.buildId}`);
  console.log(`   Build Time: ${manifest.buildTime}\n`);

  // Validate each asset
  let validCount = 0;
  let invalidCount = 0;
  let missingCount = 0;
  const errors = [];

  manifest.assets.forEach((asset) => {
    const assetPath = join(CONFIG.distDir, asset.path);
    
    // Check if file exists
    if (!existsSync(assetPath)) {
      console.error(`❌ Missing: ${asset.path}`);
      missingCount++;
      errors.push(`Missing file: ${asset.path}`);
      return;
    }

    // Compute current checksum
    const currentChecksum = computeChecksum(assetPath);
    
    if (!currentChecksum) {
      invalidCount++;
      errors.push(`Failed to compute checksum: ${asset.path}`);
      return;
    }

    // Compare checksums
    if (currentChecksum === asset.checksum) {
      console.log(`✅ Valid: ${asset.name} (${asset.type})`);
      validCount++;
    } else {
      console.error(`❌ Checksum mismatch: ${asset.path}`);
      console.error(`   Expected: ${asset.checksum}`);
      console.error(`   Got:      ${currentChecksum}`);
      invalidCount++;
      errors.push(`Checksum mismatch: ${asset.path}`);
    }
  });

  // Validate critical assets
  console.log('\n🔍 Checking critical assets...');
  const criticalMissing = [];
  
  CONFIG.criticalAssets.forEach((pattern) => {
    const found = manifest.assets.some(asset => 
      asset.path.includes(pattern) || asset.name.includes(pattern)
    );
    
    if (found) {
      console.log(`✅ Critical asset found: ${pattern}`);
    } else {
      console.error(`❌ Critical asset missing: ${pattern}`);
      criticalMissing.push(pattern);
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Checksum Validation Summary');
  console.log('='.repeat(60));
  console.log(`Total assets:     ${manifest.assets.length}`);
  console.log(`✅ Valid:         ${validCount}`);
  console.log(`❌ Invalid:       ${invalidCount}`);
  console.log(`⚠️  Missing:       ${missingCount}`);
  console.log(`🔴 Critical missing: ${criticalMissing.length}`);
  console.log('='.repeat(60));

  // Exit with error if validation failed
  if (invalidCount > 0 || missingCount > 0 || criticalMissing.length > 0) {
    console.error('\n❌ Checksum validation FAILED\n');
    
    if (errors.length > 0) {
      console.error('Errors:');
      errors.forEach(error => console.error(`  - ${error}`));
    }
    
    if (criticalMissing.length > 0) {
      console.error('\nCritical assets missing:');
      criticalMissing.forEach(asset => console.error(`  - ${asset}`));
    }
    
    process.exit(1);
  }

  console.log('\n✅ Checksum validation PASSED\n');
  process.exit(0);
}

// Run validation
validateChecksums();
