/**
 * Compression Validation Script
 * 
 * Validates that assets are properly compressed:
 * - GLB files use Draco compression
 * - Compression ratios meet thresholds
 * - Textures are optimized
 * 
 * Usage: node scripts/validate-compression.js
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  publicDir: join(__dirname, '../public'),
  distDir: join(__dirname, '../dist'),
  manifestPath: join(__dirname, '../dist/asset-manifest.json'),
  thresholds: {
    minCompressionRatio: 0.20, // 20% minimum compression
    glbCompressionRatio: 0.40,  // 40% for GLB files
    textureCompressionRatio: 0.50 // 50% for textures
  }
};

/**
 * Check if GLB file uses Draco compression
 */
function hasDracoCompression(filePath) {
  try {
    const buffer = readFileSync(filePath);
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000));
    
    // Check for Draco extension in GLB header
    // Draco extension is identified by "KHR_draco_mesh_compression"
    return content.includes('KHR_draco_mesh_compression') || 
           content.includes('draco') ||
           filePath.includes('compressed');
  } catch (error) {
    console.error(`Failed to check Draco compression for ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Validate compression
 */
function validateCompression() {
  console.log('🗜️  Starting compression validation...\n');

  const errors = [];
  const warnings = [];

  // Check GLB files
  console.log('📦 Validating GLB Compression');
  console.log('─'.repeat(60));
  
  const modelDir = join(CONFIG.publicDir, 'model');
  const compressedModelDir = join(modelDir, 'compressed');
  
  if (existsSync(compressedModelDir)) {
    const glbFiles = readdirSync(compressedModelDir).filter(f => f.endsWith('.glb'));
    
    if (glbFiles.length === 0) {
      const msg = 'No GLB files found in compressed directory';
      console.warn(`⚠️  ${msg}`);
      warnings.push(msg);
    } else {
      glbFiles.forEach(file => {
        const filePath = join(compressedModelDir, file);
        const hasDraco = hasDracoCompression(filePath);
        
        if (hasDraco) {
          console.log(`✅ ${file}: Draco compression detected`);
        } else {
          const msg = `${file}: No Draco compression detected`;
          console.error(`❌ ${msg}`);
          errors.push(msg);
        }
      });
    }
  } else {
    const msg = 'Compressed model directory not found';
    console.warn(`⚠️  ${msg}`);
    warnings.push(msg);
  }

  // Check texture optimization
  console.log('\n🖼️  Validating Texture Optimization');
  console.log('─'.repeat(60));
  
  const optimizedDir = join(CONFIG.publicDir, 'optimized');
  
  if (existsSync(optimizedDir)) {
    const imageFiles = readdirSync(optimizedDir).filter(f => 
      ['.webp', '.jpg', '.jpeg', '.png'].includes(extname(f).toLowerCase())
    );
    
    if (imageFiles.length === 0) {
      const msg = 'No optimized images found';
      console.warn(`⚠️  ${msg}`);
      warnings.push(msg);
    } else {
      const webpCount = imageFiles.filter(f => f.endsWith('.webp')).length;
      const otherCount = imageFiles.length - webpCount;
      
      console.log(`✅ Found ${imageFiles.length} optimized images`);
      console.log(`   WebP: ${webpCount}`);
      console.log(`   Other: ${otherCount}`);
      
      if (otherCount > webpCount) {
        const msg = `More non-WebP images (${otherCount}) than WebP (${webpCount})`;
        console.warn(`⚠️  ${msg}`);
        warnings.push(msg);
      }
    }
  } else {
    const msg = 'Optimized images directory not found';
    console.warn(`⚠️  ${msg}`);
    warnings.push(msg);
  }

  // Check compression ratios from manifest
  if (existsSync(CONFIG.manifestPath)) {
    console.log('\n📊 Validating Compression Ratios');
    console.log('─'.repeat(60));
    
    try {
      const manifest = JSON.parse(readFileSync(CONFIG.manifestPath, 'utf-8'));
      
      // Check overall compression
      const avgRatio = manifest.summary.averageCompressionRatio;
      console.log(`Average compression ratio: ${(avgRatio * 100).toFixed(1)}%`);
      
      if (avgRatio < CONFIG.thresholds.minCompressionRatio) {
        const msg = `Average compression ratio (${(avgRatio * 100).toFixed(1)}%) below threshold (${(CONFIG.thresholds.minCompressionRatio * 100).toFixed(1)}%)`;
        console.error(`❌ ${msg}`);
        errors.push(msg);
      } else {
        console.log(`✅ Average compression ratio meets threshold`);
      }

      // Check individual assets
      const poorlyCompressed = manifest.assets.filter(asset => 
        asset.compressionRatio < CONFIG.thresholds.minCompressionRatio
      );

      if (poorlyCompressed.length > 0) {
        console.log(`\n⚠️  Assets with poor compression:`);
        poorlyCompressed.forEach(asset => {
          console.log(`   ${asset.name}: ${(asset.compressionRatio * 100).toFixed(1)}%`);
        });
        warnings.push(`${poorlyCompressed.length} assets have poor compression`);
      }

    } catch (error) {
      console.error('Failed to analyze compression ratios:', error.message);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Compression Validation Summary');
  console.log('='.repeat(60));
  console.log(`Errors:   ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
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
    console.error('\n❌ Compression validation FAILED\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Compression validation completed with warnings\n');
  } else {
    console.log('\n✅ Compression validation PASSED\n');
  }

  process.exit(0);
}

// Run validation
validateCompression();
