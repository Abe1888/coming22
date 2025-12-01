/**
 * SceneInitializer - Manages correct initialization order for 3D scene
 * 
 * Ensures:
 * - CSS is fully loaded before canvas sizing
 * - Transforms are applied in correct order
 * - Scene initialization happens at the right time
 * - Transform validation against configuration
 * 
 * @example
 * ```typescript
 * const initializer = new SceneInitializer({
 *   transformsPath: '/config/objectTransforms.json'
 * });
 * 
 * await initializer.waitForCSS();
 * const scene = await initializer.initializeScene();
 * initializer.applyTransforms(truckModel, transforms.truck);
 * ```
 */

import * as THREE from 'three';
import { waitForDocumentReady, waitForFrames } from './domHelpers';

export interface SceneConfig {
  transformsPath?: string;
  enableValidation?: boolean;
  logTransforms?: boolean;
}

export interface InitializationState {
  cssLoaded: boolean;
  assetsLoaded: boolean;
  sceneReady: boolean;
  renderingStarted: boolean;
}

export interface ObjectTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number];
}

export interface TransformValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class SceneInitializer {
  private config: SceneConfig;
  private state: InitializationState;
  private transforms: Record<string, ObjectTransform> | null = null;

  constructor(config: SceneConfig = {}) {
    this.config = {
      transformsPath: config.transformsPath || '/config/objectTransforms.json',
      enableValidation: config.enableValidation ?? true,
      logTransforms: config.logTransforms ?? true
    };

    this.state = {
      cssLoaded: false,
      assetsLoaded: false,
      sceneReady: false,
      renderingStarted: false
    };
  }

  /**
   * Wait for CSS to be fully loaded
   * Ensures canvas sizing and layout calculations are accurate
   * 
   * @returns Promise that resolves when CSS is ready
   */
  async waitForCSS(): Promise<void> {
    console.log('⏳ Waiting for CSS to load...');
    
    await waitForDocumentReady();
    
    // Add extra frame delay to ensure layout is stable
    await waitForFrames(2);
    
    this.state.cssLoaded = true;
    console.log('✅ CSS loaded and layout stable');
  }

  /**
   * Initialize the Three.js scene
   * Should be called after CSS is loaded
   * 
   * @returns Promise resolving to initialized scene
   */
  async initializeScene(): Promise<THREE.Scene> {
    if (!this.state.cssLoaded) {
      console.warn('⚠️ CSS not loaded yet, waiting...');
      await this.waitForCSS();
    }

    console.log('🎬 Initializing Three.js scene...');
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1419); // Brand dark background
    
    // Add fog for depth
    scene.fog = new THREE.Fog(0x1d2635, 10, 50);
    
    this.state.sceneReady = true;
    console.log('✅ Scene initialized');
    
    return scene;
  }

  /**
   * Apply transforms to a Three.js object
   * Ensures transforms are applied in correct order: position, rotation, scale
   * 
   * @param object - Three.js object to transform
   * @param transforms - Transform configuration
   */
  applyTransforms(
    object: THREE.Object3D,
    transforms: ObjectTransform
  ): void {
    if (this.config.logTransforms) {
      console.log('🔄 Applying transforms to:', object.name || 'unnamed object');
      console.log('   Position:', transforms.position);
      console.log('   Rotation:', transforms.rotation);
      console.log('   Scale:', transforms.scale);
    }

    // Apply in correct order: position, rotation, scale
    object.position.set(...transforms.position);
    object.rotation.set(...transforms.rotation);
    
    if (typeof transforms.scale === 'number') {
      object.scale.set(transforms.scale, transforms.scale, transforms.scale);
    } else {
      object.scale.set(...transforms.scale);
    }

    if (this.config.logTransforms) {
      console.log('✅ Transforms applied');
    }
  }

  /**
   * Load transform configuration from JSON file
   * 
   * @returns Promise resolving to transforms object
   */
  async loadTransforms(): Promise<Record<string, any>> {
    if (this.transforms) {
      return this.transforms;
    }

    try {
      console.log('📥 Loading transforms from:', this.config.transformsPath);
      
      const response = await fetch(this.config.transformsPath!);
      if (!response.ok) {
        throw new Error(`Failed to load transforms: ${response.statusText}`);
      }
      
      this.transforms = await response.json();
      console.log('✅ Transforms loaded:', Object.keys(this.transforms!));
      
      return this.transforms;
    } catch (error) {
      console.error('❌ Failed to load transforms:', error);
      throw error;
    }
  }

  /**
   * Validate transforms against configuration
   * Checks if applied transforms match expected values
   * 
   * @param objectName - Name of object in config (e.g., 'truck', 'fuelSensor')
   * @param object - Three.js object to validate
   * @param tolerance - Tolerance for floating point comparison (default: 0.001)
   * @returns Validation result
   */
  async validateTransforms(
    objectName: string,
    object: THREE.Object3D,
    tolerance: number = 0.001
  ): Promise<TransformValidationResult> {
    const result: TransformValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!this.config.enableValidation) {
      return result;
    }

    try {
      // Load transforms if not already loaded
      if (!this.transforms) {
        await this.loadTransforms();
      }

      const expectedTransforms = this.transforms![objectName];
      if (!expectedTransforms) {
        result.warnings.push(`No transform configuration found for '${objectName}'`);
        return result;
      }

      // Validate position
      const positionDiff = [
        Math.abs(object.position.x - expectedTransforms.position[0]),
        Math.abs(object.position.y - expectedTransforms.position[1]),
        Math.abs(object.position.z - expectedTransforms.position[2])
      ];

      if (positionDiff.some(diff => diff > tolerance)) {
        result.valid = false;
        result.errors.push(
          `Position mismatch for '${objectName}': ` +
          `expected ${expectedTransforms.position}, ` +
          `got [${object.position.x.toFixed(3)}, ${object.position.y.toFixed(3)}, ${object.position.z.toFixed(3)}]`
        );
      }

      // Validate rotation
      const rotationDiff = [
        Math.abs(object.rotation.x - expectedTransforms.rotation[0]),
        Math.abs(object.rotation.y - expectedTransforms.rotation[1]),
        Math.abs(object.rotation.z - expectedTransforms.rotation[2])
      ];

      if (rotationDiff.some(diff => diff > tolerance)) {
        result.valid = false;
        result.errors.push(
          `Rotation mismatch for '${objectName}': ` +
          `expected ${expectedTransforms.rotation}, ` +
          `got [${object.rotation.x.toFixed(3)}, ${object.rotation.y.toFixed(3)}, ${object.rotation.z.toFixed(3)}]`
        );
      }

      // Validate scale
      const expectedScale = typeof expectedTransforms.scale === 'number'
        ? [expectedTransforms.scale, expectedTransforms.scale, expectedTransforms.scale]
        : expectedTransforms.scale;

      if (expectedScale) {
        const scaleDiff = [
          Math.abs(object.scale.x - expectedScale[0]),
          Math.abs(object.scale.y - expectedScale[1]),
          Math.abs(object.scale.z - expectedScale[2])
        ];

        if (scaleDiff.some(diff => diff > tolerance)) {
          result.valid = false;
          result.errors.push(
            `Scale mismatch for '${objectName}': ` +
            `expected ${expectedScale}, ` +
            `got [${object.scale.x.toFixed(3)}, ${object.scale.y.toFixed(3)}, ${object.scale.z.toFixed(3)}]`
          );
        }
      }

      if (result.valid) {
        console.log(`✅ Transform validation passed for '${objectName}'`);
      } else {
        console.error(`❌ Transform validation failed for '${objectName}':`, result.errors);
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(`Validation error: ${error}`);
    }

    return result;
  }

  /**
   * Get current initialization state
   * 
   * @returns Current state object
   */
  getInitializationState(): InitializationState {
    return { ...this.state };
  }

  /**
   * Mark assets as loaded
   */
  markAssetsLoaded(): void {
    this.state.assetsLoaded = true;
    console.log('✅ Assets marked as loaded');
  }

  /**
   * Mark rendering as started
   */
  markRenderingStarted(): void {
    this.state.renderingStarted = true;
    console.log('✅ Rendering marked as started');
  }

  /**
   * Check if scene is ready for rendering
   * 
   * @returns True if all initialization steps are complete
   */
  isReadyForRendering(): boolean {
    return (
      this.state.cssLoaded &&
      this.state.sceneReady &&
      this.state.assetsLoaded
    );
  }

  /**
   * Reset initialization state
   * Useful for testing or re-initialization
   */
  reset(): void {
    this.state = {
      cssLoaded: false,
      assetsLoaded: false,
      sceneReady: false,
      renderingStarted: false
    };
    this.transforms = null;
    console.log('🔄 SceneInitializer reset');
  }
}

/**
 * Create a configured SceneInitializer instance
 * Convenience function with sensible defaults
 * 
 * @param overrides - Optional config overrides
 * @returns Configured SceneInitializer
 */
export function createSceneInitializer(overrides?: Partial<SceneConfig>): SceneInitializer {
  return new SceneInitializer(overrides);
}
