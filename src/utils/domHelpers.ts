/**
 * DOM Helper Utilities
 * 
 * Utilities for ensuring proper DOM and CSS initialization timing
 */

/**
 * Wait for document to be fully loaded including CSS
 * 
 * This ensures that:
 * - All stylesheets are loaded and parsed
 * - Layout calculations are complete
 * - Canvas sizing will be accurate
 * 
 * @returns Promise that resolves when document is ready
 * 
 * @example
 * ```typescript
 * await waitForDocumentReady();
 * // Now safe to initialize canvas and compute sizes
 * ```
 */
export async function waitForDocumentReady(): Promise<void> {
  // If already complete, resolve immediately
  if (document.readyState === 'complete') {
    // Add one more frame delay to ensure layout is fully computed
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }
  
  // Otherwise, wait for load event
  return new Promise(resolve => {
    window.addEventListener('load', () => {
      // Add one frame delay after load to ensure layout is complete
      requestAnimationFrame(() => resolve());
    }, { once: true });
  });
}

/**
 * Wait for a specific number of animation frames
 * Useful for ensuring layout calculations are complete
 * 
 * @param frames - Number of frames to wait (default: 1)
 * @returns Promise that resolves after the specified frames
 * 
 * @example
 * ```typescript
 * await waitForFrames(2);
 * // Layout is now stable
 * ```
 */
export async function waitForFrames(frames: number = 1): Promise<void> {
  for (let i = 0; i < frames; i++) {
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
}

/**
 * Get accurate canvas container dimensions after CSS is loaded
 * 
 * @param container - The container element
 * @returns Object with width and height
 * 
 * @example
 * ```typescript
 * const { width, height } = getContainerDimensions(mountRef.current);
 * renderer.setSize(width, height);
 * ```
 */
export function getContainerDimensions(container: HTMLElement): { width: number; height: number } {
  const rect = container.getBoundingClientRect();
  return {
    width: rect.width || window.innerWidth,
    height: rect.height || window.innerHeight
  };
}
