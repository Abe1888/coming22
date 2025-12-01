/**
 * TransformValidator - Debug and validate 3D object transforms
 * 
 * Provides tools for:
 * - Capturing transform snapshots
 * - Comparing transforms between environments
 * - Validating against configuration
 * - Logging transform data for debugging
 * 
 * @example
 * ```typescript
 * const validator = new TransformValidator(0.001);
 * 
 * // Capture snapshot
 * const snapshot = validator.captureSnapshot(truckModel);
 * 
 * // Compare environments
 * const comparison = validator.compareSnapshots(localSnapshot, prodSnapshot);
 * 
 * // Log all transforms
 * validator.logTransforms(scene);
 * ```
 */

import * as THREE from 'three';

export interface TransformSnapshot {
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  worldMatrix: number[];
  timestamp: number;
  environment?: string;
}

export interface TransformComparison {
  objectName: string;
  positionDiff: { x: number; y: number; z: number };
  rotationDiff: { x: number; y: number; z: number };
  scaleDiff: { x: number; y: number; z: number };
  maxPositionDiff: number;
  maxRotationDiff: number;
  maxScaleDiff: number;
  withinTolerance: boolean;
  issues: string[];
}

export interface ObjectTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number | [number, number, number];
}

export class TransformValidator {
  private tolerance: number;

  constructor(tolerance: number = 0.001) {
    this.tolerance = tolerance;
  }

  /**
   * Capture a snapshot of an object's transforms
   * Includes local and world transforms for debugging
   * 
   * @param object - Three.js object to capture
   * @param environment - Optional environment label (e.g., 'local', 'production')
   * @returns Transform snapshot
   */
  captureSnapshot(
    object: THREE.Object3D,
    environment?: string
  ): TransformSnapshot {
    // Update world matrix to ensure accuracy
    object.updateMatrixWorld(true);

    const worldMatrix = object.matrixWorld.toArray();

    const snapshot: TransformSnapshot = {
      name: object.name || 'unnamed',
      position: {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
      },
      rotation: {
        x: object.rotation.x,
        y: object.rotation.y,
        z: object.rotation.z
      },
      scale: {
        x: object.scale.x,
        y: object.scale.y,
        z: object.scale.z
      },
      worldMatrix,
      timestamp: Date.now(),
      environment
    };

    console.log(`📸 Captured snapshot for '${snapshot.name}'${environment ? ` (${environment})` : ''}:`);
    console.log('   Position:', snapshot.position);
    console.log('   Rotation:', snapshot.rotation);
    console.log('   Scale:', snapshot.scale);

    return snapshot;
  }

  /**
   * Compare two transform snapshots
   * Useful for comparing local vs production environments
   * 
   * @param local - Local environment snapshot
   * @param production - Production environment snapshot
   * @returns Comparison result with differences
   */
  compareSnapshots(
    local: TransformSnapshot,
    production: TransformSnapshot
  ): TransformComparison {
    const positionDiff = {
      x: Math.abs(local.position.x - production.position.x),
      y: Math.abs(local.position.y - production.position.y),
      z: Math.abs(local.position.z - production.position.z)
    };

    const rotationDiff = {
      x: Math.abs(local.rotation.x - production.rotation.x),
      y: Math.abs(local.rotation.y - production.rotation.y),
      z: Math.abs(local.rotation.z - production.rotation.z)
    };

    const scaleDiff = {
      x: Math.abs(local.scale.x - production.scale.x),
      y: Math.abs(local.scale.y - production.scale.y),
      z: Math.abs(local.scale.z - production.scale.z)
    };

    const maxPositionDiff = Math.max(positionDiff.x, positionDiff.y, positionDiff.z);
    const maxRotationDiff = Math.max(rotationDiff.x, rotationDiff.y, rotationDiff.z);
    const maxScaleDiff = Math.max(scaleDiff.x, scaleDiff.y, scaleDiff.z);

    const withinTolerance = 
      maxPositionDiff <= this.tolerance &&
      maxRotationDiff <= this.tolerance &&
      maxScaleDiff <= this.tolerance;

    const issues: string[] = [];

    if (maxPositionDiff > this.tolerance) {
      issues.push(
        `Position difference (${maxPositionDiff.toFixed(6)}) exceeds tolerance (${this.tolerance})`
      );
    }

    if (maxRotationDiff > this.tolerance) {
      issues.push(
        `Rotation difference (${maxRotationDiff.toFixed(6)}) exceeds tolerance (${this.tolerance})`
      );
    }

    if (maxScaleDiff > this.tolerance) {
      issues.push(
        `Scale difference (${maxScaleDiff.toFixed(6)}) exceeds tolerance (${this.tolerance})`
      );
    }

    const comparison: TransformComparison = {
      objectName: local.name,
      positionDiff,
      rotationDiff,
      scaleDiff,
      maxPositionDiff,
      maxRotationDiff,
      maxScaleDiff,
      withinTolerance,
      issues
    };

    console.log(`🔍 Comparison for '${local.name}':`);
    console.log(`   Position diff: [${positionDiff.x.toFixed(6)}, ${positionDiff.y.toFixed(6)}, ${positionDiff.z.toFixed(6)}]`);
    console.log(`   Rotation diff: [${rotationDiff.x.toFixed(6)}, ${rotationDiff.y.toFixed(6)}, ${rotationDiff.z.toFixed(6)}]`);
    console.log(`   Scale diff: [${scaleDiff.x.toFixed(6)}, ${scaleDiff.y.toFixed(6)}, ${scaleDiff.z.toFixed(6)}]`);
    console.log(`   Within tolerance: ${withinTolerance ? '✅' : '❌'}`);

    if (!withinTolerance) {
      console.warn('   Issues:', issues);
    }

    return comparison;
  }

  /**
   * Validate object transforms against configuration
   * 
   * @param object - Three.js object to validate
   * @param config - Expected transform configuration
   * @returns True if transforms match configuration within tolerance
   */
  validateAgainstConfig(
    object: THREE.Object3D,
    config: ObjectTransform
  ): boolean {
    const positionMatch = 
      Math.abs(object.position.x - config.position[0]) <= this.tolerance &&
      Math.abs(object.position.y - config.position[1]) <= this.tolerance &&
      Math.abs(object.position.z - config.position[2]) <= this.tolerance;

    const rotationMatch = 
      Math.abs(object.rotation.x - config.rotation[0]) <= this.tolerance &&
      Math.abs(object.rotation.y - config.rotation[1]) <= this.tolerance &&
      Math.abs(object.rotation.z - config.rotation[2]) <= this.tolerance;

    let scaleMatch = true;
    if (typeof config.scale === 'number') {
      scaleMatch = 
        Math.abs(object.scale.x - config.scale) <= this.tolerance &&
        Math.abs(object.scale.y - config.scale) <= this.tolerance &&
        Math.abs(object.scale.z - config.scale) <= this.tolerance;
    } else {
      scaleMatch = 
        Math.abs(object.scale.x - config.scale[0]) <= this.tolerance &&
        Math.abs(object.scale.y - config.scale[1]) <= this.tolerance &&
        Math.abs(object.scale.z - config.scale[2]) <= this.tolerance;
    }

    const isValid = positionMatch && rotationMatch && scaleMatch;

    console.log(`✓ Validation for '${object.name || 'unnamed'}':`);
    console.log(`   Position: ${positionMatch ? '✅' : '❌'}`);
    console.log(`   Rotation: ${rotationMatch ? '✅' : '❌'}`);
    console.log(`   Scale: ${scaleMatch ? '✅' : '❌'}`);
    console.log(`   Overall: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

    return isValid;
  }

  /**
   * Log all transforms in a scene
   * Useful for debugging and comparing environments
   * 
   * @param scene - Three.js scene to log
   * @param filter - Optional filter function to select objects
   */
  logTransforms(
    scene: THREE.Scene,
    filter?: (object: THREE.Object3D) => boolean
  ): void {
    console.log('📊 Scene Transform Report:');
    console.log('═'.repeat(80));

    const snapshots: TransformSnapshot[] = [];

    scene.traverse((object) => {
      // Skip if filter provided and object doesn't pass
      if (filter && !filter(object)) {
        return;
      }

      // Skip objects without names (usually internal Three.js objects)
      if (!object.name) {
        return;
      }

      const snapshot = this.captureSnapshot(object);
      snapshots.push(snapshot);
    });

    console.log(`\n📋 Total objects logged: ${snapshots.length}`);
    console.log('═'.repeat(80));

    return;
  }

  /**
   * Export snapshots as JSON
   * Useful for saving and comparing between environments
   * 
   * @param snapshots - Array of snapshots to export
   * @returns JSON string
   */
  exportSnapshotsJSON(snapshots: TransformSnapshot[]): string {
    return JSON.stringify(snapshots, null, 2);
  }

  /**
   * Import snapshots from JSON
   * 
   * @param json - JSON string to parse
   * @returns Array of snapshots
   */
  importSnapshotsJSON(json: string): TransformSnapshot[] {
    return JSON.parse(json);
  }

  /**
   * Get transform differences as a formatted string
   * Useful for logging or displaying in UI
   * 
   * @param comparison - Comparison result
   * @returns Formatted string
   */
  formatComparison(comparison: TransformComparison): string {
    const lines = [
      `Transform Comparison: ${comparison.objectName}`,
      '─'.repeat(60),
      `Position Δ: [${comparison.positionDiff.x.toFixed(6)}, ${comparison.positionDiff.y.toFixed(6)}, ${comparison.positionDiff.z.toFixed(6)}]`,
      `Rotation Δ: [${comparison.rotationDiff.x.toFixed(6)}, ${comparison.rotationDiff.y.toFixed(6)}, ${comparison.rotationDiff.z.toFixed(6)}]`,
      `Scale Δ: [${comparison.scaleDiff.x.toFixed(6)}, ${comparison.scaleDiff.y.toFixed(6)}, ${comparison.scaleDiff.z.toFixed(6)}]`,
      `Max Differences: Pos=${comparison.maxPositionDiff.toFixed(6)}, Rot=${comparison.maxRotationDiff.toFixed(6)}, Scale=${comparison.maxScaleDiff.toFixed(6)}`,
      `Status: ${comparison.withinTolerance ? '✅ PASS' : '❌ FAIL'}`,
    ];

    if (comparison.issues.length > 0) {
      lines.push('Issues:');
      comparison.issues.forEach(issue => lines.push(`  - ${issue}`));
    }

    return lines.join('\n');
  }

  /**
   * Set tolerance for comparisons
   * 
   * @param tolerance - New tolerance value
   */
  setTolerance(tolerance: number): void {
    this.tolerance = tolerance;
    console.log(`🔧 Tolerance set to: ${tolerance}`);
  }

  /**
   * Get current tolerance
   * 
   * @returns Current tolerance value
   */
  getTolerance(): number {
    return this.tolerance;
  }
}

/**
 * Create a configured TransformValidator instance
 * Convenience function with sensible defaults
 * 
 * @param tolerance - Tolerance for floating-point comparisons (default: 0.001)
 * @returns Configured TransformValidator
 */
export function createTransformValidator(tolerance: number = 0.001): TransformValidator {
  return new TransformValidator(tolerance);
}
