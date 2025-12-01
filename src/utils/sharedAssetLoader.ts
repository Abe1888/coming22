/**
 * Shared AssetLoader instance
 * 
 * Provides a single, configured AssetLoader instance that can be used
 * across all components to ensure consistent asset loading behavior
 * and efficient resource sharing.
 */

import { createAssetLoader, AssetLoader } from './AssetLoader';

// Create shared instance with production-optimized configuration
export const sharedAssetLoader: AssetLoader = createAssetLoader({
  basePath: '/',
  useDraco: true,
  dracoDecoderPath: '/draco/',
  enableProgressTracking: true
});

// Preload critical assets on module load
const criticalAssets = [
  '/model/compressed/Main_truck_updated_compressed.glb',
  '/optimized/logo.webp',
  '/optimized/logo-front-truck.webp',
  '/optimized/Logo-white.webp'
];

// Start preloading in background (non-blocking)
sharedAssetLoader.preloadAssets(criticalAssets).catch(error => {
  console.warn('⚠️ Failed to preload some critical assets:', error);
});

export default sharedAssetLoader;
