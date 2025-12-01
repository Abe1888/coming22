import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Volume2, VolumeX, Radio, Zap, Cpu, BarChart3, Layers } from 'lucide-react';
import * as THREE from 'three';
import { FuelSensor } from './components/FuelSensor';
import { TruckModel } from './components/TruckModel';
import { TelematicsDisplay, updateTelematicsDisplay } from './components/TelematicsDisplay';
import { ParticleSystem, animateParticles } from './components/ParticleSystem';
import { AudioSystem } from './audio/AudioSystem';
import { createRoadTexture } from './textures/RoadTexture';
import { TypewriterText } from './components/TypewriterText';
import { HUDProgress } from './components/HUDProgress';
import objectTransforms from './config/objectTransforms.json';
import { waitForDocumentReady } from './utils/domHelpers';
import { createSceneInitializer } from './utils/SceneInitializer';
import { DiagnosticOverlay, useDebugMode, useFPS, type AssetMetric } from './components/DiagnosticOverlay';
import { createTransformValidator, type TransformSnapshot } from './utils/TransformValidator';
import { ThreeJSErrorBoundary } from './components/ThreeJSErrorBoundary';

// --- AUDIO SYSTEM EXTRACTED ---
// AudioSystem class moved to: src/audio/AudioSystem.ts
// Import added above for cleaner code organization

// --- ROAD TEXTURE EXTRACTED ---
// Road texture generator moved to: src/textures/RoadTexture.ts
// Import added above for cleaner code organization

// --- TELEMATICS TEXTURE EXTRACTED ---
// Telematics texture generator moved to: src/textures/TelematicsTexture.ts
// Import added above for cleaner code organization

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioSysRef = useRef<AudioSystem | null>(null);
  const glbModelRef = useRef<THREE.Group | null>(null);
  const wheelsRef = useRef<THREE.Mesh[]>([]); // Wheel references for rotation
  
  const [isMuted, setIsMuted] = useState(true);
  const [activePhase, setActivePhase] = useState(0);
  const [showIntroScreen, setShowIntroScreen] = useState(true);
  const [introFadingOut, setIntroFadingOut] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(100); // Start at 100 for instant loading
  const [scrollPast3, setScrollPast3] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  
  // Diagnostic overlay state
  const debugMode = useDebugMode();
  const fps = useFPS();
  const [diagnosticTransforms, setDiagnosticTransforms] = useState<TransformSnapshot[]>([]);
  const [diagnosticAssets, setDiagnosticAssets] = useState<AssetMetric[]>([]);
  const cameraRef = useRef<THREE.Camera | null>(null);
  
  // Extended intro animation refs
  const extendedModeRef = useRef(false);
  const extendedIntroStartTimeRef = useRef<number | null>(null);
  const extendedIntroFinishedRef = useRef(false);
  const engineStartTriggered = useRef(false);

  // Store refs for direct Three.js updates (NO React state needed!)
  const truckModelRef = useRef<THREE.Group | null>(null);
  const fuelSensorGroupRef = useRef<THREE.Group | null>(null);
  const telematicsDisplayRef = useRef<THREE.Group | null>(null);
  const logoPlaneRef = useRef<THREE.Mesh | null>(null);

  // SVG Path Refs for dynamic updates
  const headPathRef = useRef<SVGPathElement>(null);
  const probePathRef = useRef<SVGPathElement>(null);
  const filterPathRef = useRef<SVGPathElement>(null);
  const headDotRef = useRef<SVGCircleElement>(null);
  const probeDotRef = useRef<SVGCircleElement>(null);
  const filterDotRef = useRef<SVGCircleElement>(null);

  // Fuel Sensor Component Refs
  const sensorHeadGroupRef = useRef<THREE.Group | null>(null);
  const probeTubeRef = useRef<THREE.Mesh | null>(null);
  const cageGroupRef = useRef<THREE.Group | null>(null);
  const truckRef = useRef<THREE.Group | null>(null);
  const tankGroupRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  
  // Material Refs for TruckModel
  const lightGrayMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const edgeMatRef = useRef<THREE.LineBasicMaterial | null>(null);
  
  // Material Ref for TelematicsDisplay
  const telematicsMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  
  // Ref for ParticleSystem
  const particlesRef = useRef<THREE.Points | null>(null);
  
  // Scene initializer ref
  const sceneInitializerRef = useRef<ReturnType<typeof createSceneInitializer> | null>(null);

  if (!audioSysRef.current) {
    audioSysRef.current = new AudioSystem();
    audioSysRef.current.init(); // Initialize immediately to load audio files
  }

  const toggleAudio = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    audioSysRef.current?.toggleMute(newState);
  };

  // Get detailed section name based on scroll progress and phase
  const getSectionName = (progress: number, phase: number): string => {
    // Extended intro trigger point
    if (progress === 50) {
      return 'EXTENDED INTRO';
    }
    
    // Determine if we're in first or second sequence
    // Only show SEQ 2 if we're actually past 50%
    const isSecondSequence = progress > 50;
    const sequenceLabel = isSecondSequence ? ' (SEQ 2)' : '';
    
    // Return phase-specific names
    switch (phase) {
      case 0:
        // Distinguish between intro (0-15%) and velocity (15-35%)
        if (progress <= 15) {
          return `INTRO${sequenceLabel}`;
        }
        return `VELOCITY${sequenceLabel}`;
      case 1:
        return `SENSOR HEAD${sequenceLabel}`;
      case 2:
        return `EXPLODED VIEW${sequenceLabel}`;
      case 3:
        return `TOP VIEW${sequenceLabel}`;
      default:
        return `INTRO${sequenceLabel}`;
    }
  };

  const dismissIntroScreen = () => {
    // Unmute audio and trigger engine start sound (only once)
    if (audioSysRef.current && !engineStartTriggered.current) {
      if (isMuted) {
        setIsMuted(false);
        audioSysRef.current.toggleMute(false);
      }
      audioSysRef.current.triggerEngineStart();
      engineStartTriggered.current = true;
    }
    
    setIntroFadingOut(true);
    setTimeout(() => {
      setShowIntroScreen(false);
      document.body.style.overflow = 'auto';
    }, 1000);
  };

  useEffect(() => {
    if (showIntroScreen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showIntroScreen]);

  // Reset scroll position to 0 on page load
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Smooth counter animation for scroll progress
  useEffect(() => {
    const diff = scrollProgress - displayProgress;
    if (Math.abs(diff) < 0.5) {
      setDisplayProgress(scrollProgress);
      return;
    }
    
    const timer = setTimeout(() => {
      setDisplayProgress(prev => {
        const step = diff > 0 ? 1 : -1;
        const next = prev + step;
        if ((step > 0 && next >= scrollProgress) || (step < 0 && next <= scrollProgress)) {
          return scrollProgress;
        }
        return next;
      });
    }, 5); // Ultra-fast counting (5ms interval for smooth counting)
    
    return () => clearTimeout(timer);
  }, [scrollProgress, displayProgress]);



  useEffect(() => {
    if (!mountRef.current) return;

    let mounted = true;
    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer | null = null;
    
    // Store event handlers for cleanup
    let handleScroll: (() => void) | null = null;
    let handleResize: (() => void) | null = null;
    let handleViewportClick: (() => void) | null = null;

    // Async initialization to wait for CSS
    async function initScene() {
      // Create scene initializer
      const sceneInitializer = createSceneInitializer({
        transformsPath: '/config/objectTransforms.json',
        enableValidation: true,
        logTransforms: true
      });
      
      sceneInitializerRef.current = sceneInitializer;
      
      // Wait for CSS to be fully loaded
      await sceneInitializer.waitForCSS();
      
      if (!mounted || !mountRef.current) return;

      // === SCENE SETUP ===
      // Initialize scene with proper background and fog
      const scene = await sceneInitializer.initializeScene();
    
      // Base ground color: #e8e4dc
      // Create lighter background by increasing brightness by ~8%
      const groundColor = 0xe8e4dc;
      const backgroundColorLighter = 0xf0ede8; // Derived from ground color (lighter)
      
      scene.background = new THREE.Color(backgroundColorLighter);
      
      // Add exponential fog for smooth horizon blending (more natural than linear fog)
      scene.fog = new THREE.FogExp2(
        backgroundColorLighter, // Match lighter background color
        0.012     // Slightly reduced density for smoother transition
      );
      
      sceneRef.current = scene;
    
    // Camera (controlled by scroll) - Reduced FOV for more natural perspective
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000); // Reduced from 55 to 45
    camera.position.set(0, 3, -20); // Starting position
    
    // Store camera reference for diagnostic overlay
    cameraRef.current = camera;
    
    // Renderer with shadow support
    renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current!.appendChild(renderer.domElement);

    // === STUDIO LIGHTING SETUP ===
    // Ambient light (high for overall brightness)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Increased to 1.0 for better overall brightness
    scene.add(ambientLight);

    // Main directional light (Key Light) - from top-right-BACK (matching target image)
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5); // Increased to 2.5
    mainLight.position.set(25, 35, -15); // Right, high, BEHIND truck (negative Z)
    mainLight.castShadow = true;
    
    // Optimized shadow settings
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.left = -30;
    mainLight.shadow.camera.right = 30;
    mainLight.shadow.camera.top = 30;
    mainLight.shadow.camera.bottom = -30;
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.bias = -0.0005;
    mainLight.shadow.radius = 4; // Even softer shadows (increased from 3)
    
    scene.add(mainLight);

    // Fill light from front-left (illuminates cab and front)
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.4); // Increased to 1.4 for brighter cab
    fillLight.position.set(-20, 12, 30); // Front-left, closer to truck
    scene.add(fillLight);

    // Secondary fill from right-front (balances cab lighting)
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.2); // Increased to 1.2
    frontLight.position.set(15, 10, 30); // Right-front, closer and higher
    scene.add(frontLight);

    // REMOVED: Back light and hemisphere light

    // === MATERIALS (White & Light Gray Only) ===
    // Using MeshStandardMaterial for proper shadow support
    const lightGrayMat = new THREE.MeshStandardMaterial({ 
      color: 0xe0e0e0, // Light gray (brightened from 0xd5d5d5 to fix washed-out cab)
      roughness: 0.7, // Slightly less matte for better light reflection
      metalness: 0.08, // Slightly more metallic for better highlights
      envMapIntensity: 0.3 // Reduce environment reflections
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.4 }); // Subtle dark gray edges
    
    // Store materials in refs for TruckModel component
    lightGrayMatRef.current = lightGrayMat;
    edgeMatRef.current = edgeMat;

    // === CLEAN GROUND PLANE (Studio Floor) with Gradient ===
    // Create gradient texture for seamless horizon blend
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Radial gradient derived from base ground color #e8e4dc
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#e0dcd4');    // Slightly darker center (base ground -3%)
    gradient.addColorStop(0.3, '#e8e4dc');  // Original ground color
    gradient.addColorStop(0.6, '#ece9e2');  // Mid-transition (+3%)
    gradient.addColorStop(1, '#f0ede8');    // Matches lighter background (+5%)
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    const groundTexture = new THREE.CanvasTexture(canvas);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300), // Even larger for seamless fade
      new THREE.MeshStandardMaterial({ 
        map: groundTexture,
        roughness: 1.0, // Completely matte
        metalness: 0.0, // No metallic reflection
        side: THREE.DoubleSide,
        fog: true // Ensure fog affects this material
      })
    );
    ground.rotation.x = -Math.PI / 2; // Lay flat
    ground.position.y = -1.1; // Same height as before
    ground.receiveShadow = true; // Receive shadows from truck
    scene.add(ground);

    // === ANIMATED LANE LINES (Moving Road Markings) ===
    const laneLineMaterial = new THREE.MeshBasicMaterial({
      color: 0xbe202e, // Brand crimson red
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const laneLines: THREE.Mesh[] = [];

    // Truck is at X=1.1, Z=-5.3 (model position inside truck group)
    // Road should be centered around truck

    // 1. LEFT BORDER - Solid full-length line (road edge)
    const leftBorder = new THREE.Mesh(
      new THREE.PlaneGeometry(0.25, 200), // Width 0.25, Length 200 (thin and long, matching dash orientation)
      laneLineMaterial
    );
    leftBorder.rotation.x = -Math.PI / 2; // Lay flat on ground
    leftBorder.position.set(-2.5, -1.09, -5); // Left of truck (3.6 units left of truck center)
    leftBorder.userData.lane = 'left-border';
    leftBorder.userData.solid = true;
    scene.add(leftBorder);
    laneLines.push(leftBorder);

    // 2. CENTER DASHED LINE - 1-meter segments with gaps
    const dashLength = 1.5; // 1.5 meter per dash
    const dashGap = 1.5; // 1.5 meter gap
    const dashPattern = dashLength + dashGap; // 3 meters total
    const numDashes = 80; // Dashes to cover view

    for (let i = 0; i < numDashes; i++) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, dashLength), // Width 0.2, Length 1.5 (swapped for correct orientation)
        laneLineMaterial
      );
      dash.rotation.x = -Math.PI / 2; // Lay flat on ground
      dash.position.set(1.1, -1.09, -120 + (i * dashPattern)); // Aligned with truck X position
      dash.userData.lane = 'center';
      scene.add(dash);
      laneLines.push(dash);
    }

    // 3. RIGHT BORDER - Solid full-length line (road edge)
    const rightBorder = new THREE.Mesh(
      new THREE.PlaneGeometry(0.25, 200), // Width 0.25, Length 200 (thin and long, matching dash orientation)
      laneLineMaterial
    );
    rightBorder.rotation.x = -Math.PI / 2; // Lay flat on ground
    rightBorder.position.set(4.7, -1.09, -5); // Right of truck (3.6 units right of truck center)
    rightBorder.userData.lane = 'right-border';
    rightBorder.userData.solid = true;
    scene.add(rightBorder);
    laneLines.push(rightBorder);

    // === TRUCK GROUP ===
    console.log('🚛 Creating truck group...');
    const truck = new THREE.Group();
    scene.add(truck);
    truckRef.current = truck;
    console.log('✓ Truck group created and added to scene');
    console.log('   - Truck group position:', truck.position);
    console.log('   - Scene children count:', scene.children.length);
    
    // Mark scene as ready - this will trigger React components to render
    console.log('✅ Scene initialization complete, setting sceneReady = true');
    setSceneReady(true);

    // Shadow plane removed - using actual shadow rendering now

    // --- GLB TRUCK MODEL EXTRACTED ---
    // GLB loading logic moved to: src/components/TruckModel.tsx
    // Component will be rendered in JSX below

    // --- PARTICLE SYSTEM EXTRACTED ---
    // Particle system logic moved to: src/components/ParticleSystem.tsx
    // Component will be rendered in JSX below

    // --- TELEMATICS DISPLAY EXTRACTED ---
    // Telematics display logic moved to: src/components/TelematicsDisplay.tsx
    // Component will be rendered in JSX below

    // === ANIMATION LOOP ===
    const clock = new THREE.Clock();
    const scrollRef = { current: 0 };
    let currentPhase = 0;
    
    // Intro fade system
    let introProgress = 0;
    const INTRO_DURATION = 2.5;

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      
      // --- INTRO FADE-IN ANIMATION ---
      if (introProgress < INTRO_DURATION) {
        introProgress += delta;
        const fadeT = Math.min(introProgress / INTRO_DURATION, 1);
        const easeT = fadeT * fadeT * (3 - 2 * fadeT); // Smoothstep easing
        
        // Fade in materials if they exist
        if (lightGrayMatRef.current) {
          lightGrayMatRef.current.opacity = easeT;
          lightGrayMatRef.current.transparent = true;
        }
        if (edgeMatRef.current) {
          edgeMatRef.current.opacity = easeT * 0.4;
        }
      }
      
      // --- EXTENDED INTRO ANIMATION (Triggered at 50% scroll) ---
      const EXTENDED_INTRO_DURATION = 3.5;
      let isExtendedIntro = false;
      
      if (extendedModeRef.current && !extendedIntroFinishedRef.current) {
        if (extendedIntroStartTimeRef.current === null) {
          extendedIntroStartTimeRef.current = time;
        }
        
        const extendedIntroElapsed = time - extendedIntroStartTimeRef.current;
        
        if (extendedIntroElapsed < EXTENDED_INTRO_DURATION) {
          isExtendedIntro = true;
          // Truck Entrance from behind camera
          // Start Z: 120 (Behind Camera), End Z: 0
          const progress = Math.min(extendedIntroElapsed / 3.0, 1);
          const ease = 1 - Math.pow(1 - progress, 3); // Cubic Out
          truck.position.z = 120 * (1 - ease);
          
          // Horn Trigger at 2.0s
          if (extendedIntroElapsed > 2.0 && extendedIntroElapsed < 2.02) {
            if (audioSysRef.current?.masterGain && audioSysRef.current.masterGain.gain.value > 0) {
              audioSysRef.current.triggerHorn();
            }
          }
          
          // Camera shake effect during horn
          if (extendedIntroElapsed > 2.0 && extendedIntroElapsed < 2.5) {
            const shake = (Math.random() - 0.5) * 0.2;
            camera.position.y += shake;
          }
        } else {
          // Extended intro finished - lock truck at z=0
          if (!extendedIntroFinishedRef.current) {
            truck.position.z = 0;
            extendedIntroFinishedRef.current = true;
          }
        }
      }
      
      // Keep truck at z=0 after extended intro finishes or if not in extended mode
      if ((extendedModeRef.current && extendedIntroFinishedRef.current) || !extendedModeRef.current) {
        truck.position.z = 0;
      }

      // Animate lane lines (moving road markings)
      if (scrollRef.current > 0.02 || extendedModeRef.current) {
        const roadSpeed = 16.67; // units per second (60 km/h = 16.67 m/s)
        laneLines.forEach(line => {
          // Skip solid borders (they don't move)
          if (line.userData.solid) return;
          
          line.position.z += delta * roadSpeed;
          
          // Loop center dashed lines when they go too far forward
          if (line.userData.lane === 'center' && line.position.z > 100) {
            line.position.z -= 200; // Reset to back
          }
        });
      }

      // Animate particles using helper function
      if (particlesRef.current) {
        animateParticles(particlesRef.current, delta);
      }

      // Truck subtle movement (only Y axis bounce, Z is controlled by extended intro)
      truck.position.y = Math.sin(time * 15) * 0.015;

      // ===== REAL-WORLD WHEEL PHYSICS =====
      const SCALE_FACTOR = 1.25; // meters per Three.js unit
      const WHEEL_DIAMETER_UNITS = 0.8; // Three.js units
      const WHEEL_RADIUS_UNITS = WHEEL_DIAMETER_UNITS / 2; // 0.4 units
      const WHEEL_RADIUS_METERS = WHEEL_RADIUS_UNITS * SCALE_FACTOR; // 0.5m real-world
      
      const roadSpeedUnitsPerSec = 1.6; // Three.js units/sec (matches road texture scroll)
      const truckVelocityMetersPerSec = roadSpeedUnitsPerSec * SCALE_FACTOR; // ~2.0 m/s
      const wheelAngularVelocity = truckVelocityMetersPerSec / WHEEL_RADIUS_METERS; // rad/s
      
      // Apply rotation to all wheels
      if (wheelsRef.current.length > 0) {
        wheelsRef.current.forEach(mesh => {
          mesh.rotation.x += wheelAngularVelocity * delta;
        });
      }

      // === UPDATE TELEMATICS DISPLAY ===
      // Update every 0.5 seconds for performance
      if (Math.floor(time * 2) !== Math.floor((time - delta) * 2)) {
        const baseSpeed = 96;
        const speedVariation = Math.sin(time * 0.5) * 10;
        const currentSpeed = baseSpeed + speedVariation;
        
        const fuelConsumption = time * 0.002;
        const currentFuel = Math.max(0.15, 0.65 - fuelConsumption);
        
        // Update telematics display using helper function
        if (telematicsMatRef.current) {
          updateTelematicsDisplay(telematicsMatRef.current, {
            speed: currentSpeed,
            fuelLevel: currentFuel
          });
        }
      }

      // === SCROLL-BASED CAMERA SYSTEM (4 PHASES) ===
      // Clamp scroll value to prevent camera from going beyond boundaries
      const t = Math.min(Math.max(scrollRef.current, 0), 1);
      
      // Camera positions for different phases (optimized for better viewing angles)
      const pIntro = { pos: new THREE.Vector3(0, 3, -20), look: new THREE.Vector3(0, 2, 0) };
      const pChase = { pos: new THREE.Vector3(-18, 5, 22), look: new THREE.Vector3(0, 1.5, -5) }; // Lower, more back-left
      const pExtendedIntroChase = { pos: new THREE.Vector3(-22, 8, 45), look: new THREE.Vector3(0, 2, -10) };
      const pScan  = { pos: new THREE.Vector3(12, 4, -5), look: new THREE.Vector3(3.1, 1.5, -5) };
      const pXray  = { pos: new THREE.Vector3(7, 2.5, -5), look: new THREE.Vector3(3.1, 1.0, -5) };
      const pTop   = { pos: new THREE.Vector3(3.1, 8, -5), look: new THREE.Vector3(3.1, 0, -5) };

      const currentPos = new THREE.Vector3();
      const currentLook = new THREE.Vector3();
      let nextPhase = 0;

      if (isExtendedIntro) {
        // EXTENDED INTRO: Camera at chase position
        currentPos.copy(pExtendedIntroChase.pos);
        currentLook.copy(pExtendedIntroChase.look);
        nextPhase = 0;
      } else if (extendedModeRef.current && extendedIntroFinishedRef.current && t < 0.15) {
        // TRANSITION FROM EXTENDED INTRO TO SECOND SEQUENCE
        const localT = Math.min(t / 0.15, 1);
        const easeT = localT * localT * (3 - 2 * localT);
        currentPos.lerpVectors(pExtendedIntroChase.pos, pChase.pos, easeT);
        currentLook.lerpVectors(pExtendedIntroChase.look, pChase.look, easeT);
        nextPhase = 0;
      } else if (t < 0.15) {
        // INTRO: Slow dolly forward from darkness (first sequence only)
        const localT = Math.min(t / 0.15, 1);
        const easeT = localT * localT * (3 - 2 * localT);
        currentPos.lerpVectors(pIntro.pos, pChase.pos, easeT);
        currentLook.lerpVectors(pIntro.look, pChase.look, easeT);
        nextPhase = 0;
      } else if (t < 0.35) {
        // VELOCITY: Hold hero angle
        const localT = Math.min((t - 0.15) / 0.20, 1);
        currentPos.lerpVectors(pChase.pos, pScan.pos, localT * 0.3);
        currentLook.lerpVectors(pChase.look, pScan.look, localT * 0.3);
        nextPhase = 0;
      } else if (t < 0.55) {
        // SENSOR HEAD: Move to side view (PHASE 1 - 3D Card)
        const localT = Math.min((t - 0.35) / 0.20, 1);
        const easeT = localT * localT * (3 - 2 * localT);
        currentPos.lerpVectors(pScan.pos, pXray.pos, easeT * 0.5);
        currentLook.lerpVectors(pScan.look, pXray.look, easeT * 0.5);
        nextPhase = 1;
      } else if (t < 0.75) {
        // EXPLODED VIEW: Close-up detail (PHASE 2 - SVG)
        const localT = Math.min((t - 0.55) / 0.20, 1);
        const easeT = localT * localT * (3 - 2 * localT);
        currentPos.lerpVectors(pXray.pos, pXray.pos, easeT);
        currentLook.lerpVectors(pXray.look, pXray.look, easeT);
        nextPhase = 2;
      } else {
        // TOP VIEW: Final reveal (PHASE 3)
        // Clamp to ensure we stay at final position when t >= 1.0
        const localT = Math.min((t - 0.75) / 0.25, 1);
        const easeT = localT * localT * (3 - 2 * localT);
        currentPos.lerpVectors(pXray.pos, pTop.pos, easeT);
        currentLook.lerpVectors(pXray.look, pTop.look, easeT);
        nextPhase = 3;
      }

      if (nextPhase !== currentPhase) {
        setActivePhase(nextPhase);
        currentPhase = nextPhase;
      }

      // Smooth camera interpolation with breathing
      const breathe = Math.sin(time * 0.5) * 0.15;
      currentPos.y += breathe;
      camera.position.lerp(currentPos, 0.08);
      camera.lookAt(currentLook);
      
      // === UPDATE 3D CARD POSITION (Phase 1 only) ===
      if (currentPhase === 1 && tankGroupRef.current) {
        const tankPos = new THREE.Vector3();
        tankGroupRef.current.getWorldPosition(tankPos);
        
        const truckWorldQuat = new THREE.Quaternion();
        truck.getWorldQuaternion(truckWorldQuat);
        
        // Card positioning removed - using phase text overlays instead
      }

      // === UPDATE SVG PATHS (Phase 2 only - Exploded View) ===
      if (currentPhase === 2) {
        const tempV = new THREE.Vector3();
        
        const updatePath = (object: THREE.Object3D, pathEl: SVGPathElement | null, dotEl: SVGCircleElement | null, cardYRatio: number, isLeftSide: boolean = false) => {
          if (!pathEl || !dotEl) return;
          
          object.getWorldPosition(tempV);
          tempV.project(camera);
          
          const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
          const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;
          
          // Calculate exact position of vertical line
          // Card base position + padding-left (30px) - vertical line position (left: 0)
          const baseCardX = isLeftSide ? window.innerWidth * 0.10 : window.innerWidth * 0.66;
          const verticalLineX = baseCardX; // Vertical line is at left edge of card container
          const cardY = window.innerHeight * cardYRatio;
          
          // Calculate midpoint for smooth right-angle path
          const midX = x + (verticalLineX - x) * 0.5;
          
          // Create path: Start at component -> horizontal to midpoint -> vertical to card height -> horizontal to vertical line
          const d = `M ${x} ${y} L ${midX} ${y} L ${midX} ${cardY} L ${verticalLineX} ${cardY}`;
          pathEl.setAttribute('d', d);
          dotEl.setAttribute('cx', String(x));
          dotEl.setAttribute('cy', String(y));
        };

        // Update paths using refs from FuelSensor component
        if (sensorHeadGroupRef.current) {
          updatePath(sensorHeadGroupRef.current, headPathRef.current, headDotRef.current, 0.25, false); // Right side
        }
        if (probeTubeRef.current) {
          updatePath(probeTubeRef.current, probePathRef.current, probeDotRef.current, 0.50, false); // Right side
        }
        if (cageGroupRef.current) {
          updatePath(cageGroupRef.current, filterPathRef.current, filterDotRef.current, 0.75, false); // Right side
        }
      }

      if (renderer) {
        renderer.render(scene, camera);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    let airBrakeTriggered = false;
    let hornTriggered = false;

    handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const rawScroll = Math.min(Math.max(window.scrollY / total, 0), 1);
      
      // Update scroll progress percentage for UI
      setScrollProgress(Math.round(rawScroll * 100));
      
      // Track if scrolled past 3%
      setScrollPast3(rawScroll > 0.03);
      
      // Store previous scroll value BEFORE updating
      const prevScroll = scrollRef.current;
      
      // Reset extended mode if scrolling back below 50%
      if (rawScroll < 0.5 && extendedModeRef.current) {
        extendedModeRef.current = false;
        extendedIntroFinishedRef.current = false;
        extendedIntroStartTimeRef.current = null;
      }
      
      // Check if we've reached 50% of page (trigger extended intro)
      if (rawScroll >= 0.5 && !extendedModeRef.current) {
        // Trigger extended mode (intro phase + cloned sequence)
        extendedModeRef.current = true;
        scrollRef.current = 0;
      } else if (!extendedModeRef.current) {
        // First half of scroll (0-50% = original sequence)
        scrollRef.current = rawScroll * 2; // Map 0-0.5 to 0-1
      } else if (extendedIntroFinishedRef.current) {
        // After extended intro, map second half (50-100%) to cloned sequence (0-1)
        scrollRef.current = (rawScroll - 0.5) * 2; // Map 0.5-1 to 0-1
      } else {
        // During extended intro, keep scroll at 0
        scrollRef.current = 0;
      }
      
      // Trigger air brake at first scroll (0%)
      if (!airBrakeTriggered && scrollRef.current > 0) {
        if (audioSysRef.current?.masterGain && audioSysRef.current.masterGain.gain.value > 0) {
          audioSysRef.current.triggerAirBrake();
          airBrakeTriggered = true;
        }
      }

      // Trigger horn after 6% scroll and reduce engine volume
      if (!hornTriggered && scrollRef.current > 0.06) {
        if (audioSysRef.current?.masterGain && audioSysRef.current.masterGain.gain.value > 0) {
          audioSysRef.current.triggerHornOnly();
          audioSysRef.current.reduceEngineVolume();
          hornTriggered = true;
        }
      }
    };

    handleResize = () => {
      if (!renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    // Enable audio on first click anywhere on the page
    let audioActivated = false;
    handleViewportClick = () => {
        if (!audioActivated && audioSysRef.current) {
            // Initialize audio if not already initialized
            if (!audioSysRef.current.initialized) {
                audioSysRef.current.init();
            }
            
            // Check if audio is currently off by checking masterGain
            if (audioSysRef.current.masterGain && audioSysRef.current.masterGain.gain.value === 0) {
                audioSysRef.current.toggleMute(false);
                setIsMuted(false);
                audioActivated = true;
            }
        }
    };
    // Attach to document to catch clicks anywhere (including through overlays)
    document.addEventListener('click', handleViewportClick);

    animate();
    }

    // Start initialization
    initScene();

    // Cleanup function
    return () => {
      mounted = false;
      if (handleScroll) {
        window.removeEventListener('scroll', handleScroll);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (handleViewportClick) {
        document.removeEventListener('click', handleViewportClick);
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (renderer) {
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
      // Don't close AudioContext in cleanup - it causes issues with React StrictMode
      // AudioContext will be garbage collected when page unloads
    };
  }, []);

  return (
    <div className="app-container">
      {/* Intro Screen - Loading Overlay */}
      {showIntroScreen && (
        <div 
          className={`intro-screen ${introFadingOut ? 'fading-out' : 'visible'}`}
        >
          <div className="intro-content">
            {/* Header - Logo */}
            <div className="intro-header">
              <img src="/optimized/logo.webp" alt="Translink" className="intro-logo" />
            </div>
            
            {/* Center - Button */}
            <div className="intro-center">
              {loadingProgress === 100 ? (
                <button
                  onClick={dismissIntroScreen}
                  className="intro-enter-button"
                >
                  ENTER EXPERIENCE
                </button>
              ) : (
                <div className="loading-indicator">
                  <div className="loading-spinner" />
                  <p className="loading-text">Loading 3D Experience...</p>
                </div>
              )}
            </div>
            
            {/* Footer - Fleet Telematics Text */}
            <div className="intro-footer">
              <p className="intro-subtitle">FLEET TELEMATICS</p>
            </div>
          </div>
        </div>
      )}

      {/* Wrap 3D scene in error boundary */}
      <ThreeJSErrorBoundary
        onError={(error, errorInfo) => {
          console.error('3D Scene Error:', error, errorInfo);
        }}
        onReset={() => {
          console.log('Resetting 3D scene...');
          // Scene will reinitialize on component remount
        }}
      >
        <div ref={mountRef} className="canvas-container" />

        {/* HUD Progress Indicator */}
        {!showIntroScreen && (
          <HUDProgress 
            scrollProgress={displayProgress}
            activePhase={activePhase}
            sectionName={getSectionName(scrollProgress, activePhase)}
          />
        )}
      </ThreeJSErrorBoundary>

      {/* Top Bar - Logo Only */}
      <div className="top-bar">
        <div className="top-bar-logo">
          <img 
            src="/optimized/logo.webp" 
            alt="Translink Logo" 
            className="logo-image"
          />
        </div>
        
        <div className="top-bar-controls">
          <button 
            onClick={toggleAudio}
            className="audio-button group"
          >
            {isMuted ? (
              <VolumeX className="audio-button-icon" size={16} />
            ) : (
              <Volume2 className="audio-button-icon active" size={16} />
            )}
            <span className="audio-button-text">AUDIO {isMuted ? 'OFF' : 'ON'}</span>
          </button>


        </div>
      </div>

      {/* Bottom Left Card - FUEL LEVEL SENSOR PRO */}
      <div className="bottom-card">
        <div className="bottom-card-content">
          <div className="bottom-card-inner">
            <div className="bottom-card-indicator"></div>
            <div>
              <h1 className="bottom-card-title">
                FUEL LEVEL <span className="bottom-card-title-accent">SENSOR PRO</span>
              </h1>
              <p className="bottom-card-subtitle">TRANSLINK FUEL TELEMATICS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="content-wrapper">
        {/* Phase 0: Intro - Enhanced (Hidden after 3% scroll) */}
        <section className={`section intro-section ${activePhase === 0 && !scrollPast3 ? 'visible' : 'hidden'}`}>
          <div className="intro-section-content">
            <div className="intro-section-badge">
              <div className="intro-section-icon-wrapper">
                <Radio className="intro-section-icon" size={24} />
              </div>
              <span className="intro-section-badge-text">TRANSLINK SOLUTIONS</span>
            </div>
            
            <h2 className="intro-section-heading">
              REAL-TIME
            </h2>
            <h3 className="intro-section-subheading">
              FUEL MONITORING
            </h3>
            
            <div className="intro-section-divider"></div>
            
            <div className="intro-section-description">
              <p className="intro-section-description-main">
                High-precision fuel level monitoring with <span className="intro-section-description-accent">±1% static accuracy</span>.
              </p>
              <p className="intro-section-description-secondary">
                Real-time tracking, theft detection, and seamless fleet integration for comprehensive fuel management.
              </p>
            </div>
            
            <div className="intro-section-stats">
              <div className="intro-section-stat">
                <div className="intro-section-stat-label">Accuracy</div>
                <div className="intro-section-stat-value">±1%</div>
              </div>
              <div className="intro-section-stat">
                <div className="intro-section-stat-label">Resolution</div>
                <div className="intro-section-stat-value">&lt;0.5mm</div>
              </div>
              <div className="intro-section-stat">
                <div className="intro-section-stat-label">Rating</div>
                <div className="intro-section-stat-value">IP67</div>
              </div>
            </div>
          </div>
        </section>

        {/* Phase 1: Card removed - using PhaseText overlay instead */}

        {/* Phase 2: EXPLODED VIEW / COMPONENT BREAKDOWN (SVG OVERLAY) */}
        <div className={`svg-overlay ${activePhase === 2 ? 'visible' : 'hidden'}`}>
          
          {/* DYNAMIC SVG LAYER */}
          <svg className="svg-canvas">
              <defs>
                  <marker id="dot" markerWidth="8" markerHeight="8" refX="4" refY="4">
                      <circle cx="4" cy="4" r="2" fill="#ff5555" />
                  </marker>
                  <filter id="glow">
                      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                      <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                  </filter>
              </defs>

              {/* Connector to Head */}
              <path ref={headPathRef} className="svg-connector-path" />
              <circle ref={headDotRef} r="5" className="svg-connector-dot" />
              
              {/* Connector to Probe */}
              <path ref={probePathRef} className="svg-connector-path" />
              <circle ref={probeDotRef} r="5" className="svg-connector-dot" />

              {/* Connector to Filter */}
              <path ref={filterPathRef} className="svg-connector-path" />
              <circle ref={filterDotRef} r="5" className="svg-connector-dot" />
          </svg>

          {/* INFO CARDS - MODERN REDESIGN */}
          
          {/* 1. SENSOR HEAD Card - Floating Text Design (LEFT SIDE) */}
          <div className="info-card info-card-sensor-head">
              <div className="info-card-container">
                  <div className="info-card-top-bar"></div>
                  
                  <div className="info-card-content">
                      <div className="info-card-header">
                          <div className="info-card-header-left">
                              <div className="info-card-icon-wrapper">
                                  <Cpu className="info-card-icon" size={24} />
                              </div>
                              <div className="info-card-header-text">
                                  <div className="info-card-component-label">COMPONENT 01</div>
                                  <h3 className="info-card-title">SENSOR HEAD</h3>
                              </div>
                          </div>
                          <div className="info-card-header-right">
                              <div className="info-card-status-dot"></div>
                              <div className="info-card-status-text">ACTIVE</div>
                          </div>
                      </div>
                      
                      <p className="info-card-description">
                          <TypewriterText 
                            text="Advanced MCU with remote calibration, self-diagnostics, and real-time data feed. Supports CAN, RS232, and Modbus interfaces."
                            delay={800}
                            speed={25}
                          />
                      </p>
                      
                      <div className="info-card-tags">
                          <span className="info-card-tag">REMOTE CAL</span>
                          <span className="info-card-tag">MULTI-IF</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* 2. FUEL PROBE Card - Floating Text Design */}
          <div className="info-card info-card-fuel-probe">
              <div className="info-card-container">
                  <div className="info-card-top-bar"></div>
                  
                  <div className="info-card-content">
                      <div className="info-card-header">
                          <div className="info-card-header-left">
                              <div className="info-card-icon-wrapper">
                                  <BarChart3 className="info-card-icon" size={24} />
                              </div>
                              <div className="info-card-header-text">
                                  <div className="info-card-component-label">COMPONENT 02</div>
                                  <h3 className="info-card-title">FUEL PROBE</h3>
                              </div>
                          </div>
                          <div className="info-card-header-right">
                              <div className="info-card-status-dot"></div>
                              <div className="info-card-status-text">ACTIVE</div>
                          </div>
                      </div>
                      
                      <p className="info-card-description">
                          <TypewriterText 
                            text="High-precision capacitive probe with <0.5mm resolution. Features inclinometer for tilt compensation and anti-slosh technology for stable readings."
                            delay={1400}
                            speed={25}
                          />
                      </p>
                      
                      <div className="info-card-tags">
                          <span className="info-card-tag">±1% ACCURACY</span>
                          <span className="info-card-tag">ANTI-SLOSH</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* 3. PROTECTION CAGE Card - Floating Text Design */}
          <div className="info-card info-card-protection-cage">
              <div className="info-card-container">
                  <div className="info-card-top-bar"></div>
                  
                  <div className="info-card-content">
                      <div className="info-card-header">
                          <div className="info-card-header-left">
                              <div className="info-card-icon-wrapper">
                                  <Layers className="info-card-icon" size={24} />
                              </div>
                              <div className="info-card-header-text">
                                  <div className="info-card-component-label">COMPONENT 03</div>
                                  <h3 className="info-card-title">PROTECTION CAGE</h3>
                              </div>
                          </div>
                          <div className="info-card-header-right">
                              <div className="info-card-status-dot"></div>
                              <div className="info-card-status-text">ACTIVE</div>
                          </div>
                      </div>
                      
                      <p className="info-card-description">
                          <TypewriterText 
                            text="Corrosion-resistant protective cage with chemical-resistant materials. Shock-resistant design ensures durability in harsh environments."
                            delay={2000}
                            speed={25}
                          />
                      </p>
                      
                      <div className="info-card-tags">
                          <span className="info-card-tag">IP67</span>
                          <span className="info-card-tag">SHOCK-PROOF</span>
                      </div>
                  </div>
              </div>
          </div>

      </div>

        {/* Phase 3: Top View - Enhanced (Only visible at 96-100%) */}
        <section className={`section final-section ${activePhase === 3 && scrollProgress >= 96 ? 'visible' : 'hidden'}`}>
          <div className="final-section-content">
            <div className="final-section-icon-wrapper">
              <div className="final-section-icon-box">
                <Zap className="final-section-icon" size={32} />
              </div>
            </div>
            
            <h3 className="final-section-heading">
              FLEET READY
            </h3>
            
            <p className="final-section-description">
              Seamless integration with your existing fleet management system
            </p>
            
            <div className="final-section-stats">
              <div className="final-section-stat">
                <div className="final-section-stat-value">24/7</div>
                <div className="final-section-stat-label">Monitoring</div>
              </div>
              <div className="final-section-divider"></div>
              <div className="final-section-stat">
                <div className="final-section-stat-value">±1%</div>
                <div className="final-section-stat-label">Accuracy</div>
              </div>
              <div className="final-section-divider"></div>
              <div className="final-section-stat">
                <div className="final-section-stat-value">IP67</div>
                <div className="final-section-stat-label">Rated</div>
              </div>
            </div>
            
            <button className="final-section-cta group">
              <span className="final-section-cta-content">
                Request Demo
                <ChevronDown className="final-section-cta-icon" size={20} />
              </span>
            </button>
            
            <p className="final-section-footer">Fleet Integration Ready</p>
          </div>
        </section>

        <section className="spacer-section"></section>
        <section className="spacer-section"></section>
      </div>

      {/* Scroll Indicator - Enhanced */}
      <div className={`scroll-indicator ${activePhase === 3 ? 'hidden' : 'visible'}`}>
        <div className="scroll-indicator-icon-wrapper">
          <ChevronDown className="scroll-indicator-icon" size={20} />
        </div>
        <span className="scroll-indicator-text">Scroll to Explore</span>
      </div>

      {/* Truck Model Component */}
      {sceneReady && sceneRef.current && truckRef.current && lightGrayMatRef.current && edgeMatRef.current && (
        <TruckModel
          scene={sceneRef.current}
          truckGroup={truckRef.current}
          position={objectTransforms.truck.position as [number, number, number]}
          rotation={objectTransforms.truck.rotation as [number, number, number]}
          scale={objectTransforms.truck.scale[0]}
          lightGrayMaterial={lightGrayMatRef.current}
          edgeMaterial={edgeMatRef.current}
          onProgress={(progress) => {
            setLoadingProgress(progress);
          }}
          onLoad={async (model, wheels) => {
            glbModelRef.current = model;
            wheelsRef.current = wheels;
            truckModelRef.current = model;
            
            // Validate transforms after model is loaded
            if (sceneInitializerRef.current) {
              const validation = await sceneInitializerRef.current.validateTransforms('truck', model);
              if (!validation.valid) {
                console.warn('⚠️ Truck transform validation failed:', validation.errors);
              }
            }
            
            setLoadingProgress(100);
          }}
          onLogoCreated={(logoPlane) => {
            logoPlaneRef.current = logoPlane;
            
            // Apply logo configuration from objectTransforms.json
            const logoConfig = objectTransforms.logo;
            logoPlane.position.set(
              logoConfig.position[0],
              logoConfig.position[1],
              logoConfig.position[2]
            );
            logoPlane.rotation.set(
              logoConfig.rotation[0],
              logoConfig.rotation[1],
              logoConfig.rotation[2]
            );
            logoPlane.scale.set(logoConfig.scale[0], logoConfig.scale[1], 1);
            
            // Apply forward/backward offset in local space
            const forwardOffset = new THREE.Vector3(0, 0, logoConfig.offsetZ);
            forwardOffset.applyQuaternion(logoPlane.quaternion);
            logoPlane.position.add(forwardOffset);
            
            logoPlane.visible = logoConfig.visible;
          }}
        />
      )}

      {/* Telematics Display Component */}
      {sceneReady && sceneRef.current && truckRef.current && (
        <TelematicsDisplay
          scene={sceneRef.current}
          truckGroup={truckRef.current}
          position={objectTransforms.telematicsDisplay.position as [number, number, number]}
          rotation={objectTransforms.telematicsDisplay.rotation as [number, number, number]}
          size={objectTransforms.telematicsDisplay.size as [number, number]}
          initialData={{ speed: 85, fuelLevel: 0.65 }}
          onMaterialCreated={(material) => {
            telematicsMatRef.current = material;
          }}
          onGroupCreated={(group) => {
            telematicsDisplayRef.current = group;
          }}
        />
      )}

      {/* Particle System Component */}
      {sceneReady && sceneRef.current && (
        <ParticleSystem
          scene={sceneRef.current}
          count={400}
          color={0xc0c0c0}
          onParticlesCreated={(particles) => {
            particlesRef.current = particles;
          }}
        />
      )}

      {/* Fuel Sensor Component */}
      {sceneReady && sceneRef.current && truckRef.current && (
        <FuelSensor
          scene={sceneRef.current}
          truckGroup={truckRef.current}
          position={objectTransforms.fuelSensor.position as [number, number, number]}
          rotation={objectTransforms.fuelSensor.rotation as [number, number, number]}
          scale={objectTransforms.fuelSensor.scale}
          probeLength={objectTransforms.fuelSensor.probeLength}
          onComponentsCreated={async (components) => {
            sensorHeadGroupRef.current = components.sensorHeadGroup;
            probeTubeRef.current = components.probeTube;
            cageGroupRef.current = components.cageGroup;
            tankGroupRef.current = components.tankGroup;
            if (components.sensorHeadGroup.parent) {
              fuelSensorGroupRef.current = components.sensorHeadGroup.parent as THREE.Group;
              
              // Validate transforms after fuel sensor is created
              if (sceneInitializerRef.current) {
                const validation = await sceneInitializerRef.current.validateTransforms(
                  'fuelSensor', 
                  fuelSensorGroupRef.current
                );
                if (!validation.valid) {
                  console.warn('⚠️ Fuel sensor transform validation failed:', validation.errors);
                }
              }
            }
          }}
        />
      )}

      {/* Diagnostic Overlay - Enable with ?debug=true */}
      <DiagnosticOverlay
        enabled={debugMode}
        fps={fps}
        transforms={diagnosticTransforms}
        assetMetrics={diagnosticAssets}
        camera={cameraRef.current || undefined}
      />

    </div>
  );
}


