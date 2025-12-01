import type { EngineRefs, WindRefs, NoiseType } from './types';

/**
 * AudioSystem - Enhanced Truck Audio Engine
 * 
 * Provides realistic truck audio simulation including:
 * - Deep diesel engine rumble (brown noise)
 * - Piston firing rhythm (AM synthesis)
 * - Road and wind ambience (pink noise)
 * - Dual-tone air horn
 * - Scanner/radio effects
 * - UI chirp sounds
 * 
 * @example
 * ```typescript
 * const audioSystem = new AudioSystem();
 * audioSystem.init();
 * audioSystem.toggleMute(false);
 * audioSystem.triggerHorn();
 * ```
 */
export class AudioSystem {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  
  // Engine Components
  engineRefs: EngineRefs = {};
  engineRumbleGain: GainNode | null = null;

  // Ambience Components
  windRefs: WindRefs = {};

  scannerNode: AudioBufferSourceNode | null = null;
  scannerGain: GainNode | null = null;

  hornOsc1: OscillatorNode | null = null;
  hornOsc2: OscillatorNode | null = null;
  hornGain: GainNode | null = null;

  airBrakeBuffer: AudioBuffer | null = null;
  airBrakeGain: GainNode | null = null;

  engineStartBuffer: AudioBuffer | null = null;
  engineStartPlaying: boolean = false;

  engineRunBuffer: AudioBuffer | null = null;
  engineRunSource: AudioBufferSourceNode | null = null;
  engineRunGain: GainNode | null = null;

  initialized = false;

  /**
   * Initialize the audio system
   * Creates AudioContext and sets up all audio nodes
   */
  init(): void {
    if (this.initialized) return;
    
    // Create Context
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    
    // Master Gain (Volume Control)
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // Start muted
    this.masterGain.connect(this.ctx.destination);

    this.setupScanner();
    this.setupHorn();
    this.loadAirBrake();
    this.loadEngineStart();
    this.loadEngineRun();
    
    this.initialized = true;
  }

  /**
   * Toggle mute state
   * @param isMuted - True to mute, false to unmute
   */
  toggleMute(isMuted: boolean): void {
    // If context is closed, reinitialize everything
    if (this.ctx?.state === 'closed') {
      this.initialized = false;
      this.init();
    }
    
    if (!this.initialized) this.init();
    
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
    
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      const targetGain = isMuted ? 0 : 0.25;
      this.masterGain.gain.setTargetAtTime(targetGain, now, 0.3);
    }
  }

  /**
   * Create noise buffer for audio synthesis
   * @param type - Type of noise ('pink' or 'brown')
   * @returns AudioBuffer or null
   */
  createNoiseBuffer(type: NoiseType): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds loop
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'pink') {
      // Pink Noise (1/f) - More natural sound
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; 
        b6 = white * 0.115926;
      }
    } else {
      // Brown Noise (1/f^2) - Deep rumble
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; 
      }
    }
    return buffer;
  }

  /**
   * Setup engine audio (rumble + piston firing)
   * @private
   */
  private setupEngine(): void {
    if (!this.ctx || !this.masterGain) return;
    
    // 1. DEEP RUMBLE (Brown Noise)
    // Simulates the physical vibration of heavy diesel chassis
    const brownNoise = this.createNoiseBuffer('brown');
    if (brownNoise) {
      const src = this.ctx.createBufferSource();
      src.buffer = brownNoise;
      src.loop = true;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 100; // Very low sub-bass

      const gain = this.ctx.createGain();
      gain.gain.value = 0; // Start at 0, will be set by engine start

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start();
      
      this.engineRefs.rumbleFilter = filter;
      this.engineRumbleGain = gain;
    }

    // 2. PISTON CHUG (Sawtooth + AM Synthesis)
    // Simulates rhythmic firing of cylinders
    const pistonOsc = this.ctx.createOscillator();
    pistonOsc.type = 'sawtooth';
    pistonOsc.frequency.value = 60; // Base Engine Tone

    const pistonGain = this.ctx.createGain();
    pistonGain.gain.value = 0; // Controlled by LFO

    const pistonLFO = this.ctx.createOscillator();
    pistonLFO.type = 'sine';
    pistonLFO.frequency.value = 12; // Firing rate (approx 12Hz)

    // Connect LFO to Gain (AM Synthesis for piston chug effect)
    const lfoScaler = this.ctx.createGain();
    lfoScaler.gain.value = 0.15; // Modulation depth
    pistonLFO.connect(lfoScaler);
    lfoScaler.connect(pistonGain.gain);
    
    const pistonFilter = this.ctx.createBiquadFilter();
    pistonFilter.type = 'lowpass';
    pistonFilter.frequency.value = 400;

    pistonOsc.connect(pistonFilter);
    pistonFilter.connect(pistonGain);
    pistonGain.connect(this.masterGain);

    pistonOsc.start();
    pistonLFO.start();

    this.engineRefs.pistonOsc = pistonOsc;
    this.engineRefs.pistonLFO = pistonLFO;
  }

  /**
   * Setup ambient sounds (road noise + wind)
   * @private
   */
  private setupAmbience(): void {
    if (!this.ctx || !this.masterGain) return;
    
    const pinkNoise = this.createNoiseBuffer('pink');
    if (!pinkNoise) return;

    // 1. ROAD NOISE (Constant Tire Roar)
    const roadSrc = this.ctx.createBufferSource();
    roadSrc.buffer = pinkNoise;
    roadSrc.loop = true;

    const roadFilter = this.ctx.createBiquadFilter();
    roadFilter.type = 'lowpass';
    roadFilter.frequency.value = 350;
    
    const roadGain = this.ctx.createGain();
    roadGain.gain.value = 0; // Start silent, will be activated with engine start

    roadSrc.connect(roadFilter);
    roadFilter.connect(roadGain);
    roadGain.connect(this.masterGain);
    roadSrc.start();
    
    this.windRefs.roadGain = roadGain;

    // 2. WIND GUSTS (High Air Rush)
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = pinkNoise;
    windSrc.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 600; // Lowered from 800 Hz
    windFilter.Q.value = 0.3; // Further reduced to eliminate whistle

    const windGain = this.ctx.createGain();
    windGain.gain.value = 0; // Start silent, will be activated with engine start

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.masterGain);
    windSrc.start();

    this.windRefs.windGain = windGain;
  }

  /**
   * Setup scanner/radio effect
   * @private
   */
  private setupScanner(): void {
    if (!this.ctx || !this.masterGain) return;
    
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500; 
    filter.Q.value = 8; 

    const gain = this.ctx.createGain();
    gain.gain.value = 0; 

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
    
    this.scannerNode = noise;
    this.scannerGain = gain;
  }

  /**
   * Setup dual-tone truck horn
   * @private
   */
  private setupHorn(): void {
    if (!this.ctx || !this.masterGain) return;
    
    // Dual-tone truck horn (realistic frequencies)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 185; // F#3
    
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 233; // A#3

    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    
    osc1.start();
    osc2.start();
    
    this.hornOsc1 = osc1;
    this.hornOsc2 = osc2;
    this.hornGain = gain;
  }

  /**
   * Load air brake sound from MP3 file
   * @private
   */
  private async loadAirBrake(): Promise<void> {
    if (!this.ctx || !this.masterGain) return;
    
    try {
      const response = await fetch('/audio/Truck-Recycling-Air_Brake-Foot_Pedal.mp3');
      if (!response.ok) return;
      
      const arrayBuffer = await response.arrayBuffer();
      this.airBrakeBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Load engine start sound from MP3 file
   * @private
   */
  private async loadEngineStart(): Promise<void> {
    if (!this.ctx || !this.masterGain) return;
    
    try {
      const response = await fetch('/audio/Truck-Engine-Start.mp3');
      if (!response.ok) return;
      
      const arrayBuffer = await response.arrayBuffer();
      this.engineStartBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Load engine run (idle) sound from MP3 file
   * @private
   */
  private async loadEngineRun(): Promise<void> {
    if (!this.ctx || !this.masterGain) return;
    
    try {
      const response = await fetch('/audio/Truck-Engine-Run2.mp3');
      if (!response.ok) return;
      
      const arrayBuffer = await response.arrayBuffer();
      this.engineRunBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      
      // Create gain node for engine run
      this.engineRunGain = this.ctx.createGain();
      this.engineRunGain.gain.value = 0;
      this.engineRunGain.connect(this.masterGain);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Trigger engine start sound with delayed idle engine
   * SHOULD ONLY BE CALLED ONCE - when user clicks "ENTER EXPERIENCE"
   * Sequence:
   * - 0.0s: Engine start MP3 begins (fade in 0.1s)
   * - 0.0-2.0s: Only MP3 playing (idle engine silent)
   * - 2.0s: Idle engine starts at 10% and fades up to 40%
   * - 2.0s: Engine start MP3 starts fading out
   * - 4.5s: Engine start MP3 ends, idle engine continues at 40%
   */
  triggerEngineStart(): void {
    if (!this.ctx || !this.engineStartBuffer) return;
    if (this.engineStartPlaying) return;
    
    const now = this.ctx.currentTime;
    const duration = this.engineStartBuffer.duration; // ~4.5s
    const idleStartTime = 2.0; // Idle engine starts at 2 seconds
    const crossfadeDuration = duration - idleStartTime; // ~2.5s crossfade
    
    this.engineStartPlaying = true;
    
    // Start engine run MP3 loop at 2 seconds
    if (this.engineRunBuffer && this.engineRunGain) {
      // Create looping source for engine run
      this.engineRunSource = this.ctx.createBufferSource();
      this.engineRunSource.buffer = this.engineRunBuffer;
      this.engineRunSource.loop = true;
      this.engineRunSource.connect(this.engineRunGain);
      
      // Keep at 0 until 2 seconds
      this.engineRunGain.gain.cancelScheduledValues(now);
      this.engineRunGain.gain.setValueAtTime(0, now);
      this.engineRunGain.gain.setValueAtTime(0, now + idleStartTime);
      // At 2 seconds, fade in quickly - Reduced by 50%
      this.engineRunGain.gain.linearRampToValueAtTime(0.15, now + idleStartTime + 0.3);
      // Then fade up to full volume by the end - Reduced by 50%
      this.engineRunGain.gain.linearRampToValueAtTime(0.25, now + duration);
      
      // Start playing immediately (but silent until 2s)
      this.engineRunSource.start(now);
    }
    
    // Create buffer source for engine start MP3
    const source = this.ctx.createBufferSource();
    source.buffer = this.engineStartBuffer;
    
    // Create gain node for engine start MP3
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    // Fade in quickly
    gain.gain.linearRampToValueAtTime(1.0, now + 0.1);
    // Hold at full volume until idle engine starts
    gain.gain.setValueAtTime(1.0, now + idleStartTime);
    // Fade out during crossfade
    gain.gain.linearRampToValueAtTime(0, now + duration);
    
    // Connect and play
    source.connect(gain);
    gain.connect(this.masterGain!);
    source.start(now);
    source.stop(now + duration);
    
    // Cleanup when finished
    source.onended = () => {
      this.engineStartPlaying = false;
    };
  }

  /**
   * Trigger air brake sound (realistic MP3 sample)
   * Duration: Uses actual file duration
   */
  triggerAirBrake(): void {
    if (!this.ctx || !this.airBrakeBuffer) return;
    
    const now = this.ctx.currentTime;
    const duration = this.airBrakeBuffer.duration;
    
    // Create new buffer source for this playback
    const source = this.ctx.createBufferSource();
    source.buffer = this.airBrakeBuffer;
    
    // Create dedicated gain node for this playback instance
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    
    // Fade in quickly, hold, then fade out - Increased volume
    gain.gain.linearRampToValueAtTime(1.2, now + 0.05);
    gain.gain.setValueAtTime(1.2, now + Math.max(0, duration - 0.2));
    gain.gain.linearRampToValueAtTime(0, now + duration);
    
    // Connect and play
    source.connect(gain);
    gain.connect(this.masterGain!);
    source.start(now);
    source.stop(now + duration);
  }

  /**
   * Trigger truck horn sound only (long-short pattern)
   * Does NOT trigger air brake - use this when air brake is already playing
   * Sequence:
   * - Horn long blast: 0.0-1.0s
   * - Horn short blast: 1.2-1.8s
   */
  triggerHornOnly(): void {
    if (!this.ctx || !this.hornGain) return;
    const now = this.ctx.currentTime;
    
    // Horn starts immediately
    this.hornGain.gain.cancelScheduledValues(now);
    this.hornGain.gain.setValueAtTime(0, now);
    
    // Long blast (0.0-1.0s) - 25% volume
    this.hornGain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    this.hornGain.gain.linearRampToValueAtTime(0.2, now + 0.9);
    this.hornGain.gain.linearRampToValueAtTime(0, now + 1.0);
    
    // Short blast (1.2-1.8s) - 25% volume
    this.hornGain.gain.linearRampToValueAtTime(0.2, now + 1.2);
    this.hornGain.gain.linearRampToValueAtTime(0.2, now + 1.7);
    this.hornGain.gain.linearRampToValueAtTime(0, now + 1.8);
  }

  /**
   * Trigger truck horn sound (long-short pattern)
   * Automatically triggers air brake before horn
   * Sequence:
   * - Air brake hiss: 0.0-0.7s
   * - Horn long blast: 0.3-1.3s (overlaps with air brake tail)
   * - Horn short blast: 1.5-2.1s
   */
  triggerHorn(): void {
    if (!this.ctx || !this.hornGain) return;
    const now = this.ctx.currentTime;
    
    // Trigger air brake first (0.0-0.7s)
    this.triggerAirBrake();
    
    // Horn starts at 0.3s (overlaps with air brake tail)
    this.hornGain.gain.cancelScheduledValues(now);
    this.hornGain.gain.setValueAtTime(0, now);
    
    // Long blast (0.3-1.3s) - 25% volume
    this.hornGain.gain.linearRampToValueAtTime(0.2, now + 0.3);
    this.hornGain.gain.linearRampToValueAtTime(0.2, now + 1.2);
    this.hornGain.gain.linearRampToValueAtTime(0, now + 1.3);
    
    // Short blast (1.5-2.1s) - 25% volume
    this.hornGain.gain.linearRampToValueAtTime(0.2, now + 1.5);
    this.hornGain.gain.linearRampToValueAtTime(0.2, now + 2.0);
    this.hornGain.gain.linearRampToValueAtTime(0, now + 2.1);
  }

  /**
   * Trigger UI chirp sound (for phase transitions)
   */
  triggerChirp(): void {
    if (!this.ctx || !this.masterGain || this.masterGain.gain.value < 0.01) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, t);
    osc.frequency.exponentialRampToValueAtTime(1000, t + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Reduce engine volume to background level (15%)
   * Called after 6% scroll to make engine less prominent
   */
  reduceEngineVolume(): void {
    if (!this.ctx || !this.engineRunGain) return;
    
    const now = this.ctx.currentTime;
    this.engineRunGain.gain.cancelScheduledValues(now);
    this.engineRunGain.gain.setValueAtTime(this.engineRunGain.gain.value, now);
    this.engineRunGain.gain.linearRampToValueAtTime(0.15, now + 1.0);
  }

  /**
   * Update audio parameters based on time
   * Call this in your animation loop for dynamic audio
   * @param time - Current elapsed time in seconds
   */
  update(time: number): void {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    
    // Modulate Engine Components - REDUCED for smoother sound
    if (this.engineRefs.pistonLFO) {
      // Very subtle rev variation
      this.engineRefs.pistonLFO.frequency.value = 12 + Math.sin(time * 0.3) * 0.5;
    }
    if (this.engineRefs.rumbleFilter) {
      // Minimal rumble variation
      this.engineRefs.rumbleFilter.frequency.value = 100 + Math.sin(time * 0.15) * 5;
    }

    // Minimal Wind/Road Noise modulation
    if (this.windRefs.windGain) {
      this.windRefs.windGain.gain.value = 0.10 + Math.sin(time * 0.2) * 0.02;
    }
  }

  /**
   * Update scanner volume (for radio/scanner effects)
   * @param isScanning - Whether scanner is active
   * @param time - Current elapsed time
   */
  updateScannerVolume(isScanning: boolean, time: number): void {
    if (!this.ctx || !this.scannerGain) return;
    
    if (isScanning) {
      const flutter = 0.06 + Math.sin(time * 60) * 0.02; 
      this.scannerGain.gain.setTargetAtTime(flutter, this.ctx.currentTime, 0.05);
    } else {
      this.scannerGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * Cleanup and dispose audio resources
   */
  dispose(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
