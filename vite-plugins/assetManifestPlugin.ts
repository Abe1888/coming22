/**
 * Vite Asset Manifest Plugin
 * 
 * Generates a manifest file with asset information:
 * - File names and paths
 * - File sizes (original and gzipped)
 * - SHA-256 checksums
 * - Compression ratios
 * 
 * Output: dist/asset-manifest.json
 */

import { Plugin } from 'vite';
import { createHash } from 'crypto';
import { gzipSync } from 'zlib';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export interface AssetManifestEntry {
  name: string;
  path: string;
  size: number;
  gzipSize: number;
  checksum: string;
  compressionRatio: number;
  type: 'js' | 'css' | 'asset' | 'html';
}

export interface AssetManifest {
  buildTime: string;
  buildId: string;
  assets: AssetManifestEntry[];
  summary: {
    totalAssets: number;
    totalSize: number;
    totalGzipSize: number;
    averageCompressionRatio: number;
  };
}

export function assetManifestPlugin(): Plugin {
  let outDir: string;
  let buildId: string;

  return {
    name: 'asset-manifest-plugin',
    
    configResolved(config) {
      outDir = config.build.outDir;
      buildId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    },

    closeBundle() {
      console.log('📊 Generating asset manifest...');

      const assets: AssetManifestEntry[] = [];
      const distPath = join(process.cwd(), outDir);

      try {
        // Scan dist directory for assets
        const scanDirectory = (dir: string, baseDir: string = '') => {
          const files = readdirSync(dir);

          files.forEach((file: string) => {
            const filePath = join(dir, file);
            const stat = statSync(filePath);

            if (stat.isDirectory()) {
              scanDirectory(filePath, join(baseDir, file));
            } else {
              const relativePath = join(baseDir, file);
              const content = readFileSync(filePath);
              const gzipped = gzipSync(content as any);
              
              // Calculate checksum
              const checksum = createHash('sha256')
                .update(content as any)
                .digest('hex');

              // Determine file type
              let type: AssetManifestEntry['type'] = 'asset';
              if (file.endsWith('.js')) type = 'js';
              else if (file.endsWith('.css')) type = 'css';
              else if (file.endsWith('.html')) type = 'html';

              const entry: AssetManifestEntry = {
                name: file,
                path: relativePath.replace(/\\/g, '/'),
                size: content.length,
                gzipSize: gzipped.length,
                checksum,
                compressionRatio: parseFloat((1 - gzipped.length / content.length).toFixed(3)),
                type
              };

              assets.push(entry);
            }
          });
        };

        scanDirectory(distPath);

        // Calculate summary
        const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
        const totalGzipSize = assets.reduce((sum, asset) => sum + asset.gzipSize, 0);
        const averageCompressionRatio = assets.length > 0
          ? assets.reduce((sum, asset) => sum + asset.compressionRatio, 0) / assets.length
          : 0;

        const manifest: AssetManifest = {
          buildTime: new Date().toISOString(),
          buildId,
          assets: assets.sort((a, b) => b.size - a.size), // Sort by size descending
          summary: {
            totalAssets: assets.length,
            totalSize,
            totalGzipSize,
            averageCompressionRatio: parseFloat(averageCompressionRatio.toFixed(3))
          }
        };

        // Write manifest
        const manifestPath = join(distPath, 'asset-manifest.json');
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        console.log('✅ Asset manifest generated');
        console.log(`   Total assets: ${manifest.summary.totalAssets}`);
        console.log(`   Total size: ${(manifest.summary.totalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Gzipped size: ${(manifest.summary.totalGzipSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Average compression: ${(manifest.summary.averageCompressionRatio * 100).toFixed(1)}%`);

      } catch (error) {
        console.error('❌ Failed to generate asset manifest:', error);
      }
    }
  };
}
