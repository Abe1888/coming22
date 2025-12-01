/**
 * Texture Type Definitions
 * 
 * Type definitions for texture generators
 */

/**
 * Telematics data for dashboard display
 */
export interface TelematicsData {
  /** Current speed in KM/H (0-160) */
  speed: number;
  /** Fuel level (0.0-1.0) */
  fuelLevel: number;
  /** Battery level (0.0-1.0) - optional */
  batteryLevel?: number;
  /** Temperature in Celsius - optional */
  temperature?: number;
  /** Current time (HH:MM format) - optional */
  time?: string;
  /** ECO mode enabled - optional */
  ecoMode?: boolean;
  /** Estimated range in KM - optional */
  range?: number;
}

/**
 * Road texture configuration
 */
export interface RoadTextureOptions {
  /** Canvas size (default: 2048) */
  size?: number;
  /** Background color (default: '#ffffff') */
  backgroundColor?: string;
  /** Lane line color (default: '#ff0000') */
  laneColor?: string;
  /** Number of lanes (default: 3) */
  laneCount?: number;
  /** Dash pattern for center line [dash, gap] (default: [80, 60]) */
  dashPattern?: [number, number];
  /** Left lane position ratio (default: 0.35) */
  leftLanePosition?: number;
  /** Right lane position ratio (default: 0.65) */
  rightLanePosition?: number;
  /** Center lane position ratio (default: 0.5) */
  centerLanePosition?: number;
  /** Solid line width (default: 16) */
  solidLineWidth?: number;
  /** Dashed line width (default: 12) */
  dashedLineWidth?: number;
}
