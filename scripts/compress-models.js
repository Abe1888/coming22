/**
 * GLB Model Compression Script
 * 
 * Compresses GLB files using Draco compression for geometry
 * Reduces file sizes by ~60% while maintaining visual quality
 * 
 * Usage: node scripts/compress-models.js
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, dedup, prune, textureCompress } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  inputDir: join(__dirname, '../public/model'),
  outputDir: join(__dirname, '../public/model/compressed'),
  dracoOptions: {
    method: 'edgebreaker', // Best compression
    encodeSpeed: 5, // Balance between speed and compression (0-10)
    decodeSpeed: 5,
    quantizationBits: {
      POSITION: 14,      // High precision for positions
      NORMAL: 10,        // Medium precision for normals
      COLOR: 8,          // Standard precision for colors
      TEX_COORD: 12,     // High precision for texture coordinates
      GENERIC: 12        // High precision for generic attributes
    }
  }
};

/**
 * Compress a single GLB file
 */
async function compressGLB(inputPath, outputPath) {
  console.log(`\n📦 Compressing: ${basename(inputPath)}`);
  
  try {
    // Read the GLB file
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule(),
        'draco3d.encoder': await draco3d.createEncoderModule(),
      });
    
    const document = await io.read(inputPath);
    
    // Get original size
    const originalSize = readFileSync(inputPath).length;
    console.log(`   Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Apply optimizations
    console.log('   Applying optimizations...');
    
    // 1. Remove duplicate data
    await document.transform(
      dedup()
    );
    
    // 2. Remove unused data
    await document.transform(
      prune()
    );
    
    // 3. Apply Draco compression
    await document.transform(
      draco(CONFIG.dracoOptions)
    );
    
    // Write compressed file
    await io.write(outputPath, document);
    
    // Get compressed size
    const compressedSize = readFileSync(outputPath).length;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    console.log(`   Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✅ Compression ratio: ${compressionRatio}% reduction`);
    
    return {
      originalSize,
      compressedSize,
      compressionRatio: parseFloat(compressionRatio)
    };
  } catch (error) {
    console.error(`   ❌ Error compressing ${basename(inputPath)}:`, error.message);
    throw error;
  }
}

/**
 * Main compression function
 */
async function main() {
  console.log('🚀 Starting GLB compression...\n');
  
  // Ensure output directory exists
  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${CONFIG.outputDir}\n`);
  }
  
  // Find all GLB files in input directory
  const inputFile = join(CONFIG.inputDir, 'Main_truck_updated.glb');
  const outputFile = join(CONFIG.outputDir, 'Main_truck_updated_compressed.glb');
  
  // Check if compressed file already exists
  if (existsSync(outputFile)) {
    console.log('✅ Compressed file already exists:', basename(outputFile));
    console.log('   Skipping compression (file already optimized)');
    console.log('\n✨ Compression check complete!');
    return;
  }
  
  if (!existsSync(inputFile)) {
    console.error('❌ Input file not found:', inputFile);
    console.log('   Expected source file: Main_truck_updated.glb');
    console.log('   If compressed file already exists, this is OK.');
    
    // Check if compressed version exists
    if (existsSync(outputFile)) {
      console.log('✅ Compressed file exists, skipping compression');
      return;
    }
    
    process.exit(1);
  }
  
  
  try {
    const result = await compressGLB(inputFile, outputFile);
    
    console.log('\n✨ Compression complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   Total reduction: ${result.compressionRatio}%`);
    console.log(`   Saved: ${((result.originalSize - result.compressedSize) / 1024 / 1024).toFixed(2)} MB`);
    
    if (result.compressionRatio < 60) {
      console.log(`\n⚠️  Warning: Compression ratio (${result.compressionRatio}%) is below target (60%)`);
      console.log('   This may indicate the file is already compressed or has few vertices.');
    }
    
  } catch (error) {
    console.error('\n❌ Compression failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
