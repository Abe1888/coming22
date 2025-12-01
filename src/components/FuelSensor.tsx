import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { sharedAssetLoader } from '../utils/sharedAssetLoader';

interface FuelSensorProps {
  scene: THREE.Scene;
  truckGroup: THREE.Group;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  probeLength?: number;
  onComponentsCreated?: (components: {
    sensorHeadGroup: THREE.Group;
    probeTube: THREE.Mesh;
    cageGroup: THREE.Group;
    tankGroup: THREE.Group;
  }) => void;
}

/**
 * Fuel Level Sensor Component
 * 
 * Creates a 3-part fuel sensor assembly:
 * 1. Sensor Head (RED) - Electronic housing with logo
 * 2. Probe Tube (WHITE) - Metallic measurement probe
 * 3. Cage/Filter (GREEN) - Protective cage with rings
 * 
 * @param scene - Three.js scene
 * @param truckGroup - Parent truck group to attach sensor to
 * @param position - Position relative to truck [x, y, z] (default: [3.1, 0.6, -5])
 * @param onComponentsCreated - Callback with references to sensor components (for SVG paths)
 */
export const FuelSensor = ({ 
  scene, 
  truckGroup, 
  position = [3.1, 0.6, -5],
  rotation = [0, 0, 0],
  scale = 1,
  probeLength = 1.3,
  onComponentsCreated 
}: FuelSensorProps) => {
  const tankGroupRef = useRef<THREE.Group | null>(null);
  const sensorHeadGroupRef = useRef<THREE.Group | null>(null);
  const probeTubeRef = useRef<THREE.Mesh | null>(null);
  const cageGroupRef = useRef<THREE.Group | null>(null);
  const loadedRef = useRef(false); // Prevent double-loading in React Strict Mode

  useEffect(() => {
    if (!scene || !truckGroup) return;
    if (loadedRef.current) return; // Already loaded, skip
    loadedRef.current = true;

    // === FUEL SENSOR ASSEMBLY ===
    const tankGroup = new THREE.Group();
    tankGroup.position.set(...position);
    truckGroup.add(tankGroup);
    tankGroupRef.current = tankGroup;

    // --- SENSOR HEAD GROUP (RED) ---
    const sensorHeadGroup = new THREE.Group();
    sensorHeadGroup.position.set(0, 0.70, 0);
    tankGroup.add(sensorHeadGroup);
    sensorHeadGroupRef.current = sensorHeadGroup;

    // 1. Sensor Head Housing - RED octagonal shape
    const headShape = new THREE.Shape();
    const hw = 0.15, hd = 0.15, ch = 0.03;
    headShape.moveTo(-hw + ch, -hd);
    headShape.lineTo(hw - ch, -hd);
    headShape.lineTo(hw, -hd + ch);
    headShape.lineTo(hw, hd - ch);
    headShape.lineTo(hw - ch, hd);
    headShape.lineTo(-hw + ch, hd);
    headShape.lineTo(-hw, hd - ch);
    headShape.lineTo(-hw, -hd + ch);
    headShape.closePath();

    const extrudeSettings = { 
      depth: 0.10,
      bevelEnabled: true, 
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2 
    };
    
    const headGeo = new THREE.ExtrudeGeometry(headShape, extrudeSettings);
    const head = new THREE.Mesh(
      headGeo,
      new THREE.MeshStandardMaterial({ 
        color: 0x2a2a2a, // Metallic black sensor head
        roughness: 0.3,
        metalness: 0.8
      })
    );
    head.rotation.x = Math.PI / 2;
    head.castShadow = true;
    head.receiveShadow = true;
    sensorHeadGroup.add(head);

    // Edge lines
    const headEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(headGeo, 20),
      new THREE.LineBasicMaterial({ color: 0xb0b0b0, transparent: true, opacity: 0.6 })
    );
    headEdges.rotation.x = Math.PI / 2;
    sensorHeadGroup.add(headEdges);

    // 2. Mounting Flange (Light gray)
    const flangeGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.04, 16);
    const flange = new THREE.Mesh(
      flangeGeo,
      new THREE.MeshStandardMaterial({ 
        color: 0xe8e8e8,
        roughness: 0.7,
        metalness: 0.3
      })
    );
    flange.position.y = -0.02;
    flange.castShadow = true;
    flange.receiveShadow = true;
    sensorHeadGroup.add(flange);

    // 3. Logo Plane
    const logoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.06),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    logoPlane.rotation.x = -Math.PI / 2;
    logoPlane.rotation.z = Math.PI / 2;
    logoPlane.position.y = 0.013;
    sensorHeadGroup.add(logoPlane);

    // Load logo texture using shared AssetLoader
    sharedAssetLoader.loadTexture('/optimized/Logo-white.webp').then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      (logoPlane.material as THREE.MeshBasicMaterial).map = texture;
      logoPlane.material.needsUpdate = true;
    }).catch((error) => {
      console.error('Failed to load logo texture:', error);
    });

    // --- PROBE ASSEMBLY (WHITE metallic) ---
    const probeGroup = new THREE.Group();
    tankGroup.add(probeGroup);

    // Probe tube - bright metallic WHITE
    const probeTubeGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.3, 20);
    const probeTube = new THREE.Mesh(
      probeTubeGeo,
      new THREE.MeshStandardMaterial({ 
        color: 0xffffff, // Pure WHITE for maximum brightness
        roughness: 0.3,
        metalness: 0.7
      })
    );
    probeTube.position.set(0, 0.05, 0);
    probeTube.castShadow = true;
    probeTube.receiveShadow = true;
    probeGroup.add(probeTube);
    probeTubeRef.current = probeTube;

    // --- CAGE/FILTER GROUP (GREEN) ---
    const cageGroup = new THREE.Group();
    cageGroup.position.set(0, -0.5, 0);
    probeGroup.add(cageGroup);
    cageGroupRef.current = cageGroup;

    // Cage body - GREEN
    const cageBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.25, 12),
      new THREE.MeshStandardMaterial({ 
        color: 0x22c55e, // GREEN cage
        transparent: true, 
        opacity: 0.8,
        roughness: 0.6,
        metalness: 0.2
      })
    );
    cageBody.castShadow = true;
    cageBody.receiveShadow = true;
    cageGroup.add(cageBody);

    // Cage rings - Darker GREEN
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.006, 8, 16),
        new THREE.MeshStandardMaterial({ 
          color: 0x16a34a, // Darker GREEN for rings
          roughness: 0.4,
          metalness: 0.3
        })
      );
      ring.position.y = -0.08 + i * 0.06;
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = true;
      ring.receiveShadow = true;
      cageGroup.add(ring);
    }

    // Callback with component references (for SVG path connections)
    if (onComponentsCreated) {
      onComponentsCreated({
        sensorHeadGroup,
        probeTube,
        cageGroup,
        tankGroup
      });
    }

    // Cleanup
    return () => {
      if (tankGroupRef.current) {
        truckGroup.remove(tankGroupRef.current);
        
        // Dispose geometries and materials
        tankGroupRef.current.traverse((child) => {
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
      loadedRef.current = false; // Reset flag for re-mounting
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, truckGroup]);

  return null; // This is a Three.js component, no DOM rendering
};
