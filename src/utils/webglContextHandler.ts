/**
 * WebGL Context Loss Handler
 * 
 * Handles WebGL context loss and restoration
 * Provides recovery mechanisms and user notifications
 * 
 * @example
 * ```typescript
 * const handler = new WebGLContextHandler(renderer);
 * handler.onContextLost = () => {
 *   console.log('Context lost, attempting recovery...');
 * };
 * handler.onContextRestored = () => {
 *   console.log('Context restored successfully!');
 * };
 * ```
 */

import * as THREE from 'three';
import { WebGLContextError, errorHandler } from './errors';

export interface WebGLContextHandlerConfig {
  maxRestoreAttempts?: number;
  restoreDelay?: number;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  onRestoreFailed?: () => void;
}

export class WebGLContextHandler {
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private config: Required<WebGLContextHandlerConfig>;
  private restoreAttempts: number = 0;
  private isContextLost: boolean = false;
  private restoreTimeout: number | null = null;

  constructor(
    renderer: THREE.WebGLRenderer,
    config: WebGLContextHandlerConfig = {}
  ) {
    this.renderer = renderer;
    this.canvas = renderer.domElement;

    this.config = {
      maxRestoreAttempts: config.maxRestoreAttempts ?? 3,
      restoreDelay: config.restoreDelay ?? 1000,
      onContextLost: config.onContextLost ?? (() => {}),
      onContextRestored: config.onContextRestored ?? (() => {}),
      onRestoreFailed: config.onRestoreFailed ?? (() => {})
    };

    this.setupEventListeners();
  }

  /**
   * Set up WebGL context event listeners
   */
  private setupEventListeners(): void {
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost.bind(this), false);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored.bind(this), false);
    this.canvas.addEventListener('webglcontextcreationerror', this.handleContextCreationError.bind(this), false);

    console.log('✅ WebGL context loss handlers registered');
  }

  /**
   * Handle context lost event
   */
  private handleContextLost(event: Event): void {
    event.preventDefault();

    this.isContextLost = true;
    console.warn('⚠️ WebGL context lost');

    const error = new WebGLContextError('WebGL context was lost', {
      contextType: 'lost',
      canRecover: true,
      restoreAttempts: this.restoreAttempts,
      maxAttempts: this.config.maxRestoreAttempts
    });

    errorHandler.handle(error);

    // Notify callback
    this.config.onContextLost();

    // Attempt to restore
    this.attemptRestore();
  }

  /**
   * Handle context restored event
   */
  private handleContextRestored(event: Event): void {
    console.log('✅ WebGL context restored');

    this.isContextLost = false;
    this.restoreAttempts = 0;

    if (this.restoreTimeout) {
      clearTimeout(this.restoreTimeout);
      this.restoreTimeout = null;
    }

    // Notify callback
    this.config.onContextRestored();

    // Reinitialize renderer state
    this.reinitializeRenderer();
  }

  /**
   * Handle context creation error
   */
  private handleContextCreationError(event: Event): void {
    console.error('❌ WebGL context creation failed');

    const error = new WebGLContextError('Failed to create WebGL context', {
      contextType: 'creation-failed',
      canRecover: false
    });

    errorHandler.handle(error);
  }

  /**
   * Attempt to restore context
   */
  private attemptRestore(): void {
    if (this.restoreAttempts >= this.config.maxRestoreAttempts) {
      console.error('❌ Max restore attempts reached, giving up');
      this.config.onRestoreFailed();
      return;
    }

    this.restoreAttempts++;
    console.log(`🔄 Attempting to restore context (attempt ${this.restoreAttempts}/${this.config.maxRestoreAttempts})`);

    this.restoreTimeout = window.setTimeout(() => {
      const gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');

      if (gl && !gl.isContextLost()) {
        console.log('✅ Context restored via manual check');
        this.handleContextRestored(new Event('webglcontextrestored'));
      } else if (this.restoreAttempts < this.config.maxRestoreAttempts) {
        // Try again
        this.attemptRestore();
      } else {
        console.error('❌ Failed to restore context after all attempts');
        this.config.onRestoreFailed();
      }
    }, this.config.restoreDelay * this.restoreAttempts); // Exponential backoff
  }

  /**
   * Reinitialize renderer after context restoration
   */
  private reinitializeRenderer(): void {
    try {
      // Force renderer to reinitialize
      this.renderer.setSize(this.canvas.width, this.canvas.height);
      this.renderer.setPixelRatio(window.devicePixelRatio);

      console.log('✅ Renderer reinitialized after context restoration');
    } catch (error) {
      console.error('❌ Failed to reinitialize renderer:', error);
    }
  }

  /**
   * Check if context is currently lost
   */
  isLost(): boolean {
    return this.isContextLost;
  }

  /**
   * Get restore attempt count
   */
  getRestoreAttempts(): number {
    return this.restoreAttempts;
  }

  /**
   * Force context loss (for testing)
   */
  forceContextLoss(): void {
    const ext = this.renderer.getContext().getExtension('WEBGL_lose_context');
    if (ext) {
      ext.loseContext();
      console.log('🧪 Forced context loss for testing');
    } else {
      console.warn('⚠️ WEBGL_lose_context extension not available');
    }
  }

  /**
   * Force context restore (for testing)
   */
  forceContextRestore(): void {
    const ext = this.renderer.getContext().getExtension('WEBGL_lose_context');
    if (ext) {
      ext.restoreContext();
      console.log('🧪 Forced context restore for testing');
    } else {
      console.warn('⚠️ WEBGL_lose_context extension not available');
    }
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost.bind(this));
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored.bind(this));
    this.canvas.removeEventListener('webglcontextcreationerror', this.handleContextCreationError.bind(this));

    if (this.restoreTimeout) {
      clearTimeout(this.restoreTimeout);
    }

    console.log('🧹 WebGL context handlers disposed');
  }
}

/**
 * Create and configure WebGL context handler
 * 
 * @param renderer - Three.js WebGL renderer
 * @param config - Handler configuration
 * @returns Configured context handler
 */
export function createWebGLContextHandler(
  renderer: THREE.WebGLRenderer,
  config?: WebGLContextHandlerConfig
): WebGLContextHandler {
  return new WebGLContextHandler(renderer, config);
}

/**
 * Check if WebGL is supported
 * 
 * @returns True if WebGL is supported
 */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * Get WebGL capabilities
 * 
 * @returns Object with WebGL capabilities
 */
export function getWebGLCapabilities(): {
  supported: boolean;
  version: 'webgl' | 'webgl2' | null;
  maxTextureSize: number | null;
  maxCubeMapTextureSize: number | null;
  maxRenderbufferSize: number | null;
  maxVertexAttributes: number | null;
} {
  if (!isWebGLSupported()) {
    return {
      supported: false,
      version: null,
      maxTextureSize: null,
      maxCubeMapTextureSize: null,
      maxRenderbufferSize: null,
      maxVertexAttributes: null
    };
  }

  const canvas = document.createElement('canvas');
  const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext;

  return {
    supported: true,
    version: canvas.getContext('webgl2') ? 'webgl2' : 'webgl',
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxCubeMapTextureSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
    maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
  };
}
