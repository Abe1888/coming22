/**
 * Texture Compression Script
 * 
 * Compresses textures and generates mipmaps for optimal performance
 * Reduces texture file sizes by ~50% while maintaining visual quality
 * 
 * Usage: node scripts/compress-textures.js
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  inputDir: join(__dirname, '../public'),
  outputDir: join(__dirname, '../public/optimized'),
  quality: 85, // JPEG/WebP quality (0-100)
  formats: ['.png', '.jpg', '.jpeg'],
  generateWebP: true,
  generateMipmaps: false // Mipmaps are typically handled by Three.js at runtime
};

/**
 * Compress a single image file
 */
async function compressImage(inputPath, outputPath) {
  const ext = extname(inputPath).toLowerCase();
  const filename = basename(inputPath);
  
  console.log(`\n🖼️  Processing: ${filename}`);
  
  try {
    // Read original file
    const originalSize = readFileSync(inputPath).length;
    console.log(`   Original size: ${(originalSize / 1024).toFixed(2)} KB`);
    
    // Load image with sharp
    let image = sharp(inputPath);
    const metadata = await image.metadata();
    
    console.log(`   Dimensions: ${metadata.width}x${metadata.height}`);
    
    // Optimize based on format
    if (ext === '.png') {
      // PNG optimization
      image = image.png({
        quality: CONFIG.quality,
        compressionLevel: 9,
        adaptiveFiltering: true
      });
    } else if (ext === '.jpg' || ext === '.jpeg') {
      // JPEG optimization
      image = image.jpeg({
        quality: CONFIG.quality,
        progressive: true,
        mozjpeg: true
      });
    }
    
    // Write optimized file
    await image.toFile(outputPath);
    
    const compressedSize = readFileSync(outputPath).length;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    console.log(`   Optimized size: ${(compressedSize / 1024).toFixed(2)} KB`);
    console.log(`   ✅ Compression: ${compressionRatio}% reduction`);
    
    // Generate WebP version if enabled
    if (CONFIG.generateWebP) {
      const webpPath = outputPath.replace(extname(outputPath), '.webp');
      await sharp(inputPath)
        .webp({ quality: CONFIG.quality })
        .toFile(webpPath);
      
      const webpSize = readFileSync(webpPath).length;
      console.log(`   WebP size: ${(webpSize / 1024).toFixed(2)} KB (${((1 - webpSize / originalSize) * 100).toFixed(1)}% reduction)`);
    }
    
    return {
      originalSize,
      compressedSize,
      compressionRatio: parseFloat(compressionRatio)
    };
  } catch (error) {
    console.error(`   ❌ Error processing ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Find all image files recursively
 */
function findImages(dir, fileList = []) {
  const files = readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = join(dir, file.name);
    
    if (file.isDirectory()) {
      // Skip node_modules, dist, and output directory
      if (!['node_modules', 'dist', 'optimized', 'compressed'].includes(file.name)) {
        findImages(fullPath, fileList);
      }
    } else {
      const ext = extname(file.name).toLowerCase();
      if (CONFIG.formats.includes(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  
  return fileList;
}

/**
 * Main compression function
 */
async function main() {
  console.log('🚀 Starting texture compression...\n');
  
  // Ensure output directory exists
  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${CONFIG.outputDir}\n`);
  }
  
  // Find all images
  const images = findImages(CONFIG.inputDir);
  
  if (images.length === 0) {
    console.log('⚠️  No images found to compress');
    return;
  }
  
  console.log(`📊 Found ${images.length} image(s) to process\n`);
  
  const results = [];
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  
  // Process each image
  for (const inputPath of images) {
    const relativePath = inputPath.replace(CONFIG.inputDir, '');
    const outputPath = join(CONFIG.outputDir, relativePath);
    
    // Ensure output subdirectory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    try {
      const result = await compressImage(inputPath, outputPath);
      results.push(result);
      totalOriginalSize += result.originalSize;
      totalCompressedSize += result.compressedSize;
    } catch (error) {
      console.error(`Failed to process ${basename(inputPath)}`);
    }
  }
  
  // Summary
  console.log('\n✨ Compression complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${results.length}`);
  console.log(`   Total original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Total compressed size: ${(totalCompressedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Total reduction: ${((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%`);
  console.log(`   Saved: ${((totalOriginalSize - totalCompressedSize) / 1024 / 1024).toFixed(2)} MB`);
  
  const avgCompression = results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length;
  
  if (avgCompression < 50) {
    console.log(`\n⚠️  Warning: Average compression (${avgCompression.toFixed(1)}%) is below target (50%)`);
    console.log('   Images may already be optimized or are small in size.');
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
