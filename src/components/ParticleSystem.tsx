import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ParticleSystemProps {
  scene: THREE.Scene;
  count?: number;
  color?: number;
  size?: number;
  opacity?: number;
  spread?: [number, number, number];
  sizeRange?: [number, number];
  animationSpeed?: number;
  resetDistance?: number;
  onParticlesCreated?: (particles: THREE.Points) => void;
}

/**
 * ParticleSystem Component
 * 
 * Creates an animated particle system with:
 * - Configurable particle count, color, size, and opacity
 * - Dynamic animation with varying speeds
 * - Automatic particle recycling
 * - Customizable spread and size ranges
 * 
 * @param scene - Three.js scene
 * @param count - Number of particles (default: 400)
 * @param color - Particle color (default: 0xc0c0c0)
 * @param size - Base particle size (default: 0.06)
 * @param opacity - Particle opacity (default: 0.4)
 * @param spread - Particle spread [x, y, z] (default: [60, 20, 300])
 * @param sizeRange - Random size range [min, max] (default: [0.02, 0.08])
 * @param animationSpeed - Base animation speed (default: 160)
 * @param resetDistance - Distance to reset particles (default: 100)
 * @param onParticlesCreated - Callback with particles reference
 * 
 * @example
 * ```typescript
 * <ParticleSystem
 *   scene={sceneRef.current}
 *   count={400}
 *   color={0xc0c0c0}
 *   onParticlesCreated={(particles) => {
 *     particlesRef.current = particles;
 *   }}
 * />
 * ```
 */
export const ParticleSystem = ({
  scene,
  count = 400,
  color = 0xc0c0c0,
  size = 0.06,
  opacity = 0.4,
  spread = [60, 20, 300],
  sizeRange = [0.02, 0.08],
  animationSpeed = 160,
  resetDistance = 100,
  onParticlesCreated
}: ParticleSystemProps) => {
  const particlesRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!scene) return;

    // Create particle geometry
    const particleGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(count * 3);
    const pSizes = new Float32Array(count);

    // Initialize particle positions and sizes
    for (let i = 0; i < count * 3; i += 3) {
      pPos[i] = (Math.random() - 0.5) * spread[0];      // X position
      pPos[i + 1] = Math.random() * spread[1];          // Y position
      pPos[i + 2] = (Math.random() - 0.5) * spread[2];  // Z position
      pSizes[i / 3] = Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0];
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

    // Create particle material
    const particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: size,
      transparent: true,
      opacity: opacity,
      sizeAttenuation: true
    });

    // Create particle system
    const particles = new THREE.Points(particleGeo, particleMaterial);
    particlesRef.current = particles;

    // Add to scene
    scene.add(particles);

    // Callback with particles reference
    if (onParticlesCreated) {
      onParticlesCreated(particles);
    }

    // Cleanup
    return () => {
      if (particlesRef.current) {
        scene.remove(particlesRef.current);
        particlesRef.current.geometry.dispose();
        if (particlesRef.current.material instanceof THREE.Material) {
          particlesRef.current.material.dispose();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return null; // This is a Three.js component, no DOM rendering
};

/**
 * Animate particle system
 * Helper function to update particle positions in animation loop
 * 
 * @param particles - The particle system to animate
 * @param delta - Time delta in seconds
 * @param speed - Animation speed multiplier (default: 160)
 * @param resetDistance - Distance to reset particles (default: 100)
 * @param resetPosition - Z position to reset to (default: -300)
 * @param spread - Particle spread [x, y] for reset (default: [60, 20])
 * 
 * @example
 * ```typescript
 * // In animation loop
 * if (particlesRef.current) {
 *   animateParticles(particlesRef.current, delta);
 * }
 * ```
 */
export function animateParticles(
  particles: THREE.Points,
  delta: number,
  speed: number = 160,
  resetDistance: number = 100,
  resetPosition: number = -300,
  spread: [number, number] = [60, 20]
): void {
  const pPos = particles.geometry.attributes.position.array as Float32Array;

  for (let i = 2; i < pPos.length; i += 3) {
    // Varying speeds for more dynamic effect
    const speedVariation = 1 + (i % 3) * 0.3;
    pPos[i] += delta * speed * speedVariation;

    // Reset particle when it goes too far
    if (pPos[i] > resetDistance) {
      pPos[i] = resetPosition;
      pPos[i - 2] = (Math.random() - 0.5) * spread[0]; // Random X
      pPos[i - 1] = Math.random() * spread[1];         // Random Y
    }
  }

  particles.geometry.attributes.position.needsUpdate = true;
}
