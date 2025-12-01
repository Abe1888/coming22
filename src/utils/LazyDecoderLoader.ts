/**
 * LazyDecoderLoader - Singleton for lazy-loading Draco/KTX2 decoders
 * 
 * Ensures decoders are:
 * - Loaded only once (singleton pattern)
 * - Initialized on first use (lazy loading)
 * - Loaded asynchronously without blocking main thread
 * - Served from local bundle (not CDN)
 * 
 * @example
 * ```typescript
 * const decoderLoader = LazyDecoderLoader.getInstance({
 *   dracoPath: '/draco/',
 *   workerLimit: 4
 * });
 * 
 * await decoderLoader.initializeDecoders();
 * const dracoLoader = decoderLoader.getDracoLoader();
 * ```
 */

import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

export interface DecoderConfig {
  dracoPath: string;
  ktx2Path?: string;
  workerLimit: number;
}

export class LazyDecoderLoader {
  private static instance: LazyDecoderLoader | null = null;
  
  private dracoLoader: DRACOLoader | null = null;
  private ktx2Loader: KTX2Loader | null = null;
  private initPromise: Promise<void> | null = null;
  private config: DecoderConfig;
  private initialized: boolean = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config: DecoderConfig) {
    this.config = config;
  }

  /**
   * Get singleton instance
   * @param config - Decoder configuration (only used on first call)
   * @returns LazyDecoderLoader instance
   */
  static getInstance(config?: DecoderConfig): LazyDecoderLoader {
    if (!LazyDecoderLoader.instance) {
      if (!config) {
        throw new Error('LazyDecoderLoader: config required for first initialization');
      }
      LazyDecoderLoader.instance = new LazyDecoderLoader(config);
    }
    return LazyDecoderLoader.instance;
  }

  /**
   * Initialize decoders asynchronously
   * Safe to call multiple times - will return existing promise if already initializing
   * 
   * @returns Promise that resolves when decoders are ready
   */
  async initializeDecoders(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) {
      return Promise.resolve();
    }

    // If initialization is in progress, return existing promise
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this.performInitialization();
    
    try {
      await this.initPromise;
      this.initialized = true;
    } catch (error) {
      // Reset promise on error so it can be retried
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Perform actual decoder initialization
   * @private
   */
  private async performInitialization(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Initialize Draco decoder
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath(this.config.dracoPath);
        this.dracoLoader.setWorkerLimit(this.config.workerLimit);
        
        // Preload decoder (async, non-blocking)
        this.dracoLoader.preload();
        
        // KTX2 loader initialization would go here if needed
        // Currently not used, but structure is ready
        if (this.config.ktx2Path) {
          // const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js');
          // this.ktx2Loader = new KTX2Loader();
          // this.ktx2Loader.setTranscoderPath(this.config.ktx2Path);
        }
        
        // Use requestIdleCallback if available, otherwise setTimeout
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => resolve(), { timeout: 1000 });
        } else {
          setTimeout(() => resolve(), 0);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get Draco loader instance
   * Throws error if not initialized
   * 
   * @returns DRACOLoader instance
   */
  getDracoLoader(): DRACOLoader {
    if (!this.dracoLoader) {
      throw new Error('LazyDecoderLoader: Draco loader not initialized. Call initializeDecoders() first.');
    }
    return this.dracoLoader;
  }

  /**
   * Get KTX2 loader instance
   * Throws error if not initialized or not configured
   * 
   * @returns KTX2Loader instance
   */
  getKTX2Loader(): KTX2Loader {
    if (!this.ktx2Loader) {
      throw new Error('LazyDecoderLoader: KTX2 loader not initialized or not configured.');
    }
    return this.ktx2Loader;
  }

  /**
   * Check if decoders are initialized
   * @returns true if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Dispose of decoder resources
   * Should be called on page unload
   */
  dispose(): void {
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
      this.dracoLoader = null;
    }
    
    if (this.ktx2Loader) {
      this.ktx2Loader.dispose();
      this.ktx2Loader = null;
    }
    
    this.initialized = false;
    this.initPromise = null;
    LazyDecoderLoader.instance = null;
  }

  /**
   * Get current configuration
   * @returns Current decoder configuration
   */
  getConfig(): DecoderConfig {
    return { ...this.config };
  }
}

/**
 * Helper function to create and initialize decoder loader
 * Convenience wrapper for common use case
 * 
 * @param config - Decoder configuration
 * @returns Initialized LazyDecoderLoader instance
 * 
 * @example
 * ```typescript
 * const decoderLoader = await createDecoderLoader({
 *   dracoPath: '/draco/',
 *   workerLimit: 4
 * });
 * ```
 */
export async function createDecoderLoader(config: DecoderConfig): Promise<LazyDecoderLoader> {
  const loader = LazyDecoderLoader.getInstance(config);
  await loader.initializeDecoders();
  return loader;
}
