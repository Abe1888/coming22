import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createTelematicsTexture } from '../textures/TelematicsTexture';
import type { TelematicsData } from '../textures/types';

interface TelematicsDisplayProps {
  scene: THREE.Scene;
  truckGroup: THREE.Group;
  position?: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
  initialData?: TelematicsData;
  onMaterialCreated?: (material: THREE.MeshBasicMaterial) => void;
  onMeshCreated?: (mesh: THREE.Mesh) => void;
  onGroupCreated?: (group: THREE.Group) => void;
}

/**
 * TelematicsDisplay Component
 * 
 * Creates a 3D display screen showing telematics data with:
 * - Configurable position, rotation, and size
 * - Dynamic texture updates
 * - Proper material settings for display screens
 * - Material reference for external updates
 * 
 * @param scene - Three.js scene
 * @param truckGroup - Parent truck group to attach display to
 * @param position - Display position [x, y, z] (default: [-3.5, 1.5, 7])
 * @param rotation - Display rotation [x, y, z] (default: [0, -Math.PI/2, 0])
 * @param size - Display size [width, height] (default: [9, 5])
 * @param initialData - Initial telematics data to display
 * @param onMaterialCreated - Callback with material reference for updates
 * 
 * @example
 * ```typescript
 * <TelematicsDisplay
 *   scene={sceneRef.current}
 *   truckGroup={truckRef.current}
 *   position={[-3.5, 1.5, 7]}
 *   initialData={{ speed: 85, fuelLevel: 0.65 }}
 *   onMaterialCreated={(material) => {
 *     telematicsMatRef.current = material;
 *   }}
 * />
 * ```
 */
export const TelematicsDisplay = ({
  scene,
  truckGroup,
  position = [-7.6, 9.8, 5.3],
  rotation = [1.5707963267948966, -1.5707963267948966, 0],
  size = [7.5, 4],
  initialData = { speed: 85, fuelLevel: 0.65 },
  onMaterialCreated,
  onMeshCreated,
  onGroupCreated
}: TelematicsDisplayProps) => {
  const displayGroupRef = useRef<THREE.Group | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useEffect(() => {
    if (!scene || !truckGroup) return;

    // Create display group
    const telematicsGroup = new THREE.Group();
    displayGroupRef.current = telematicsGroup;
    
    // Create initial texture
    const telematicsTex = createTelematicsTexture(initialData);
    
    // Create material with display-optimized settings
    const telematicsMat = new THREE.MeshBasicMaterial({ 
      map: telematicsTex,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide
    });
    
    materialRef.current = telematicsMat;
    
    // Create display screen mesh
    const displayScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      telematicsMat
    );
    
    // Add to group
    telematicsGroup.add(displayScreen);
    
    // Apply transformations to group
    // NOTE: Position is in WORLD COORDINATES (not relative to truck)
    // But display is attached to truck so it moves with the truck
    telematicsGroup.position.set(...position);
    telematicsGroup.rotation.set(...rotation);
    
    // Add to truck group (moves with truck)
    truckGroup.add(telematicsGroup);
    
    // Convert to world coordinates for display
    // Callback with material reference
    if (onMaterialCreated) {
      onMaterialCreated(telematicsMat);
    }
    
    // Callback with mesh reference
    if (onMeshCreated) {
      onMeshCreated(displayScreen);
    }
    
    // Callback with group reference (for position updates)
    if (onGroupCreated) {
      onGroupCreated(telematicsGroup);
    }

    // Cleanup
    return () => {
      if (displayGroupRef.current) {
        truckGroup.remove(displayGroupRef.current);
        
        // Dispose geometries and materials
        displayGroupRef.current.traverse((child) => {
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, truckGroup]);

  return null; // This is a Three.js component, no DOM rendering
};

/**
 * Update telematics display with new data
 * Helper function to update the display material
 * 
 * @param material - The display material to update
 * @param data - New telematics data
 * 
 * @example
 * ```typescript
 * // In animation loop
 * if (telematicsMatRef.current) {
 *   updateTelematicsDisplay(telematicsMatRef.current, {
 *     speed: currentSpeed,
 *     fuelLevel: currentFuel
 *   });
 * }
 * ```
 */
export function updateTelematicsDisplay(
  material: THREE.MeshBasicMaterial,
  data: TelematicsData
): void {
  const newTexture = createTelematicsTexture(data);
  
  // Dispose old texture
  if (material.map) {
    material.map.dispose();
  }
  
  // Apply new texture
  material.map = newTexture;
  material.needsUpdate = true;
}
