import * as THREE from 'three';
import type { TelematicsData } from './types';

/**
 * Translink Telematics Display Texture Generator
 * 
 * Creates a high-resolution canvas-based texture for the truck dashboard display.
 * Features:
 * - Segmented speed indicator arc (0-160 KM/H)
 * - Large center speed display with ECO mode indicator
 * - Fuel gauge with tank icon and percentage
 * - Battery gauge with icon and range estimate
 * - Top info bar with live status, temperature, and time
 * - Brand colors (Translink crimson red #be202e)
 * 
 * @param data - Telematics data to display
 * @returns THREE.CanvasTexture ready for use on 3D mesh
 * 
 * @example
 * ```typescript
 * const texture = createTelematicsTexture({
 *   speed: 95,
 *   fuelLevel: 0.65,
 *   batteryLevel: 0.75
 * });
 * 
 * const material = new THREE.MeshBasicMaterial({ map: texture });
 * ```
 */
export function createTelematicsTexture(data: TelematicsData): THREE.CanvasTexture {
  const {
    speed = 85,
    fuelLevel = 0.65,
    batteryLevel = 0.75,
    temperature = 18,
    time = '12:45',
    ecoMode = true,
    range = 443
  } = data;

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Dark navy background with subtle gradient
  const gradient = ctx.createRadialGradient(1024, 512, 0, 1024, 512, 1200);
  gradient.addColorStop(0, '#1d2635');
  gradient.addColorStop(1, '#0f1419');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2048, 1024);
  
  const centerX = 1024;
  const centerY = 550;
  const mainRadius = 400;

  // === HOLOGRAPHIC GRID LINES ===
  ctx.strokeStyle = 'rgba(190, 32, 46, 0.15)';
  ctx.lineWidth = 1;
  
  // Horizontal lines
  for (let y = 100; y < 1024; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(2048, y);
    ctx.stroke();
  }
  
  // Vertical lines
  for (let x = 100; x < 2048; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }

  // === OUTER GLOW RING ===
  ctx.strokeStyle = 'rgba(190, 32, 46, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, mainRadius + 60, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.strokeStyle = 'rgba(190, 32, 46, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, mainRadius + 80, 0, Math.PI * 2);
  ctx.stroke();

  // === SPEED INDICATOR ARC (Segmented with glow) ===
  const segments = 20;
  const segmentAngle = (Math.PI * 1.6) / segments;
  const startAngle = Math.PI * 0.7;
  
  for (let i = 0; i < segments; i++) {
    const angle = startAngle + i * segmentAngle;
    const speedThreshold = (i + 1) / segments;
    
    // Fill if speed exceeds this segment
    if (speed / 160 > speedThreshold - 0.05) {
      // Active segment with glow
      ctx.shadowColor = '#be202e';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#be202e';
    } else {
      // Inactive segment
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(108, 108, 108, 0.3)';
    }
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, mainRadius, angle, angle + segmentAngle * 0.9);
    ctx.arc(centerX, centerY, mainRadius - 60, angle + segmentAngle * 0.9, angle, true);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.shadowBlur = 0;

  // === SPEED TICK MARKS ===
  ctx.strokeStyle = '#6c6c6c';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const angle = startAngle + (i / 8) * (Math.PI * 1.6);
    const x1 = centerX + Math.cos(angle) * (mainRadius - 70);
    const y1 = centerY + Math.sin(angle) * (mainRadius - 70);
    const x2 = centerX + Math.cos(angle) * (mainRadius - 90);
    const y2 = centerY + Math.sin(angle) * (mainRadius - 90);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Speed labels
    ctx.font = '24px Arial';
    ctx.fillStyle = '#6c6c6c';
    ctx.textAlign = 'center';
    const labelX = centerX + Math.cos(angle) * (mainRadius - 120);
    const labelY = centerY + Math.sin(angle) * (mainRadius - 120);
    ctx.fillText((i * 20).toString(), labelX, labelY + 8);
  }

  // === CENTER SPEED DISPLAY WITH HOLOGRAPHIC EFFECT ===
  // Glow effect
  ctx.shadowColor = '#be202e';
  ctx.shadowBlur = 40;
  ctx.font = 'bold 320px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(speed).toString(), centerX, centerY + 100);
  
  ctx.shadowBlur = 0;
  
  // Speed unit with accent
  ctx.font = 'bold 56px Arial';
  ctx.fillStyle = '#be202e';
  ctx.fillText('KM/H', centerX, centerY + 180);
  
  // Hexagon frame around speed
  ctx.strokeStyle = 'rgba(190, 32, 46, 0.5)';
  ctx.lineWidth = 3;
  drawHexagon(ctx, centerX, centerY, 280);
  
  // Inner hexagon
  ctx.strokeStyle = 'rgba(108, 108, 108, 0.3)';
  ctx.lineWidth = 2;
  drawHexagon(ctx, centerX, centerY, 240);
  
  // Status indicator
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#be202e';
  ctx.fillText('● LIVE TRACKING', centerX, centerY - 280);
  
  // Range display
  ctx.font = '32px Arial';
  ctx.fillStyle = '#6c6c6c';
  ctx.fillText(`RANGE ${range} KM`, centerX, centerY + 240);

  // === FUEL GAUGE (Left Side) ===
  drawFuelGauge(ctx, 280, 550, 200, fuelLevel);

  // === BATTERY GAUGE (Right Side) ===
  drawBatteryGauge(ctx, 1768, 550, 200, batteryLevel);

  // === TOP INFO BAR ===
  drawInfoBar(ctx, centerX, temperature, time);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Draw fuel gauge with holographic design
 * @private
 */
function drawFuelGauge(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  fuelLevel: number
): void {
  // Circular progress ring
  const ringRadius = 140;
  
  // Background ring
  ctx.strokeStyle = 'rgba(108, 108, 108, 0.3)';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Fuel level ring with glow
  ctx.shadowColor = '#be202e';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = '#be202e';
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(centerX, centerY, ringRadius, -Math.PI / 2, (-Math.PI / 2) + (fuelLevel * Math.PI * 2));
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Fuel percentage
  ctx.font = 'bold 72px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(fuelLevel * 100) + '%', centerX, centerY + 20);
  
  // Label
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#6c6c6c';
  ctx.fillText('FUEL LEVEL', centerX, centerY + 60);
  
  // Corner brackets (holographic frame)
  ctx.strokeStyle = 'rgba(190, 32, 46, 0.6)';
  ctx.lineWidth = 3;
  const bracketSize = 30;
  const offset = ringRadius + 40;
  
  // Top-left
  ctx.beginPath();
  ctx.moveTo(centerX - offset, centerY - offset + bracketSize);
  ctx.lineTo(centerX - offset, centerY - offset);
  ctx.lineTo(centerX - offset + bracketSize, centerY - offset);
  ctx.stroke();
  
  // Top-right
  ctx.beginPath();
  ctx.moveTo(centerX + offset - bracketSize, centerY - offset);
  ctx.lineTo(centerX + offset, centerY - offset);
  ctx.lineTo(centerX + offset, centerY - offset + bracketSize);
  ctx.stroke();
  
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(centerX - offset, centerY + offset - bracketSize);
  ctx.lineTo(centerX - offset, centerY + offset);
  ctx.lineTo(centerX - offset + bracketSize, centerY + offset);
  ctx.stroke();
  
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(centerX + offset - bracketSize, centerY + offset);
  ctx.lineTo(centerX + offset, centerY + offset);
  ctx.lineTo(centerX + offset, centerY + offset - bracketSize);
  ctx.stroke();
  
  // Data readout lines
  ctx.font = '20px monospace';
  ctx.fillStyle = '#6c6c6c';
  ctx.textAlign = 'center';
  ctx.fillText('SENSOR: ACTIVE', centerX, centerY + 200);
  ctx.fillText(`LITERS: ${Math.round(fuelLevel * 400)}L`, centerX, centerY + 230);
}

/**
 * Draw system diagnostics panel
 * @private
 */
function drawBatteryGauge(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  battLevel: number
): void {
  // System status panel with holographic design
  const panelWidth = 280;
  const panelHeight = 320;
  
  // Panel background with border
  ctx.strokeStyle = 'rgba(190, 32, 46, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight);
  
  // Inner border
  ctx.strokeStyle = 'rgba(108, 108, 108, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(centerX - panelWidth / 2 + 10, centerY - panelHeight / 2 + 10, panelWidth - 20, panelHeight - 20);
  
  // Title
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#be202e';
  ctx.textAlign = 'center';
  ctx.fillText('DIAGNOSTICS', centerX, centerY - 120);
  
  // Divider line
  ctx.strokeStyle = 'rgba(190, 32, 46, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - 120, centerY - 90);
  ctx.lineTo(centerX + 120, centerY - 90);
  ctx.stroke();
  
  // Status items
  ctx.font = '22px monospace';
  ctx.textAlign = 'left';
  
  // Engine status
  ctx.fillStyle = '#6c6c6c';
  ctx.fillText('ENGINE', centerX - 110, centerY - 50);
  ctx.fillStyle = '#be202e';
  ctx.fillText('● ONLINE', centerX + 10, centerY - 50);
  
  // Sensor status
  ctx.fillStyle = '#6c6c6c';
  ctx.fillText('SENSOR', centerX - 110, centerY - 10);
  ctx.fillStyle = '#be202e';
  ctx.fillText('● ACTIVE', centerX + 10, centerY - 10);
  
  // GPS status
  ctx.fillStyle = '#6c6c6c';
  ctx.fillText('GPS', centerX - 110, centerY + 30);
  ctx.fillStyle = '#be202e';
  ctx.fillText('● LOCKED', centerX + 10, centerY + 30);
  
  // Temperature
  ctx.fillStyle = '#6c6c6c';
  ctx.fillText('TEMP', centerX - 110, centerY + 70);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('18°C', centerX + 10, centerY + 70);
  
  // Pressure
  ctx.fillStyle = '#6c6c6c';
  ctx.fillText('PRESSURE', centerX - 110, centerY + 110);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('2.4 BAR', centerX + 10, centerY + 110);
}

/**
 * Draw top info bar with holographic header
 * @private
 */
function drawInfoBar(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  temperature: number,
  time: string
): void {
  // Top header bar
  ctx.fillStyle = 'rgba(190, 32, 46, 0.1)';
  ctx.fillRect(0, 0, 2048, 200);
  
  // Header border
  ctx.strokeStyle = 'rgba(190, 32, 46, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 200);
  ctx.lineTo(2048, 200);
  ctx.stroke();
  
  // Branding with glow
  ctx.textAlign = 'center';
  ctx.shadowColor = '#be202e';
  ctx.shadowBlur = 20;
  ctx.font = 'bold 56px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TRANSLINK', centerX, 90);
  ctx.shadowBlur = 0;
  
  ctx.font = 'bold 36px Arial';
  ctx.fillStyle = '#be202e';
  ctx.fillText('FUEL TELEMATICS SYSTEM', centerX, 140);
  
  // Time display (left)
  ctx.textAlign = 'left';
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#6c6c6c';
  ctx.fillText('TIME', 100, 90);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(time, 100, 140);
  
  // Temperature (right)
  ctx.textAlign = 'right';
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#6c6c6c';
  ctx.fillText('AMBIENT', 1948, 90);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${temperature}°C`, 1948, 140);
  
  // Corner accents
  ctx.strokeStyle = '#be202e';
  ctx.lineWidth = 3;
  
  // Top-left corner
  ctx.beginPath();
  ctx.moveTo(50, 80);
  ctx.lineTo(50, 50);
  ctx.lineTo(80, 50);
  ctx.stroke();
  
  // Top-right corner
  ctx.beginPath();
  ctx.moveTo(1998, 80);
  ctx.lineTo(1998, 50);
  ctx.lineTo(1968, 50);
  ctx.stroke();
}

/**
 * Draw hexagon shape
 * @private
 */
function drawHexagon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.stroke();
}

/**
 * Create telematics texture with default values (for backward compatibility)
 * @deprecated Use createTelematicsTexture with TelematicsData object instead
 */
export function createTelematicsTextureLegacy(
  speed: number = 85,
  fuelLevel: number = 0.65
): THREE.CanvasTexture {
  return createTelematicsTexture({ speed, fuelLevel });
}
