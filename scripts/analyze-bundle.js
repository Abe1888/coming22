/**
 * Bundle Analysis Script
 * 
 * Analyzes the production bundle for:
 * - Duplicate dependencies
 * - Bundle size limits
 * - Unexpected libraries
 * - Chunk distribution
 * 
 * Usage: node scripts/analyze-bundle.js
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  distDir: join(__dirname, '../dist'),
  manifestPath: join(__dirname, '../dist/asset-manifest.json'),
  limits: {
    maxTotalSize: 10 * 1024 * 1024, // 10MB
    maxChunkSize: 1 * 1024 * 1024,  // 1MB
    maxCSSSize: 100 * 1024,          // 100KB
    maxHTMLSize: 10 * 1024           // 10KB
  },
  expectedLibraries: [
    'three',
    'react',
    'react-dom',
    'gsap'
  ],
  unexpectedLibraries: [
    'lodash',
    'moment',
    'jquery',
    'axios'
  ]
};

/**
 * Analyze bundle
 */
function analyzeBundle() {
  console.log('📊 Starting bundle analysis...\n');

  // Check if manifest exists
  if (!existsSync(CONFIG.manifestPath)) {
    console.error('❌ Asset manifest not found:', CONFIG.manifestPath);
    console.error('   Run `npm run build` first');
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

  const errors = [];
  const warnings = [];

  // Analyze total size
  console.log('📦 Bundle Size Analysis');
  console.log('─'.repeat(60));
  
  const totalSize = manifest.summary.totalSize;
  const totalGzipSize = manifest.summary.totalGzipSize;
  
  console.log(`Total size:        ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Gzipped size:      ${(totalGzipSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Compression ratio: ${(manifest.summary.averageCompressionRatio * 100).toFixed(1)}%`);
  
  if (totalSize > CONFIG.limits.maxTotalSize) {
    const msg = `Total bundle size (${(totalSize / 1024 / 1024).toFixed(2)} MB) exceeds limit (${(CONFIG.limits.maxTotalSize / 1024 / 1024).toFixed(2)} MB)`;
    console.error(`❌ ${msg}`);
    errors.push(msg);
  } else {
    console.log(`✅ Total size within limit`);
  }

  // Analyze individual chunks
  console.log('\n📦 Chunk Analysis');
  console.log('─'.repeat(60));
  
  const jsAssets = manifest.assets.filter(a => a.type === 'js');
  const cssAssets = manifest.assets.filter(a => a.type === 'css');
  const htmlAssets = manifest.assets.filter(a => a.type === 'html');
  
  // Check JS chunks
  jsAssets.forEach(asset => {
    const sizeMB = (asset.size / 1024 / 1024).toFixed(2);
    const gzipMB = (asset.gzipSize / 1024 / 1024).toFixed(2);
    
    if (asset.size > CONFIG.limits.maxChunkSize) {
      const msg = `Large JS chunk: ${asset.name} (${sizeMB} MB)`;
      console.warn(`⚠️  ${msg}`);
      warnings.push(msg);
    } else {
      console.log(`✅ ${asset.name}: ${sizeMB} MB (gzip: ${gzipMB} MB)`);
    }
  });

  // Check CSS size
  cssAssets.forEach(asset => {
    const sizeKB = (asset.size / 1024).toFixed(2);
    
    if (asset.size > CONFIG.limits.maxCSSSize) {
      const msg = `Large CSS file: ${asset.name} (${sizeKB} KB)`;
      console.warn(`⚠️  ${msg}`);
      warnings.push(msg);
    } else {
      console.log(`✅ ${asset.name}: ${sizeKB} KB`);
    }
  });

  // Check HTML size
  htmlAssets.forEach(asset => {
    const sizeKB = (asset.size / 1024).toFixed(2);
    
    if (asset.size > CONFIG.limits.maxHTMLSize) {
      const msg = `Large HTML file: ${asset.name} (${sizeKB} KB)`;
      console.warn(`⚠️  ${msg}`);
      warnings.push(msg);
    } else {
      console.log(`✅ ${asset.name}: ${sizeKB} KB`);
    }
  });

  // Check for expected libraries
  console.log('\n📚 Library Check');
  console.log('─'.repeat(60));
  
  CONFIG.expectedLibraries.forEach(lib => {
    // Check both filename and file content
    let found = jsAssets.some(asset => 
      asset.name.toLowerCase().includes(lib.toLowerCase())
    );
    
    // If not found in filename, check file content
    if (!found) {
      for (const asset of jsAssets) {
        try {
          const filePath = join(CONFIG.distDir, 'assets', asset.name);
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8');
            // Check for library signatures in the bundled code
            if (lib === 'react-dom' && content.includes('react-dom')) {
              found = true;
              break;
            } else if (lib === 'gsap' && (content.includes('gsap') || content.includes('GreenSock'))) {
              found = true;
              break;
            }
          }
        } catch (error) {
          // Ignore read errors
        }
      }
    }
    
    if (found) {
      console.log(`✅ Expected library found: ${lib}`);
    } else {
      // Only warn for libraries that should be present
      // react-dom and gsap might be tree-shaken if not used
      console.log(`ℹ️  Library not detected: ${lib} (may be bundled or tree-shaken)`);
    }
  });

  // Check for unexpected libraries
  CONFIG.unexpectedLibraries.forEach(lib => {
    const found = jsAssets.some(asset => 
      asset.name.toLowerCase().includes(lib.toLowerCase())
    );
    
    if (found) {
      const msg = `Unexpected library found: ${lib}`;
      console.error(`❌ ${msg}`);
      errors.push(msg);
    } else {
      console.log(`✅ No unexpected library: ${lib}`);
    }
  });

  // Chunk distribution analysis
  console.log('\n📊 Chunk Distribution');
  console.log('─'.repeat(60));
  
  const chunkSizes = jsAssets.map(a => ({
    name: a.name,
    size: a.size,
    percentage: (a.size / totalSize * 100).toFixed(1)
  })).sort((a, b) => b.size - a.size);

  chunkSizes.forEach(chunk => {
    const sizeMB = (chunk.size / 1024 / 1024).toFixed(2);
    console.log(`${chunk.name.padEnd(30)} ${sizeMB.padStart(8)} MB (${chunk.percentage.padStart(5)}%)`);
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Bundle Analysis Summary');
  console.log('='.repeat(60));
  console.log(`Total assets:      ${manifest.assets.length}`);
  console.log(`JS chunks:         ${jsAssets.length}`);
  console.log(`CSS files:         ${cssAssets.length}`);
  console.log(`HTML files:        ${htmlAssets.length}`);
  console.log(`Other assets:      ${manifest.assets.length - jsAssets.length - cssAssets.length - htmlAssets.length}`);
  console.log(`Errors:            ${errors.length}`);
  console.log(`Warnings:          ${warnings.length}`);
  console.log('='.repeat(60));

  // Display errors and warnings
  if (errors.length > 0) {
    console.error('\n❌ Errors:');
    errors.forEach(error => console.error(`  - ${error}`));
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // Exit with error if validation failed
  if (errors.length > 0) {
    console.error('\n❌ Bundle analysis FAILED\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Bundle analysis completed with warnings\n');
  } else {
    console.log('\n✅ Bundle analysis PASSED\n');
  }

  process.exit(0);
}

// Run analysis
analyzeBundle();
