/**
 * AssetLoader - Centralized asset loading utility
 * 
 * Provides:
 * - Environment-agnostic asset path resolution
 * - Progress tracking for all assets
 * - Preloading for critical assets
 * - Consistent loading interface
 * 
 * @example
 * ```typescript
 * const loader = new AssetLoader({
 *   basePath: '/',
 *   useDraco: true,
 *   dracoDecoderPath: '/draco/'
 * });
 * 
 * const model = await loader.loadGLB('/model/truck.glb', (progress) => {
 *   console.log(`Loading: ${progress.percentage}%`);
 * });
 * ```
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export interface AssetLoaderConfig {
  basePath: string;
  useDraco: boolean;
  dracoDecoderPath: string;
  enableProgressTracking: boolean;
  placeholderModel?: string;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
  asset: string;
}

export class AssetLoader {
  private config: AssetLoaderConfig;
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader | null = null;
  private textureLoader: THREE.TextureLoader;
  private loadedAssets: Map<string, any> = new Map();

  constructor(config: AssetLoaderConfig) {
    this.config = config;
    
    // Initialize texture loader
    this.textureLoader = new THREE.TextureLoader();
    
    // Initialize GLTF loader
    this.gltfLoader = new GLTFLoader();
    
    // Initialize Draco loader if enabled
    if (config.useDraco) {
      this.dracoLoader = new DRACOLoader();
      this.dracoLoader.setDecoderPath(config.dracoDecoderPath);
      this.dracoLoader.setWorkerLimit(4);
      this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }
  }

  /**
   * Load a GLB model
   * 
   * @param path - Relative path to GLB file
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to loaded model
   */
  loadGLB(
    path: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<THREE.Group> {
    const fullPath = this.getAssetPath(path);
    
    // Check cache
    if (this.loadedAssets.has(fullPath)) {
      console.log(`📦 Using cached model: ${path}`);
      return Promise.resolve(this.loadedAssets.get(fullPath).clone());
    }
    
    console.log(`📥 Loading GLB: ${fullPath}`);
    
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        fullPath,
        (gltf) => {
          console.log(`✅ GLB loaded: ${path}`);
          
          // Cache the model
          this.loadedAssets.set(fullPath, gltf.scene);
          
          resolve(gltf.scene);
        },
        (xhr) => {
          if (this.config.enableProgressTracking && xhr.lengthComputable && onProgress) {
            const progress: LoadProgress = {
              loaded: xhr.loaded,
              total: xhr.total,
              percentage: (xhr.loaded / xhr.total) * 100,
              asset: path
            };
            onProgress(progress);
          }
        },
        (error) => {
          console.error(`❌ Failed to load GLB: ${path}`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Load a texture
   * 
   * @param path - Relative path to texture file
   * @returns Promise resolving to loaded texture
   */
  loadTexture(path: string): Promise<THREE.Texture> {
    const fullPath = this.getAssetPath(path);
    
    // Check cache
    if (this.loadedAssets.has(fullPath)) {
      console.log(`🖼️ Using cached texture: ${path}`);
      return Promise.resolve(this.loadedAssets.get(fullPath));
    }
    
    console.log(`📥 Loading texture: ${fullPath}`);
    
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        fullPath,
        (texture) => {
          console.log(`✅ Texture loaded: ${path}`);
          
          // Cache the texture
          this.loadedAssets.set(fullPath, texture);
          
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`❌ Failed to load texture: ${path}`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Preload multiple assets
   * 
   * @param paths - Array of asset paths to preload
   * @returns Promise resolving when all assets are loaded
   */
  async preloadAssets(paths: string[]): Promise<void> {
    console.log(`🔄 Preloading ${paths.length} assets...`);
    
    const promises = paths.map(path => {
      if (path.endsWith('.glb') || path.endsWith('.gltf')) {
        return this.loadGLB(path);
      } else {
        return this.loadTexture(path);
      }
    });
    
    try {
      await Promise.all(promises);
      console.log(`✅ All assets preloaded`);
    } catch (error) {
      console.error(`❌ Preload failed:`, error);
      throw error;
    }
  }

  /**
   * Get full asset path (environment-agnostic)
   * 
   * @param relativePath - Relative path from public directory
   * @returns Full path with base URL
   */
  getAssetPath(relativePath: string): string {
    // Ensure path starts with /
    const normalizedPath = relativePath.startsWith('/') 
      ? relativePath 
      : `/${relativePath}`;
    
    // Combine with base path
    return `${this.config.basePath}${normalizedPath}`.replace('//', '/');
  }

  /**
   * Clear asset cache
   * Useful for memory management
   */
  clearCache(): void {
    console.log(`🧹 Clearing asset cache (${this.loadedAssets.size} items)`);
    
    // Dispose cached assets
    this.loadedAssets.forEach((asset, path) => {
      if (asset instanceof THREE.Texture) {
        asset.dispose();
      } else if (asset instanceof THREE.Group) {
        asset.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }
    });
    
    this.loadedAssets.clear();
  }

  /**
   * Get cache statistics
   * @returns Cache info
   */
  getCacheStats(): { count: number; assets: string[] } {
    return {
      count: this.loadedAssets.size,
      assets: Array.from(this.loadedAssets.keys())
    };
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    console.log('🧹 Disposing AssetLoader');
    
    this.clearCache();
    
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
      this.dracoLoader = null;
    }
  }
}

/**
 * Create a configured AssetLoader instance
 * Convenience function with sensible defaults
 * 
 * @param overrides - Optional config overrides
 * @returns Configured AssetLoader
 */
export function createAssetLoader(overrides?: Partial<AssetLoaderConfig>): AssetLoader {
  const defaultConfig: AssetLoaderConfig = {
    basePath: '/',
    useDraco: true,
    dracoDecoderPath: '/draco/',
    enableProgressTracking: true
  };
  
  return new AssetLoader({ ...defaultConfig, ...overrides });
}

/**
 * Load asset with retry logic and exponential backoff
 * 
 * @param loadFn - Function that returns a promise to load the asset
 * @param assetName - Name of asset for logging
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise resolving to loaded asset
 * 
 * @example
 * ```typescript
 * const model = await loadAssetWithRetry(
 *   () => loader.loadGLB('/model/truck.glb'),
 *   'truck.glb',
 *   3
 * );
 * ```
 */
export async function loadAssetWithRetry<T>(
  loadFn: () => Promise<T>,
  assetName: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Loading ${assetName} (attempt ${attempt + 1}/${maxRetries})`);
      return await loadFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Attempt ${attempt + 1} failed for ${assetName}:`, error);
      
      // Don't wait after the last attempt
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`   Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed
  throw new AssetLoadError(
    `Failed to load ${assetName} after ${maxRetries} attempts: ${lastError!.message}`,
    { assetName, attempts: maxRetries, originalError: lastError! }
  );
}

/**
 * Custom error class for asset loading failures
 */
export class AssetLoadError extends Error {
  public context: Record<string, any>;
  
  constructor(message: string, context: Record<string, any> = {}) {
    super(message);
    this.name = 'AssetLoadError';
    this.context = context;
  }
}

/**
 * Create a lightweight placeholder model
 * Used while the actual model is loading to provide immediate visual feedback
 * 
 * @param size - Size of the placeholder (default: 1)
 * @param color - Color of the placeholder (default: brand chrome)
 * @returns Placeholder mesh group
 */
export function createPlaceholderModel(
  size: number = 1.5, 
  color: number = 0x6c6c6c
): THREE.Group {
  const group = new THREE.Group();
  
  // Create a simple box geometry as placeholder truck body
  const bodyGeometry = new THREE.BoxGeometry(size, size * 0.5, size * 2);
  const bodyMaterial = new THREE.MeshBasicMaterial({ 
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.3
  });
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.name = 'placeholder-body';
  
  // Add truck cab
  const cabGeometry = new THREE.BoxGeometry(size * 0.8, size * 0.6, size * 0.8);
  const cabMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xbe202e, // Brand crimson red
    wireframe: true,
    transparent: true,
    opacity: 0.4
  });
  const cab = new THREE.Mesh(cabGeometry, cabMaterial);
  cab.position.set(0, size * 0.3, size * 0.6);
  cab.name = 'placeholder-cab';
  
  // Add simple wheels
  const wheelGeometry = new THREE.CylinderGeometry(size * 0.2, size * 0.2, size * 0.1, 8);
  const wheelMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x1d2635, // Brand dark
    wireframe: true,
    transparent: true,
    opacity: 0.5
  });
  
  const wheelPositions = [
    [-size * 0.4, -size * 0.25, size * 0.6],
    [size * 0.4, -size * 0.25, size * 0.6],
    [-size * 0.4, -size * 0.25, -size * 0.6],
    [size * 0.4, -size * 0.25, -size * 0.6]
  ];
  
  wheelPositions.forEach((pos, i) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(pos[0], pos[1], pos[2]);
    wheel.rotation.z = Math.PI / 2;
    wheel.name = `placeholder-wheel-${i}`;
    group.add(wheel);
  });
  
  group.add(bodyMesh);
  group.add(cab);
  group.name = 'placeholder-truck';
  
  console.log('📦 Created placeholder model');
  
  return group;
}

/**
 * Load GLB with placeholder support
 * Shows a lightweight placeholder immediately, then swaps to real model when loaded
 * 
 * @param loader - AssetLoader instance
 * @param path - Path to GLB file
 * @param scene - Three.js scene to add placeholder to
 * @param onProgress - Progress callback
 * @returns Object with placeholder and promise for real model
 */
export async function loadGLBWithPlaceholder(
  loader: AssetLoader,
  path: string,
  scene: THREE.Scene,
  onProgress?: (progress: LoadProgress) => void
): Promise<{
  placeholder: THREE.Group;
  model: Promise<THREE.Group>;
}> {
  // Create and add placeholder immediately
  const placeholder = createPlaceholderModel(1.5, 0x6c6c6c);
  scene.add(placeholder);
  console.log('🔄 Loading model with placeholder...');
  
  // Start loading real model
  const modelPromise = loadAssetWithRetry(
    () => loader.loadGLB(path, onProgress),
    path,
    3
  ).then((realModel) => {
    // Remove placeholder when real model is ready
    scene.remove(placeholder);
    
    // Dispose placeholder resources
    placeholder.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
    
    console.log('✅ Real model loaded, placeholder removed');
    return realModel;
  }).catch((error) => {
    // Keep placeholder if loading fails
    console.warn('⚠️ Model loading failed, keeping placeholder');
    throw error;
  });
  
  return {
    placeholder,
    model: modelPromise
  };
}
