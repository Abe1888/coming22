import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { sharedAssetLoader } from '../utils/sharedAssetLoader';
import { loadAssetWithRetry } from '../utils/AssetLoader';

interface TruckModelProps {
  scene: THREE.Scene;
  truckGroup: THREE.Group;
  modelPath?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  lightGrayMaterial: THREE.MeshStandardMaterial;
  edgeMaterial: THREE.LineBasicMaterial;
  onLoad?: (model: THREE.Group, wheels: THREE.Mesh[]) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onLogoCreated?: (logoPlane: THREE.Mesh) => void;
}

/**
 * TruckModel Component
 * 
 * Loads and processes a GLB truck model with:
 * - DRACO compression support
 * - Automatic wheel detection and centering
 * - Material application (glass, logo, fuel tank, etc.)
 * - Edge line rendering
 * - Shadow casting/receiving
 * 
 * @param scene - Three.js scene
 * @param truckGroup - Parent truck group to attach model to
 * @param modelPath - Path to GLB model (default: '/model/compressed/Main_truck_updated_compressed.glb')
 * @param position - Model position [x, y, z] (default: [1.1, -1.1, -5.3])
 * @param rotation - Model rotation [x, y, z] (default: [0, Math.PI, 0])
 * @param scale - Model scale (default: 1.50)
 * @param lightGrayMaterial - Material for truck body
 * @param edgeMaterial - Material for edge lines
 * @param onLoad - Callback when model loads (receives model and wheels array)
 * @param onError - Callback on loading error
 */
export const TruckModel = ({
  scene,
  truckGroup,
  modelPath = '/model/compressed/Main_truck_updated_compressed.glb',
  position = [1.1, -1.1, -5.3],
  rotation = [0, Math.PI, 0],
  scale = 1.50,
  lightGrayMaterial,
  edgeMaterial,
  onLoad,
  onProgress,
  onError,
  onLogoCreated
}: TruckModelProps) => {
  const modelRef = useRef<THREE.Group | null>(null);
  const wheelsRef = useRef<THREE.Mesh[]>([]);
  const loadedRef = useRef(false); // Prevent double-loading in React Strict Mode
  const logoPlaneRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    console.log('🔧 TruckModel useEffect triggered');
    console.log('   - scene:', !!scene);
    console.log('   - truckGroup:', !!truckGroup);
    console.log('   - loadedRef.current:', loadedRef.current);
    
    if (!scene || !truckGroup) {
      console.warn('⚠️ Scene or truckGroup not available yet');
      return;
    }
    if (loadedRef.current) {
      console.log('ℹ️ Model already loaded, skipping');
      return;
    }
    loadedRef.current = true;

    let mounted = true;

    console.log('🚀 Loading GLB model with AssetLoader:', modelPath);
    console.log('   - Position:', position);
    console.log('   - Rotation:', rotation);
    console.log('   - Scale:', scale);

    // Load model using shared AssetLoader with retry logic
    const loadModel = async () => {
      try {
        const model = await loadAssetWithRetry(
          () => sharedAssetLoader.loadGLB(
            modelPath,
            (progress) => {
              if (onProgress) {
                onProgress(progress.percentage);
              }
              console.log(`📥 Loading progress: ${progress.percentage.toFixed(1)}% (${progress.loaded}/${progress.total} bytes)`);
            }
          ),
          modelPath,
          3
        );
        
        // Check if component is still mounted
        if (!mounted) {
          console.warn('⚠️ Component unmounted, aborting');
          return;
        }
        
        console.log('📦 GLB file loaded successfully');
        console.log('   - Model children count:', model.children.length);
        console.log('   - Model children count:', model.children.length);
        console.log('   - Model bounding box:', model);
        
        // Apply transformations AFTER model is fully loaded
        console.log('🔄 Applying transformations...');
        model.rotation.set(...rotation);
        model.position.set(...position);
        model.scale.set(scale, scale, scale);
        console.log('✓ Transformations applied');
        
        // Process all meshes
        console.log('🔍 Processing meshes...');
        const wheels: THREE.Mesh[] = [];
        let meshCount = 0;
        
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshCount++;
            const nameLower = child.name.toLowerCase();
            
            // CENTER ALL WHEEL MESHES for proper rotation
            if (nameLower.includes('wheel')) {
              child.geometry.computeBoundingBox();
              const bbox = child.geometry.boundingBox;
              if (bbox) {
                const center = new THREE.Vector3();
                bbox.getCenter(center);
                
                // Translate geometry to center it at origin
                child.geometry.translate(-center.x, -center.y, -center.z);
                
                // Adjust mesh position to compensate
                child.position.add(center);
                
                // Add to wheels array for rotation
                wheels.push(child);
              }
            }
            
            // Dispose old materials
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
            
            // Apply materials based on mesh type
            applyMaterialToMesh(child, lightGrayMaterial, edgeMaterial, (logoPlane) => {
              logoPlaneRef.current = logoPlane;
              if (onLogoCreated) {
                onLogoCreated(logoPlane);
              }
            });
          }
        });
        
        console.log(`✓ Processed ${meshCount} meshes, found ${wheels.length} wheels`);
        
        // Check if still mounted before adding to scene
        if (!mounted) {
          console.warn('⚠️ Component unmounted before adding to scene');
          return;
        }
        
        // Store wheels reference
        wheelsRef.current = wheels;
        console.log('✓ Wheels stored in ref');
        
        // Store model reference
        modelRef.current = model;
        console.log('✓ Model stored in ref');
        
        // Add to truck group
        console.log('➕ Adding model to truck group...');
        console.log('   - Truck group children before:', truckGroup.children.length);
        truckGroup.add(model);
        console.log('   - Truck group children after:', truckGroup.children.length);
        console.log('   - Model world position:', model.getWorldPosition(new THREE.Vector3()));
        
        console.log('✅ Model loaded and added to scene successfully!');
        
        // Callback
        if (onLoad) {
          console.log('📞 Calling onLoad callback');
          onLoad(model, wheels);
        }
      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to load model:', err);
        console.error('   - Error type:', err.constructor.name);
        console.error('   - Error message:', err.message);
        console.error('   - Model path:', modelPath);
        if (mounted && onError) {
          onError(err);
        }
      }
    };
    
    // Start loading
    loadModel();

    // Cleanup
    return () => {
      console.log('🧹 TruckModel cleanup - unmounting');
      mounted = false;
      loadedRef.current = false; // Reset so it can load again if remounted
      
      if (modelRef.current) {
        console.log('   - Removing model from truck group');
        truckGroup.remove(modelRef.current);
        
        // Dispose geometries and materials
        modelRef.current.traverse((child) => {
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
      
      console.log('✓ Cleanup complete (shared AssetLoader remains active)');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, truckGroup, modelPath]);

  return null; // This is a Three.js component, no DOM rendering
};

/**
 * Apply material to mesh based on its type
 * @private
 */
function applyMaterialToMesh(
  child: THREE.Mesh,
  lightGrayMat: THREE.MeshStandardMaterial,
  edgeMat: THREE.LineBasicMaterial,
  onLogoCreated?: (logoPlane: THREE.Mesh) => void
): void {
  const nameLower = child.name.toLowerCase();
  
  // Check for wheel meshes (make them very dark)
  const isWheel = nameLower.includes('wheel') || 
                  nameLower.includes('tire') ||
                  nameLower.includes('rim');
  
  // Check for logo mesh
  const isLogo = nameLower.includes('logo');
  
  // Check for glass meshes (windows, windshield)
  const isGlass = nameLower.includes('glass') || 
                 nameLower.includes('window') ||
                 nameLower.includes('windshield') ||
                 nameLower.includes('windscreen');
  
  // Check if this is the fuel tank mesh
  const isFuelTank = nameLower.includes('tank') || 
                     nameLower.includes('fuel') ||
                     nameLower.includes('cylinder');
  
  if (isWheel) {
    // Apply very dark material to wheels
    child.material = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a, // Very dark gray (almost black)
      roughness: 0.9,
      metalness: 0.1
    });
    child.castShadow = true;
    child.receiveShadow = true;
  } else if (isLogo) {
    applyLogoMaterial(child, onLogoCreated);
  } else if (isGlass) {
    applyGlassMaterial(child);
  } else if (isFuelTank) {
    applyFuelTankMaterial(child);
  } else {
    // Apply light gray material to other parts
    child.material = lightGrayMat;
    child.castShadow = true;
    child.receiveShadow = true;
  }
  
  // Add subtle blended edges
  const edges = new THREE.EdgesGeometry(child.geometry, 15);
  const line = new THREE.LineSegments(edges, edgeMat);
  child.add(line);
}

/**
 * Apply logo material (invisible face with PNG plane)
 * @private
 */
function applyLogoMaterial(child: THREE.Mesh, onLogoCreated?: (logoPlane: THREE.Mesh) => void): void {
  // Make the circular face invisible
  child.material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
  });
  
  // Create a plane with the logo PNG in front of the circular face
  sharedAssetLoader.loadTexture('/optimized/logo-front-truck.webp').then((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
      
      // Get the size of the circular face
      child.geometry.computeBoundingBox();
      const bbox = child.geometry.boundingBox;
      if (bbox) {
        const width = bbox.max.x - bbox.min.x;
        const height = bbox.max.y - bbox.min.y;
        
        // Create a plane geometry matching the circular face size
        const planeGeometry = new THREE.PlaneGeometry(width, height);
        const planeMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.1,
          side: THREE.DoubleSide,
          toneMapped: false
        });
        
        const logoPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        logoPlane.name = 'LogoPlane'; // Name for easy identification
        
        // Position the plane in front of the circular face
        logoPlane.position.copy(child.position);
        logoPlane.rotation.copy(child.rotation);
        logoPlane.quaternion.copy(child.quaternion);
        
        // Move forward in LOCAL space (front of truck)
        // Since truck is rotated 180° (Math.PI), -Z is forward
        const forwardOffset = new THREE.Vector3(0, 0, -0.5);
        forwardOffset.applyQuaternion(logoPlane.quaternion);
        logoPlane.position.add(forwardOffset);
        
        // Add to the same parent as the circular face
        if (child.parent) {
          child.parent.add(logoPlane);
        }
        
        // Notify parent component
        if (onLogoCreated) {
          onLogoCreated(logoPlane);
        }
      }
    }).catch((error) => {
      console.error('Failed to load logo texture:', error);
    });
  
  child.castShadow = false;
  child.receiveShadow = false;
}

/**
 * Apply glass material (transparent with blue tint)
 * @private
 */
function applyGlassMaterial(child: THREE.Mesh): void {
  child.material = new THREE.MeshStandardMaterial({ 
    color: 0xccddff, // Light blue tint
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.1,
    metalness: 0.1,
    envMapIntensity: 1.0
  });
  child.castShadow = false;
  child.receiveShadow = true;
}

/**
 * Apply fuel tank material (neutral gray transparent glass)
 * @private
 */
function applyFuelTankMaterial(child: THREE.Mesh): void {
  const fuelTankMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x808080, // Neutral gray (no blue tint)
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.1,
    metalness: 0.2
  });
  
  child.material = fuelTankMaterial;
  child.castShadow = false;
  child.receiveShadow = true;
  
  // Apply same material to all children (like fuel level sensor)
  child.traverse((subChild) => {
    if (subChild instanceof THREE.Mesh && subChild !== child) {
      // Dispose old material
      if (subChild.material) {
        if (Array.isArray(subChild.material)) {
          subChild.material.forEach(mat => mat.dispose());
        } else {
          subChild.material.dispose();
        }
      }
      
      // Check if this is the sensor
      const isSensor = subChild.name.toLowerCase().includes('sensor') || 
                       subChild.name.toLowerCase().includes('probe') ||
                       subChild.name.toLowerCase().includes('head');
      
      if (isSensor) {
        // Apply crimson red material to sensor head/box
        subChild.material = new THREE.MeshStandardMaterial({
          color: 0xbe202e, // Brand crimson red for sensor
          transparent: false,
          roughness: 0.3,
          metalness: 0.7
        });
      } else {
        // Apply neutral gray transparent material to other children
        subChild.material = fuelTankMaterial.clone();
      }
      
      subChild.castShadow = false;
      subChild.receiveShadow = false;
    }
  });
}
