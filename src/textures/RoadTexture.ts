import * as THREE from 'three';
import type { RoadTextureOptions } from './types';

/**
 * Road Texture Generator
 * 
 * Creates a high-resolution canvas-based road texture with:
 * - Multiple lanes with proper lane markings
 * - Solid outer lines and dashed center line
 * - Configurable colors, lane count, and dash patterns
 * - Optimized for tiling and repetition
 * 
 * @param options - Road texture configuration options
 * @returns THREE.CanvasTexture ready for use on road mesh
 * 
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const roadTexture = createRoadTexture();
 * 
 * // Custom configuration
 * const customRoad = createRoadTexture({
 *   size: 4096,
 *   backgroundColor: '#2a2a2a',
 *   laneColor: '#ffff00',
 *   laneCount: 4,
 *   dashPattern: [100, 80]
 * });
 * 
 * // Use on road mesh with tiling
 * const material = new THREE.MeshStandardMaterial({ map: roadTexture });
 * roadTexture.repeat.set(1, 12);
 * ```
 */
export function createRoadTexture(options: RoadTextureOptions = {}): THREE.CanvasTexture {
  const {
    size = 2048,
    backgroundColor = '#ffffff',
    laneColor = '#ff0000',
    laneCount = 3,
    dashPattern = [80, 60],
    leftLanePosition = 0.35,
    rightLanePosition = 0.65,
    centerLanePosition = 0.5,
    solidLineWidth = 16,
    dashedLineWidth = 12
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Fill background (road surface)
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);
  
  // Set line color
  ctx.strokeStyle = laneColor;
  ctx.lineCap = 'round';
  
  // Draw lane markings based on lane count
  if (laneCount >= 2) {
    // Left solid line
    drawSolidLine(ctx, leftLanePosition * size, 0, leftLanePosition * size, size, solidLineWidth);
    
    // Right solid line
    drawSolidLine(ctx, rightLanePosition * size, 0, rightLanePosition * size, size, solidLineWidth);
  }
  
  if (laneCount >= 3) {
    // Center dashed line
    drawDashedLine(ctx, centerLanePosition * size, 0, centerLanePosition * size, size, dashedLineWidth, dashPattern);
  }
  
  // Additional lanes for higher lane counts
  if (laneCount > 3) {
    const additionalLanes = laneCount - 3;
    const laneSpacing = (rightLanePosition - leftLanePosition) / (laneCount - 1);
    
    for (let i = 1; i <= additionalLanes; i++) {
      const position = leftLanePosition + (i * laneSpacing);
      if (position !== centerLanePosition) {
        drawDashedLine(ctx, position * size, 0, position * size, size, dashedLineWidth, dashPattern);
      }
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Draw a solid line on the canvas
 * @private
 */
function drawSolidLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number
): void {
  ctx.lineWidth = width;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Draw a dashed line on the canvas
 * @private
 */
function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  dashPattern: [number, number]
): void {
  ctx.lineWidth = width;
  ctx.setLineDash(dashPattern);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash pattern
}
