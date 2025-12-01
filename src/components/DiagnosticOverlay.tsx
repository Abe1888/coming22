/**
 * DiagnosticOverlay - Production debugging overlay
 * 
 * Displays real-time diagnostic information:
 * - FPS (frames per second)
 * - Transform data for 3D objects
 * - Asset loading metrics
 * - Camera position and rotation
 * 
 * Enable via URL parameter: ?debug=true
 * 
 * @example
 * ```typescript
 * <DiagnosticOverlay
 *   enabled={true}
 *   fps={60}
 *   transforms={transformSnapshots}
 *   assetMetrics={metrics}
 *   camera={camera}
 * />
 * ```
 */

import { useState, useEffect } from 'react';
import * as THREE from 'three';
import type { TransformSnapshot } from '../utils/TransformValidator';

export interface AssetMetric {
  name: string;
  size: number;
  loadTime: number;
  decodeTime?: number;
  cached: boolean;
}

export interface DiagnosticOverlayProps {
  enabled: boolean;
  fps?: number;
  transforms?: TransformSnapshot[];
  assetMetrics?: AssetMetric[];
  camera?: THREE.Camera;
  onClose?: () => void;
}

export const DiagnosticOverlay = ({
  enabled,
  fps = 0,
  transforms = [],
  assetMetrics = [],
  camera,
  onClose
}: DiagnosticOverlayProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'fps' | 'transforms' | 'assets' | 'camera'>('fps');
  const [copied, setCopied] = useState(false);

  // Don't render if not enabled
  if (!enabled) return null;

  // Copy diagnostic data to clipboard
  const copyToClipboard = () => {
    const diagnosticData = {
      timestamp: new Date().toISOString(),
      fps,
      transforms: transforms.map(t => ({
        name: t.name,
        position: t.position,
        rotation: t.rotation,
        scale: t.scale
      })),
      assetMetrics: assetMetrics.map(m => ({
        name: m.name,
        size: `${(m.size / 1024 / 1024).toFixed(2)} MB`,
        loadTime: `${m.loadTime}ms`,
        cached: m.cached
      })),
      camera: camera ? {
        position: {
          x: camera.position.x.toFixed(3),
          y: camera.position.y.toFixed(3),
          z: camera.position.z.toFixed(3)
        },
        rotation: {
          x: camera.rotation.x.toFixed(3),
          y: camera.rotation.y.toFixed(3),
          z: camera.rotation.z.toFixed(3)
        }
      } : null
    };

    navigator.clipboard.writeText(JSON.stringify(diagnosticData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get FPS color based on performance
  const getFPSColor = (fps: number): string => {
    if (fps >= 55) return '#209771'; // Brand emerald green
    if (fps >= 30) return '#be202e'; // Brand crimson red (warning)
    return '#be202e'; // Brand crimson red (critical)
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(29, 38, 53, 0.95)', // Brand dark with transparency
        color: '#ffffff', // Brand white
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px',
        padding: isMinimized ? '8px 12px' : '16px',
        borderRadius: '8px',
        border: '1px solid #6c6c6c', // Brand chrome
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 10000,
        maxWidth: isMinimized ? 'auto' : '400px',
        maxHeight: isMinimized ? 'auto' : '80vh',
        overflow: 'auto',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMinimized ? 0 : '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>🔍 Diagnostics</span>
          {!isMinimized && (
            <span style={{ 
              fontSize: '10px', 
              color: '#b8b8b8', // Brand gray
              backgroundColor: '#6c6c6c', // Brand chrome
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              PRODUCTION
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0 4px'
            }}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '▢' : '−'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#be202e', // Brand crimson red
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px'
              }}
              title="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: '1px solid #6c6c6c' }}>
            {(['fps', 'transforms', 'assets', 'camera'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? '#be202e' : 'transparent', // Brand crimson red
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  textTransform: 'uppercase',
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ minHeight: '100px' }}>
            {/* FPS Tab */}
            {activeTab === 'fps' && (
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: getFPSColor(fps), marginBottom: '8px' }}>
                  {fps.toFixed(1)} FPS
                </div>
                <div style={{ fontSize: '10px', color: '#b8b8b8', marginBottom: '12px' }}>
                  {fps >= 55 ? '✅ Excellent' : fps >= 30 ? '⚠️ Acceptable' : '❌ Poor'}
                </div>
                <div style={{ fontSize: '10px', color: '#b8b8b8' }}>
                  <div>Target: 60 FPS</div>
                  <div>Frame time: {(1000 / fps).toFixed(2)}ms</div>
                </div>
              </div>
            )}

            {/* Transforms Tab */}
            {activeTab === 'transforms' && (
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {transforms.length === 0 ? (
                  <div style={{ color: '#b8b8b8', fontSize: '11px' }}>No transform data available</div>
                ) : (
                  transforms.map((t, i) => (
                    <div key={i} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #6c6c6c' }}>
                      <div style={{ fontWeight: 'bold', color: '#be202e', marginBottom: '4px' }}>{t.name}</div>
                      <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
                        <div>Pos: [{t.position.x.toFixed(3)}, {t.position.y.toFixed(3)}, {t.position.z.toFixed(3)}]</div>
                        <div>Rot: [{t.rotation.x.toFixed(3)}, {t.rotation.y.toFixed(3)}, {t.rotation.z.toFixed(3)}]</div>
                        <div>Scale: [{t.scale.x.toFixed(3)}, {t.scale.y.toFixed(3)}, {t.scale.z.toFixed(3)}]</div>
                        {t.environment && <div style={{ color: '#209771', marginTop: '4px' }}>Env: {t.environment}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Assets Tab */}
            {activeTab === 'assets' && (
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {assetMetrics.length === 0 ? (
                  <div style={{ color: '#b8b8b8', fontSize: '11px' }}>No asset metrics available</div>
                ) : (
                  <>
                    <div style={{ marginBottom: '12px', fontSize: '10px', color: '#b8b8b8' }}>
                      Total assets: {assetMetrics.length} | 
                      Cached: {assetMetrics.filter(m => m.cached).length}
                    </div>
                    {assetMetrics.map((m, i) => (
                      <div key={i} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #6c6c6c' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '2px' }}>
                          {m.name}
                          {m.cached && <span style={{ color: '#209771', marginLeft: '6px' }}>●</span>}
                        </div>
                        <div style={{ fontSize: '10px', color: '#b8b8b8' }}>
                          <div>Size: {(m.size / 1024 / 1024).toFixed(2)} MB</div>
                          <div>Load: {m.loadTime}ms{m.decodeTime ? ` | Decode: ${m.decodeTime}ms` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Camera Tab */}
            {activeTab === 'camera' && (
              <div>
                {!camera ? (
                  <div style={{ color: '#b8b8b8', fontSize: '11px' }}>No camera data available</div>
                ) : (
                  <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
                    <div style={{ fontWeight: 'bold', color: '#be202e', marginBottom: '8px' }}>Position</div>
                    <div>X: {camera.position.x.toFixed(3)}</div>
                    <div>Y: {camera.position.y.toFixed(3)}</div>
                    <div>Z: {camera.position.z.toFixed(3)}</div>
                    
                    <div style={{ fontWeight: 'bold', color: '#be202e', marginTop: '12px', marginBottom: '8px' }}>Rotation</div>
                    <div>X: {camera.rotation.x.toFixed(3)} rad ({(camera.rotation.x * 180 / Math.PI).toFixed(1)}°)</div>
                    <div>Y: {camera.rotation.y.toFixed(3)} rad ({(camera.rotation.y * 180 / Math.PI).toFixed(1)}°)</div>
                    <div>Z: {camera.rotation.z.toFixed(3)} rad ({(camera.rotation.z * 180 / Math.PI).toFixed(1)}°)</div>
                    
                    {camera instanceof THREE.PerspectiveCamera && (
                      <>
                        <div style={{ fontWeight: 'bold', color: '#be202e', marginTop: '12px', marginBottom: '8px' }}>Camera</div>
                        <div>FOV: {camera.fov}°</div>
                        <div>Aspect: {camera.aspect.toFixed(3)}</div>
                        <div>Near: {camera.near}</div>
                        <div>Far: {camera.far}</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Copy Button */}
          <button
            onClick={copyToClipboard}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '8px',
              backgroundColor: copied ? '#209771' : '#6c6c6c', // Brand emerald green or chrome
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy Diagnostic Data'}
          </button>

          {/* Footer */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #6c6c6c', fontSize: '9px', color: '#b8b8b8', textAlign: 'center' }}>
            Press ESC to close | Refresh to update
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Hook to detect debug mode from URL parameter
 * 
 * @returns True if ?debug=true is in URL
 */
export function useDebugMode(): boolean {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.get('debug') === 'true');
  }, []);

  return debugMode;
}

/**
 * Hook to track FPS
 * 
 * @returns Current FPS value
 */
export function useFPS(): number {
  const [fps, setFPS] = useState(60);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const updateFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTime;

      if (elapsed >= 1000) {
        setFPS((frameCount * 1000) / elapsed);
        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(updateFPS);
    };

    animationFrameId = requestAnimationFrame(updateFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return fps;
}
