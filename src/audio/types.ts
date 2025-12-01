/**
 * Audio System Type Definitions
 * 
 * Type definitions for the Translink audio engine system
 */

export interface EngineRefs {
  rumbleFilter?: BiquadFilterNode;
  pistonOsc?: OscillatorNode;
  pistonLFO?: OscillatorNode;
}

export interface WindRefs {
  roadGain?: GainNode;
  windGain?: GainNode;
}

export type NoiseType = 'pink' | 'brown';

export interface AudioSystemConfig {
  masterVolume?: number;
  engineVolume?: number;
  ambienceVolume?: number;
}
