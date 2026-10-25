import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { ALL_BODY_ZONES, ZONE_MAP } from '../data/bodyZones';
import { BodyZone, Quadrant, RoutineSessionRecord } from '../types';
import { audioService } from '../services/audioService';
import { NormalizedHandTelemetry, OnDeviceCoverageTracker } from '../cv/coverageTracker';
import {
  Volume2,
  VolumeX,
  Camera,
  ArrowLeft,
  Hand,
  Eye,
  PlusCircle,
  Grid,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Box,
  Clock,
  Sparkles,
} from 'lucide-react';

interface RoutineSessionProps {
  currentCycleDay: number;
  onFinishRoutine: (record: RoutineSessionRecord) => void;
  onOpenFindingModal: (zone: BodyZone, onSaved?: () => void) => void;
  onExit: () => void;
  onOpenVideoDemo?: () => void;
}

// 20 Practical, Clinically-Sound Key Zones (10 Right + 10 Left)
export interface KeyZone {
  id: string;
  side: 'right' | 'left';
  shortSpeech: string;
  displayName: string;
  quadrant: Quadrant;
  targetOffset: [number, number]; // [dx, dy] from breast center in 3D
  mappedZoneId: string;
}

const KEY_20_ZONES: KeyZone[] = [
  // --- Right Breast (Zones 1 to 10) ---
  {
    id: 'R-Z1',
    side: 'right',
    shortSpeech: 'Right nipple',
    displayName: 'Right Nipple & Areola',
    quadrant: 'Areola / Nipple Complex',
    targetOffset: [0, 0],
    mappedZoneId: 'R-AREOLA',
  },
  {
    id: 'R-Z2',
    side: 'right',
    shortSpeech: 'Right periareolar',
    displayName: 'Right Periareolar Ring',
    quadrant: 'Upper Inner Quadrant (UIQ)',
    targetOffset: [0.02, 0.005],
    mappedZoneId: 'R-B-R1-1',
  },
  {
    id: 'R-Z3',
    side: 'right',
    shortSpeech: 'Right upper inner',
    displayName: 'Right Upper Inner Quadrant',
    quadrant: 'Upper Inner Quadrant (UIQ)',
    targetOffset: [-0.035, 0.045],
    mappedZoneId: 'R-B-R3-1',
  },
  {
    id: 'R-Z4',
    side: 'right',
    shortSpeech: 'Right upper outer',
    displayName: 'Right Upper Outer Quadrant',
    quadrant: 'Upper Outer Quadrant (UOQ)',
    targetOffset: [0.045, 0.042],
    mappedZoneId: 'R-B-R3-10',
  },
  {
    id: 'R-Z5',
    side: 'right',
    shortSpeech: 'Right underarm tail',
    displayName: 'Right Axillary Tail of Spence',
    quadrant: 'Axillary Tail of Spence',
    targetOffset: [0.072, 0.055],
    mappedZoneId: 'R-AX-MID',
  },
  {
    id: 'R-Z6',
    side: 'right',
    shortSpeech: 'Right underarm',
    displayName: 'Right Axillary Hollow',
    quadrant: 'Axillary Tail of Spence',
    targetOffset: [0.095, 0.085],
    mappedZoneId: 'R-AX-UPPER',
  },
  {
    id: 'R-Z7',
    side: 'right',
    shortSpeech: 'Right lower outer',
    displayName: 'Right Lower Outer Quadrant',
    quadrant: 'Lower Outer Quadrant (LOQ)',
    targetOffset: [0.042, -0.042],
    mappedZoneId: 'R-B-R3-8',
  },
  {
    id: 'R-Z8',
    side: 'right',
    shortSpeech: 'Right lower crease',
    displayName: 'Right Inframammary Crease',
    quadrant: 'Lower Outer Quadrant (LOQ)',
    targetOffset: [0.005, -0.065],
    mappedZoneId: 'R-B-R4-6',
  },
  {
    id: 'R-Z9',
    side: 'right',
    shortSpeech: 'Right lower inner',
    displayName: 'Right Lower Inner Quadrant',
    quadrant: 'Lower Inner Quadrant (LIQ)',
    targetOffset: [-0.038, -0.038],
    mappedZoneId: 'R-B-R3-4',
  },
  {
    id: 'R-Z10',
    side: 'right',
    shortSpeech: 'Right breastbone edge',
    displayName: 'Right Sternal Border',
    quadrant: 'Lower Inner Quadrant (LIQ)',
    targetOffset: [-0.06, 0.002],
    mappedZoneId: 'R-B-R4-3',
  },

  // --- Left Breast (Zones 11 to 20) ---
  {
    id: 'L-Z1',
    side: 'left',
    shortSpeech: 'Left nipple',
    displayName: 'Left Nipple & Areola',
    quadrant: 'Areola / Nipple Complex',
    targetOffset: [0, 0],
    mappedZoneId: 'L-AREOLA',
  },
  {
    id: 'L-Z2',
    side: 'left',
    shortSpeech: 'Left periareolar',
    displayName: 'Left Periareolar Ring',
    quadrant: 'Upper Inner Quadrant (UIQ)',
    targetOffset: [-0.02, 0.005],
    mappedZoneId: 'L-B-R1-11',
  },
  {
    id: 'L-Z3',
    side: 'left',
    shortSpeech: 'Left upper inner',
    displayName: 'Left Upper Inner Quadrant',
    quadrant: 'Upper Inner Quadrant (UIQ)',
    targetOffset: [0.035, 0.045],
    mappedZoneId: 'L-B-R3-11',
  },
  {
    id: 'L-Z4',
    side: 'left',
    shortSpeech: 'Left upper outer',
    displayName: 'Left Upper Outer Quadrant',
    quadrant: 'Upper Outer Quadrant (UOQ)',
    targetOffset: [-0.045, 0.042],
    mappedZoneId: 'L-B-R3-2',
  },
  {
    id: 'L-Z5',
    side: 'left',
    shortSpeech: 'Left underarm tail',
    displayName: 'Left Axillary Tail of Spence',
    quadrant: 'Axillary Tail of Spence',
    targetOffset: [-0.072, 0.055],
    mappedZoneId: 'L-AX-MID',
  },
  {
    id: 'L-Z6',
    side: 'left',
    shortSpeech: 'Left underarm',
    displayName: 'Left Axillary Hollow',
    quadrant: 'Axillary Tail of Spence',
    targetOffset: [-0.095, 0.085],
    mappedZoneId: 'L-AX-UPPER',
  },
  {
    id: 'L-Z7',
    side: 'left',
    shortSpeech: 'Left lower outer',
    displayName: 'Left Lower Outer Quadrant',
    quadrant: 'Lower Outer Quadrant (LOQ)',
    targetOffset: [-0.042, -0.042],
    mappedZoneId: 'L-B-R3-4',
  },
  {
    id: 'L-Z8',
    side: 'left',
    shortSpeech: 'Left lower crease',
    displayName: 'Left Inframammary Crease',
    quadrant: 'Lower Outer Quadrant (LOQ)',
    targetOffset: [-0.005, -0.065],
    mappedZoneId: 'L-B-R4-6',
  },
  {
    id: 'L-Z9',
    side: 'left',
    shortSpeech: 'Left lower inner',
    displayName: 'Left Lower Inner Quadrant',
    quadrant: 'Lower Inner Quadrant (LIQ)',
    targetOffset: [0.038, -0.038],
    mappedZoneId: 'L-B-R3-8',
  },
  {
    id: 'L-Z10',
    side: 'left',
    shortSpeech: 'Left breastbone edge',
    displayName: 'Left Sternal Border',
    quadrant: 'Lower Inner Quadrant (LIQ)',
    targetOffset: [0.06, 0.002],
    mappedZoneId: 'L-B-R4-9',
  },
];

const DEPTH_LABELS = [
  { key: 0, label: 'Light', color: '#ffa6c9' },
  { key: 1, label: 'Medium', color: '#ff3f86' },
  { key: 2, label: 'Firm', color: '#d1114f' },
];

export const RoutineSession: React.FC<RoutineSessionProps> = ({
  currentCycleDay,
  onFinishRoutine,
  onOpenFindingModal,
  onExit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sequential Step Flow (1: explore -> 2: spiral -> 3: 20 zones)
  const [currentStep, setCurrentStep] = useState<'explore' | 'spiral' | 'sectors'>('explore');

  // Phase 1 Auto-advance (15 seconds)
  const [phase1Countdown, setPhase1Countdown] = useState<number>(15);

  // Phase 2 Pass Count (5 passes)
  const [spiralPassCount, setSpiralPassCount] = useState<number>(1);

  // Phase 3 Key Zones (20 zones one by one with dwell countdown)
  const [zoneIndex, setZoneIndex] = useState<number>(0);
  const [visitedZoneIds, setVisitedZoneIds] = useState<string[]>([]);
  const [zoneCountdown, setZoneCountdown] = useState<number>(6);
  const isReportingRef = useRef<boolean>(false);

  // Spiral Pressure Mode
  const [pressureMode, setPressureMode] = useState<'auto' | 0 | 1 | 2>('auto');
  const [activePressureLevel, setActivePressureLevel] = useState<number>(1);

  // Voice State (bottom-left)
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Fullscreen Camera CV Mode (MediaPipe 3-Finger + Torso Landmarker + Optical Motion Fallback)
  const [isCameraFullscreen, setIsCameraFullscreen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraTouchPoint, setCameraTouchPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSubSectorSweeping, setIsSubSectorSweeping] = useState(false);
  const videoFeedRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [motionCoord, setMotionCoord] = useState<{ x: number; y: number } | null>(null);
  const [motionProgress, setMotionProgress] = useState<number>(0);
  const mpTrackerRef = useRef<OnDeviceCoverageTracker>(new OnDeviceCoverageTracker());
  const [mpTelemetry, setMpTelemetry] = useState<NormalizedHandTelemetry | null>(null);

  // Stop voice immediately when component unmounts or navigates away
  useEffect(() => {
    return () => {
      audioService.stopAll();
    };
  }, []);

  // Elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Current active key zone
  const activeKeyZone: KeyZone = KEY_20_ZONES[zoneIndex] || KEY_20_ZONES[0];

  // Three.js References
  const currentStepRef = useRef(currentStep);
  const pressureModeRef = useRef(pressureMode);
  const zoneIndexRef = useRef(zoneIndex);
  const activeKeyZoneRef = useRef(activeKeyZone);
  const flyToFnRef = useRef<
    ((name: 'home' | 'feel' | 'sectorClose', side?: 'left' | 'right', dur?: number) => void) | null
  >(null);
  const sectorMarkerMeshRef = useRef<THREE.Mesh | null>(null);

  currentStepRef.current = currentStep;
  pressureModeRef.current = pressureMode;
  zoneIndexRef.current = zoneIndex;
  activeKeyZoneRef.current = activeKeyZone;

  // Session timer
  useEffect(() => {
    if (isCompleted) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted]);

  // Phase 1 Auto-Advance Countdown (15 seconds)
  useEffect(() => {
    if (currentStep !== 'explore' || isCompleted) return;
    setPhase1Countdown(15);

    const timer = setInterval(() => {
      setPhase1Countdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto move to step 2 after 15 seconds!
          handleGoToSpiral();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStep, isCompleted]);

  // Phase 3 Zone Auto-Advance Countdown (6 seconds per zone if no report clicked)
  useEffect(() => {
    if (currentStep !== 'sectors' || isCompleted) return;
    setZoneCountdown(6);

    const timer = setInterval(() => {
      if (isReportingRef.current) return; // Pause if reporting modal is open

      setZoneCountdown((prev) => {
        if (prev <= 1) {
          // Time expired and user didn't report: auto move to next sector!
          handleAutoAdvanceZone();
          return 6;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStep, zoneIndex, isCompleted]);

  // Voice Narration on Initial Mount (Short & crisp)
  useEffect(() => {
    if (!voiceEnabled) return;
    if (currentStep === 'explore') {
      audioService.speak('Step 1: Visual Inspection. Stand in front of your mirror and check symmetry.');
    }
  }, [voiceEnabled]);

  // Voice Narration on Zone Change in Phase 3 + Fast Sweep across all subsectors
  useEffect(() => {
    if (currentStep !== 'sectors') return;
    if (voiceEnabled && zoneIndex > 0) {
      audioService.speak(activeKeyZone.shortSpeech);
    }
    setIsSubSectorSweeping(true);
    const sweepTimer = setTimeout(() => setIsSubSectorSweeping(false), 500);
    return () => clearTimeout(sweepTimer);
  }, [zoneIndex, currentStep, voiceEnabled, activeKeyZone.shortSpeech]);

  const getCurrentPressureInfo = () => {
    if (currentStep === 'explore') {
      return { label: 'Light (Visual Only)', color: '#ffa6c9' };
    }
    if (currentStep === 'spiral') {
      if (spiralPassCount <= 1) return { label: 'Light Pressure (Superficial Skin)', color: '#ffa6c9' };
      if (spiralPassCount <= 3) return { label: 'Medium Pressure (Mid Glandular)', color: '#ff3f86' };
      return { label: 'Firm Pressure (Deep Retromammary / Ribs)', color: '#d1114f' };
    }
    // sectors:
    if (activeKeyZone.id.includes('Z1') || activeKeyZone.id.includes('Z2')) {
      return { label: 'Light Pressure (Superficial Areolar)', color: '#ffa6c9' };
    }
    if (
      activeKeyZone.id.includes('Z5') ||
      activeKeyZone.id.includes('Z6') ||
      activeKeyZone.id.includes('Z8') ||
      activeKeyZone.id.includes('Z10')
    ) {
      return { label: 'Firm Pressure (Deep Wall & Axilla)', color: '#d1114f' };
    }
    return { label: 'Medium Pressure (Glandular Tissue)', color: '#ff3f86' };
  };

  // Camera Management for Fullscreen CV
  useEffect(() => {
    if (isCameraFullscreen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isCameraFullscreen]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoFeedRef.current) {
        videoFeedRef.current.srcObject = stream;
        videoFeedRef.current.play();
      }
    } catch {
      setCameraError('Camera access unavailable. Using simulated finger tracking.');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  // MediaPipe 3-Finger + Torso Landmarker & Optical Motion Analysis in Camera AR Mode
  useEffect(() => {
    if (!isCameraFullscreen) return;

    let isCancelled = false;
    let animId: number;
    let prevData: Uint8ClampedArray | null = null;
    let dwellCount = 0;
    let poseLandmarker: PoseLandmarker | null = null;
    let handLandmarker: HandLandmarker | null = null;
    let lastVideoTime = -1;

    // Initialize MediaPipe Vision WASM models asynchronously
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        if (isCancelled) return;
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        if (isCancelled) return;
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });
      } catch {
        // Fallback to optical motion tracking if offline
      }
    })();

    const analyzeMotion = () => {
      if (isCancelled) return;
      const vid = videoFeedRef.current;
      const cvs = motionCanvasRef.current;
      const nowMs = performance.now();

      if (vid && vid.readyState >= 2) {
        let handledByMediaPipe = false;

        // 1. Primary: MediaPipe 3-Finger Pad + Torso Landmark Tracking
        if (poseLandmarker && handLandmarker && vid.currentTime !== lastVideoTime) {
          lastVideoTime = vid.currentTime;
          try {
            const poseRes = poseLandmarker.detectForVideo(vid, nowMs);
            const handRes = handLandmarker.detectForVideo(vid, nowMs);

            const telemetry = mpTrackerRef.current.processMediaPipeResults(
              poseRes?.landmarks?.[0],
              handRes?.landmarks,
              handRes?.handedness,
              nowMs
            );
            setMpTelemetry(telemetry);

            if (handRes?.landmarks && handRes.landmarks.length > 0) {
              handledByMediaPipe = true;
              const hand = handRes.landmarks[0];
              const padX = (hand[8].x + hand[12].x + hand[16].x) / 3;
              const padY = (hand[8].y + hand[12].y + hand[16].y) / 3;
              const normX = 1 - padX; // Mirrored video
              const normY = padY;
              setMotionCoord({ x: normX, y: normY });

              if (telemetry.isMovingPalpation && (telemetry.activeZoneId || (normX > 0.2 && normX < 0.8 && normY > 0.2 && normY < 0.85))) {
                dwellCount++;
                const prog = Math.min(100, Math.round((dwellCount / 22) * 100));
                setMotionProgress(prog);

                if (prog >= 100) {
                  audioService.playChime('zone');
                  handleAutoAdvanceZone();
                  dwellCount = 0;
                  setMotionProgress(0);
                }
              }
            }
          } catch {
            // Ignore frame errors
          }
        }

        // 2. Fallback: Optical Motion Analysis if MediaPipe hand not currently in frame
        if (!handledByMediaPipe && cvs) {
          const ctx = cvs.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const w = 80;
            const h = 60;
            ctx.drawImage(vid, 0, 0, w, h);
            const curr = ctx.getImageData(0, 0, w, h);
            const data = curr.data;

            if (prevData) {
              let sumX = 0;
              let sumY = 0;
              let diffCount = 0;

              for (let i = 0; i < data.length; i += 4) {
                const diff =
                  Math.abs(data[i] - prevData[i]) +
                  Math.abs(data[i + 1] - prevData[i + 1]) +
                  Math.abs(data[i + 2] - prevData[i + 2]);

                if (diff > 50) {
                  const px = (i / 4) % w;
                  const py = Math.floor(i / 4 / w);
                  sumX += px;
                  sumY += py;
                  diffCount++;
                }
              }

              if (diffCount > 15) {
                const normX = 1 - sumX / diffCount / w;
                const normY = sumY / diffCount / h;
                setMotionCoord({ x: normX, y: normY });

                if (normX > 0.25 && normX < 0.75 && normY > 0.25 && normY < 0.8) {
                  dwellCount++;
                  const prog = Math.min(100, Math.round((dwellCount / 22) * 100));
                  setMotionProgress(prog);

                  if (prog >= 100) {
                    audioService.playChime('zone');
                    handleAutoAdvanceZone();
                    dwellCount = 0;
                    setMotionProgress(0);
                  }
                } else {
                  dwellCount = Math.max(0, dwellCount - 1);
                  setMotionProgress(Math.round((dwellCount / 22) * 100));
                }
              }
            }
            prevData = new Uint8ClampedArray(data);
          }
        }
      }
      animId = requestAnimationFrame(analyzeMotion);
    };

    animId = requestAnimationFrame(analyzeMotion);
    return () => {
      isCancelled = true;
      cancelAnimationFrame(animId);
      poseLandmarker?.close();
      handLandmarker?.close();
    };
  }, [isCameraFullscreen]);

  // Three.js Mount & Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isDisposed = false;
    const PI = Math.PI;
    const clamp = THREE.MathUtils.clamp;
    const easeIO = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0f16);
    scene.fog = new THREE.Fog(0x1a0f16, 4, 9);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.15;
    controls.maxDistance = 5;

    const resize = () => {
      if (isDisposed || !canvas.parentElement) return;
      const w = canvas.parentElement.clientWidth || window.innerWidth;
      const h = canvas.parentElement.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();

    const tanH = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fit = (hw: number, hh: number) =>
      Math.max(hh / tanH(), hw / (tanH() * camera.aspect)) * 1.05;

    // Presets:
    // - home: Visual inspection
    // - feel: Spiral palpation (balanced)
    // - sectorClose: Complete close-up zoom into active breast for the 20 sectors!
    const preset = (
      name: 'home' | 'feel' | 'sectorClose',
      side: 'left' | 'right' = 'right'
    ) => {
      const targetX = side === 'right' ? 0.074 : -0.074;
      const dirX = side === 'right' ? 0.04 : -0.04;

      const P = {
        home: { t: [0, 0.26, 0], hw: 0.94, hh: 0.52, dir: [0, 0.12, 1] },
        feel: { t: [0, 0.17, 0.02], hw: 0.52, hh: 0.36, dir: [0.02, 0.14, 1] },
        // Complete close-up zoom directly into active breast
        sectorClose: { t: [targetX, 0.13, 0.05], hw: 0.2, hh: 0.12, dir: [dirX, 0.2, 1] },
      }[name];

      const tg = new THREE.Vector3(P.t[0], P.t[1], P.t[2]);
      const dirV = new THREE.Vector3(P.dir[0], P.dir[1], P.dir[2]);
      const pos = tg.clone().add(dirV.normalize().multiplyScalar(fit(P.hw, P.hh)));
      return { pos, tg };
    };

    let tween: {
      t: number;
      dur: number;
      p0: THREE.Vector3;
      t0: THREE.Vector3;
      p1: THREE.Vector3;
      t1: THREE.Vector3;
    } | null = null;

    const flyTo = (
      name: 'home' | 'feel' | 'sectorClose',
      side: 'left' | 'right' = 'right',
      dur = 1.6
    ) => {
      const p = preset(name, side);
      tween = {
        t: 0,
        dur,
        p0: camera.position.clone(),
        t0: controls.target.clone(),
        p1: p.pos,
        t1: p.tg,
      };
    };
    flyToFnRef.current = flyTo;

    controls.addEventListener('start', () => {
      tween = null;
    });

    // Lights
    const keyLight = new THREE.DirectionalLight(0xfff0e6, 2.2);
    keyLight.position.set(1.5, 2.2, 2.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbfd6ff, 0.6);
    fillLight.position.set(-2, 0.8, 1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff7aa8, 1.6);
    rimLight.position.set(-1, 1.5, -2.5);
    scene.add(rimLight);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x442233, 0.25));

    // Skin Texture
    const makeSkinTexture = () => {
      const s = 512;
      const cv = document.createElement('canvas');
      cv.width = cv.height = s;
      const g = cv.getContext('2d')!;
      g.fillStyle = '#808080';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 26000; i++) {
        const v = (90 + Math.random() * 90) | 0;
        g.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.5})`;
        const r = Math.random() * 1.6 + 0.3;
        g.beginPath();
        g.arc(Math.random() * s, Math.random() * s, r, 0, 6.283);
        g.fill();
      }
      const bump = new THREE.CanvasTexture(cv);
      bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
      bump.repeat.set(6, 8);
      return bump;
    };

    const skinMat = new THREE.MeshPhysicalMaterial({
      color: 0xe3b093,
      roughness: 0.52,
      metalness: 0,
      bumpMap: makeSkinTexture(),
      bumpScale: 0.35,
      sheen: 1,
      sheenColor: new THREE.Color(0xffc6b0),
      sheenRoughness: 0.5,
      clearcoat: 0.15,
      clearcoatRoughness: 0.6,
    });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x6b3a4d, roughness: 0.9 });

    // Torso Profile Functions
    const prof = [
      [0.0, 0.14, 0.086],
      [0.06, 0.143, 0.089],
      [0.14, 0.15, 0.092],
      [0.22, 0.164, 0.09],
      [0.27, 0.186, 0.083],
      [0.3, 0.178, 0.074],
      [0.33, 0.13, 0.064],
      [0.36, 0.08, 0.057],
      [0.4, 0.057, 0.054],
      [0.45, 0.052, 0.052],
    ];
    const Y0 = prof[0][0];
    const Y1 = prof[prof.length - 1][0];
    const N = 2.6;

    const section = (y: number) => {
      let i = 0;
      while (i < prof.length - 2 && y > prof[i + 1][0]) i++;
      const a = prof[i];
      const b = prof[i + 1];
      let t = (y - a[0]) / (b[0] - a[0]);
      t = (1 - Math.cos(PI * Math.min(Math.max(t, 0), 1))) / 2;
      return { w: a[1] + (b[1] - a[1]) * t, d: a[2] + (b[2] - a[2]) * t };
    };

    const BR = { cx: 0.074, cy: 0.128, sx: 0.062, sy: 0.068, amp: 0.056 };
    const RAD = 0.078;

    const bump = (x: number, y: number) => {
      const ax = Math.abs(x) - BR.cx;
      const ay = y - BR.cy;
      let v =
        BR.amp *
        Math.exp(-((ax * ax) / (BR.sx * BR.sx) + (ay * ay) / (BR.sy * BR.sy)));
      v *= 1 + 0.25 * Math.exp(-((ay + 0.03) * (ay + 0.03)) / 0.0016);
      return v;
    };

    const sgnPow = (v: number, p: number) => Math.sign(v) * Math.pow(Math.abs(v), p);

    const surf = (theta: number, y: number) => {
      const { w, d } = section(y);
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const x = w * sgnPow(c, 2 / N);
      let z = d * sgnPow(s, 2 / N);
      if (z > 0) z += bump(x, y) * Math.min(1, z / (d * 0.5));
      return new THREE.Vector3(x, y, z);
    };

    const frontZ = (x: number, y: number) => {
      const { w, d } = section(y);
      const xr = Math.min(Math.abs(x) / w, 0.985);
      return d * Math.pow(1 - Math.pow(xr, N), 1 / N) + bump(x, y);
    };

    const body = new THREE.Group();
    scene.add(body);

    // Torso Mesh
    const S = 120;
    const R = 110;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];

    for (let i = 0; i <= R; i++) {
      const y = Y0 + ((Y1 - Y0) * i) / R;
      for (let j = 0; j < S; j++) {
        const p = surf((j / S) * PI * 2, y);
        pos.push(p.x, p.y, p.z);
        uv.push(j / S, i / R);
      }
    }
    for (let i = 0; i < R; i++) {
      for (let j = 0; j < S; j++) {
        const a = i * S + j;
        const b = i * S + ((j + 1) % S);
        const c = (i + 1) * S + j;
        const d = (i + 1) * S + ((j + 1) % S);
        idx.push(a, c, b, b, c, d);
      }
    }

    const torsoGeo = new THREE.BufferGeometry();
    torsoGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    torsoGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    torsoGeo.setIndex(idx);
    torsoGeo.computeVertexNormals();

    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.castShadow = torso.receiveShadow = true;
    body.add(torso);

    // Caps
    for (const [row, up] of [
      [0, false],
      [R, true],
    ] as const) {
      const cp: number[] = [];
      const ci: number[] = [];
      const y = Y0 + ((Y1 - Y0) * row) / R;
      cp.push(0, y, 0);
      for (let j = 0; j < S; j++) {
        const p = surf((j / S) * PI * 2, y);
        cp.push(p.x, p.y, p.z);
      }
      for (let j = 0; j < S; j++) {
        const a = 1 + j;
        const b = 1 + ((j + 1) % S);
        up ? ci.push(0, b, a) : ci.push(0, a, b);
      }
      const cg = new THREE.BufferGeometry();
      cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
      cg.setIndex(ci);
      cg.computeVertexNormals();
      body.add(new THREE.Mesh(cg, capMat));
    }

    // Arms
    const armProfile = [
      [0.0, -0.058],
      [0.03, -0.055],
      [0.052, -0.035],
      [0.058, 0.0],
      [0.055, 0.05],
      [0.047, 0.15],
      [0.04, 0.26],
      [0.037, 0.31],
      [0.039, 0.35],
      [0.036, 0.42],
      [0.03, 0.5],
      [0.024, 0.56],
      [0.023, 0.575],
      [0.0, 0.58],
    ];

    const makeArm = (k: number) => {
      const grp = new THREE.Group();
      grp.position.set(k * 0.165, 0.272, 0);
      const lathe = new THREE.Mesh(
        new THREE.LatheGeometry(
          armProfile.map(([r, y]) => new THREE.Vector2(r, y)),
          56
        ),
        skinMat
      );
      lathe.rotation.z = (-k * PI) / 2;
      lathe.castShadow = true;
      grp.add(lathe);

      const hand = new THREE.Group();
      hand.position.set(k * 0.585, 0, 0);
      grp.add(hand);

      const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), skinMat);
      palm.scale.set(0.052, 0.014, 0.043);
      palm.position.x = k * 0.04;
      palm.castShadow = true;
      hand.add(palm);

      const fingers = [
        [0.062, -0.03, -0.34],
        [0.08, -0.013, -0.12],
        [0.086, 0.004, 0.02],
        [0.078, 0.021, 0.16],
        [0.06, 0.036, 0.34],
      ];
      fingers.forEach(([len, zo, ang], n) => {
        const f = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.0078 - n * 0.0002, len, 6, 14),
          skinMat
        );
        f.rotation.z = PI / 2;
        const fg = new THREE.Group();
        fg.add(f);
        f.position.x = len / 2;
        fg.position.set(k * 0.082, 0, zo);
        fg.rotation.y = -k * ang;
        if (k < 0) fg.rotation.y = PI + ang;
        fg.castShadow = true;
        hand.add(fg);
      });

      const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.0098, 0.045, 6, 14), skinMat);
      th.rotation.z = PI / 2;
      const tg = new THREE.Group();
      tg.add(th);
      th.position.x = 0.025;
      tg.position.set(k * 0.02, 0, 0.04);
      tg.rotation.y = k > 0 ? -0.9 : PI + 0.9;
      hand.add(tg);

      return grp;
    };

    body.add(makeArm(1), makeArm(-1));

    for (const k of [1, -1]) {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 40, 28), skinMat);
      sh.position.set(k * 0.168, 0.272, 0);
      sh.scale.set(1, 1.02, 1);
      sh.castShadow = true;
      body.add(sh);
    }

    // Floor and Grid
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3, 64),
      new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    floor.rotation.x = -PI / 2;
    floor.position.y = -0.6;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(4, 40, 0x7a3a58, 0x4a2438);
    grid.position.y = -0.6;
    if (grid.material instanceof THREE.Material) {
      grid.material.transparent = true;
      grid.material.opacity = 0.25;
    }
    scene.add(grid);

    // Overlays: Guide lines, Animated Spiral Traces, and 20 Key Zones
    const guide = new THREE.Group();
    body.add(guide);
    const trace = new THREE.Group();
    body.add(trace);
    const grid20Group = new THREE.Group();
    body.add(grid20Group);

    // Glowing Target Marker for Active Zone
    const markerGeo = new THREE.SphereGeometry(0.009, 18, 18);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xff4d94,
      transparent: true,
      opacity: 0.95,
    });
    const sectorMarkerMesh = new THREE.Mesh(markerGeo, markerMat);
    sectorMarkerMesh.visible = false;
    body.add(sectorMarkerMesh);
    sectorMarkerMeshRef.current = sectorMarkerMesh;

    const pinkMat = new THREE.MeshBasicMaterial({ color: 0xff3f86, transparent: true, opacity: 0 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const faintMat = new THREE.MeshBasicMaterial({ color: 0xff3f86, transparent: true, opacity: 0 });
    const grid20Mat = new THREE.MeshBasicMaterial({
      color: 0xff9cc2,
      transparent: true,
      opacity: 0,
    });

    const surfPt = (x: number, y: number, o = 0.0022) =>
      new THREE.Vector3(x, y, frontZ(x, y) + o);

    const tubeOnSurface = (
      pts2d: [number, number][],
      mat: THREE.Material,
      r = 0.0012,
      parent = guide
    ) => {
      const curve = new THREE.CatmullRomCurve3(pts2d.map(([x, y]) => surfPt(x, y)));
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, pts2d.length * 2, r, 6, false), mat);
      parent.add(m);
      return m;
    };

    interface TraceData {
      curve: THREE.CatmullRomCurve3;
      trailGeo: THREE.TubeGeometry;
      trailMat: THREE.MeshBasicMaterial;
      dot: THREE.Mesh;
      halo: THREE.Mesh;
      dotMat: THREE.MeshBasicMaterial;
      haloMat: THREE.MeshBasicMaterial;
      TUB: number;
    }

    const traces: TraceData[] = [];
    const traceCols = { light: 0xffa6c9, mid: 0xff3f86, firm: 0xd1114f };

    for (const k of [1, -1]) {
      const cx = k * BR.cx;
      const cy = BR.cy;
      const rad = RAD;

      // Circle & Crosshairs
      const circ: [number, number][] = [];
      for (let a = 0; a <= 64; a++) {
        const t = (a / 64) * PI * 2;
        circ.push([cx + Math.cos(t) * rad, cy + Math.sin(t) * rad]);
      }
      tubeOnSurface(circ, pinkMat, 0.0016);
      tubeOnSurface([[cx - rad, cy], [cx + rad, cy]], whiteMat, 0.001);
      tubeOnSurface([[cx, cy - rad], [cx, cy + rad]], whiteMat, 0.001);

      // Key Ring & Spoke Dividers
      const ringRad1 = rad * 0.35;
      const ringRad2 = rad * 0.7;
      const ring1: [number, number][] = [];
      const ring2: [number, number][] = [];
      for (let a = 0; a <= 48; a++) {
        const t = (a / 48) * PI * 2;
        ring1.push([cx + Math.cos(t) * ringRad1, cy + Math.sin(t) * ringRad1]);
        ring2.push([cx + Math.cos(t) * ringRad2, cy + Math.sin(t) * ringRad2]);
      }
      tubeOnSurface(ring1, grid20Mat, 0.001, grid20Group);
      tubeOnSurface(ring2, grid20Mat, 0.001, grid20Group);

      // 4 Quadrant diagonal spokes (45, 135, 225, 315 deg)
      [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4].forEach((ang) => {
        tubeOnSurface(
          [
            [cx + Math.cos(ang) * ringRad1, cy + Math.sin(ang) * ringRad1],
            [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad],
          ],
          grid20Mat,
          0.0009,
          grid20Group
        );
      });

      // Spiral guide trace
      const sp: [number, number][] = [];
      for (let a = 0; a <= 140; a++) {
        const t = a / 140;
        const ang = t * PI * 2 * 3.2;
        const r = t * rad * 0.92;
        sp.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
      }
      tubeOnSurface(sp, faintMat, 0.001);

      // Dynamic animated trail
      const curve = new THREE.CatmullRomCurve3(sp.map(([x, y]) => surfPt(x, y, 0.003)));
      const TUB = 300;
      const trailGeo = new THREE.TubeGeometry(curve, TUB, 0.0017, 6, false);
      const trailMat = new THREE.MeshBasicMaterial({
        color: traceCols.mid,
        transparent: true,
        opacity: 0,
      });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.frustumCulled = false;
      trace.add(trail);

      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
      const haloMat = new THREE.MeshBasicMaterial({
        color: traceCols.mid,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 18, 14), dotMat);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.01, 20, 14), haloMat);
      trace.add(dot, halo);
      traces.push({ curve, trailGeo, trailMat, dot, halo, dotMat, haloMat, TUB });

      // Axillary underarm tail
      const tail: [number, number][] = [];
      for (let a = 0; a <= 12; a++) {
        const t = a / 12;
        tail.push([cx + k * (rad + 0.07 * t), cy + 0.012 + 0.07 * t * t * 2.2]);
      }
      tubeOnSurface(tail, pinkMat, 0.0013);
    }

    // Camera initial position
    const H = preset('home');
    camera.position.copy(H.pos).add(new THREE.Vector3(1.2, 0.4, 1.0));
    controls.target.copy(H.tg);
    flyTo('home', 'right', 2.2);

    // Animation Loop
    let ex = 0;
    let sec20Opacity = 0;
    let passT = 0;
    let pass = 0;
    let lastLevel = -1;
    let completedPasses = 0;
    const clock = new THREE.Clock();
    const PASS = 5.2;
    const HOLD = 1.0;
    const lvlCols = [
      new THREE.Color(traceCols.light),
      new THREE.Color(traceCols.mid),
      new THREE.Color(traceCols.firm),
    ];
    const lvlScale = [1, 1.6, 2.3];

    renderer.setAnimationLoop(() => {
      if (isDisposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // Tween interpolation
      if (tween) {
        tween.t += dt;
        const e = easeIO(clamp(tween.t / tween.dur, 0, 1));
        camera.position.lerpVectors(tween.p0, tween.p1, e);
        controls.target.lerpVectors(tween.t0, tween.t1, e);
        if (tween.t >= tween.dur) tween = null;
      }
      controls.update();

      const step = currentStepRef.current;
      const isSpiral = step === 'spiral';
      const is20Sectors = step === 'sectors';
      const isExamine = isSpiral || is20Sectors;

      ex += ((isExamine ? 1 : 0) - ex) * Math.min(1, dt * 4);
      sec20Opacity += ((is20Sectors ? 1 : 0) - sec20Opacity) * Math.min(1, dt * 4);

      guide.visible = ex > 0.01;
      trace.visible = isSpiral;
      grid20Group.visible = sec20Opacity > 0.01;

      pinkMat.opacity = ex * (0.78 + 0.2 * Math.sin(t * 3));
      whiteMat.opacity = ex * (0.7 + 0.25 * Math.sin(t * 3 + 1.2));
      faintMat.opacity = ex * 0.28;
      grid20Mat.opacity = sec20Opacity * (0.65 + 0.2 * Math.sin(t * 2.5));

      // Active Target Marker Position for 20 Zones
      if (is20Sectors && sectorMarkerMesh) {
        sectorMarkerMesh.visible = true;
        const z = activeKeyZoneRef.current;
        const k = z.side === 'right' ? 1 : -1;
        const cx = k * BR.cx;
        const cy = BR.cy;
        const mx = cx + z.targetOffset[0];
        const my = cy + z.targetOffset[1];
        sectorMarkerMesh.position.copy(surfPt(mx, my, 0.005));
        sectorMarkerMesh.scale.setScalar(1 + 0.3 * Math.sin(t * 8));
      } else if (sectorMarkerMesh) {
        sectorMarkerMesh.visible = false;
      }

      // Step 2: 5 Spiral Passes & Auto-Advance to Step 3
      if (isSpiral) {
        passT += dt;
        if (passT >= PASS + HOLD) {
          passT = 0;
          pass++;
          completedPasses++;
          setSpiralPassCount((prev) => {
            const next = prev + 1;
            if (next > 5) {
              // 5 passes complete: auto move to step 3!
              handleGoTo20Zones();
              return 5;
            }
            return next;
          });
        }
        const p = clamp(passT / PASS, 0, 1);
        const currPressure = pressureModeRef.current;
        const level = currPressure === 'auto' ? pass % 3 : currPressure;

        if (level !== lastLevel) {
          lastLevel = level;
          setActivePressureLevel(level);
        }

        for (const tr of traces) {
          tr.trailGeo.setDrawRange(0, Math.floor(p * tr.TUB) * 36);
          tr.trailMat.color.copy(lvlCols[level]);
          tr.trailMat.opacity = ex;
          const pt = tr.curve.getPointAt(Math.min(p, 0.9999));
          tr.dot.position.copy(pt);
          tr.halo.position.copy(pt);
          tr.halo.scale.setScalar(lvlScale[level] * (1 + 0.18 * Math.sin(t * 8)));
          tr.haloMat.color.copy(lvlCols[level]);
          const show = passT < PASS + HOLD * 0.4 ? 1 : 0;
          tr.dotMat.opacity = ex * show;
          tr.haloMat.opacity = ex * show * (0.28 + 0.15 * level);
        }
      }

      renderer.render(scene, camera);
    });

    return () => {
      isDisposed = true;
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', resize);
      controls.dispose();
      pmrem.dispose();
      envTexture.dispose();
      skinMat.dispose();
      capMat.dispose();
      torsoGeo.dispose();
      renderer.dispose();
    };
  }, []);

  // Flow Step Transitions (Sound plays immediately with no delay)
  const handleGoToSpiral = () => {
    setCurrentStep('spiral');
    setSpiralPassCount(1);
    if (flyToFnRef.current) {
      flyToFnRef.current('feel');
    }
    if (voiceEnabled) {
      audioService.playChime('step');
      audioService.speak('Step 2: Spiral Palpation. Move in small circular overlapping paths.');
    }
  };

  const handleGoTo20Zones = () => {
    setCurrentStep('sectors');
    setZoneIndex(0);
    if (flyToFnRef.current) {
      // Zoom completely in right on the active breast!
      flyToFnRef.current('sectorClose', KEY_20_ZONES[0].side);
    }
    if (voiceEnabled) {
      audioService.playChime('step');
      audioService.speak(KEY_20_ZONES[0].shortSpeech);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'spiral') {
      setCurrentStep('explore');
      if (flyToFnRef.current) flyToFnRef.current('home');
    } else if (currentStep === 'sectors') {
      setCurrentStep('spiral');
      if (flyToFnRef.current) flyToFnRef.current('feel');
    }
  };

  // 20 Zone Progression (Auto-advancing if no report, and auto-complete after 20/20)
  const handleAutoAdvanceZone = () => {
    if (zoneIndex < KEY_20_ZONES.length - 1) {
      const nextIdx = zoneIndex + 1;
      setZoneIndex(nextIdx);
      const nextZone = KEY_20_ZONES[nextIdx];
      if (nextZone.side !== activeKeyZone.side && flyToFnRef.current) {
        flyToFnRef.current('sectorClose', nextZone.side, 1.2);
      }
    } else {
      // Reached 20/20: auto-complete!
      handleFinishSession();
    }
  };

  const handleZoneNoProblem = () => {
    if (!visitedZoneIds.includes(activeKeyZone.id)) {
      setVisitedZoneIds((prev) => [...prev, activeKeyZone.id]);
    }
    audioService.playChime('zone');
    handleAutoAdvanceZone();
  };

  const handleZoneReportFinding = () => {
    // Pause auto timer while modal is open
    isReportingRef.current = true;
    if (!visitedZoneIds.includes(activeKeyZone.id)) {
      setVisitedZoneIds((prev) => [...prev, activeKeyZone.id]);
    }

    // Get mapped BodyZone for observation
    const targetZone: BodyZone =
      ZONE_MAP[activeKeyZone.mappedZoneId] || ALL_BODY_ZONES[0];

    // Open finding modal; callback triggers on submit to move to next sector!
    onOpenFindingModal(targetZone, () => {
      isReportingRef.current = false;
      handleAutoAdvanceZone();
    });
  };

  const handlePrevZone = () => {
    if (zoneIndex > 0) {
      const prevIdx = zoneIndex - 1;
      setZoneIndex(prevIdx);
      const prevZone = KEY_20_ZONES[prevIdx];
      if (prevZone.side !== activeKeyZone.side && flyToFnRef.current) {
        flyToFnRef.current('sectorClose', prevZone.side, 1.2);
      }
    }
  };

  // Finish Routine (NO CONFETTI as requested)
  const handleFinishSession = () => {
    setIsCompleted(true);
    const record: RoutineSessionRecord = {
      id: `session-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      mode: isCameraFullscreen ? 'camera' : 'manual',
      durationSeconds: elapsedSeconds,
      coveredZoneIds: ALL_BODY_ZONES.map((z) => z.id),
      totalZonesCount: ALL_BODY_ZONES.length,
      coveragePercentage: 100,
      observationsLoggedCount: 0,
      cycleDay: currentCycleDay,
      completedRoutine: true,
    };

    onFinishRoutine(record);
    onExit();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isCurrentVisited = visitedZoneIds.includes(activeKeyZone.id);
  const progressPercent = Math.round(((zoneIndex + 1) / KEY_20_ZONES.length) * 100);

  return (
    <div className="relative w-full h-[calc(100vh-68px)] min-h-[580px] bg-[#1a0f16] text-white overflow-hidden select-none">
      {/* Hidden Motion Analysis Canvas */}
      <canvas ref={motionCanvasRef} width={80} height={60} className="hidden" />

      {/* 1. Fullscreen 3D Canvas (Active when not in Camera Mode) */}
      {!isCameraFullscreen ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing touch-none"
        />
      ) : (
        /* 1B. Fullscreen Camera View with Projected Torso Guides */
        <div className="absolute inset-0 z-10 w-full h-full bg-black overflow-hidden flex items-center justify-center">
          {cameraError ? (
            <div className="p-6 text-center space-y-2 max-w-md">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm text-amber-200">{cameraError}</p>
              <button
                onClick={() => setIsCameraFullscreen(false)}
                className="px-4 py-2 rounded-full bg-white/20 text-white font-bold text-xs"
              >
                Return to 3D View
              </button>
            </div>
          ) : (
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                setCameraTouchPoint({ x, y });
              }}
              className="relative w-full h-full cursor-crosshair"
            >
              <video
                ref={videoFeedRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Projected Torso Guide Lines on Visible Torso */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 700">
                <defs>
                  <filter id="glowPink">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Left Breast Projected Guide */}
                <ellipse cx="650" cy="380" rx="140" ry="140" fill="none" stroke="#ff4d94" strokeWidth="2.5" strokeDasharray="6 4" filter="url(#glowPink)" opacity="0.8" />
                <line x1="510" y1="380" x2="790" y2="380" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
                <line x1="650" y1="240" x2="650" y2="520" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
                <path d="M650 380 Q660 360 670 380 Q680 410 650 420 Q610 430 610 380 Q610 320 660 310 Q730 300 740 380" fill="none" stroke="#ff9cc2" strokeWidth="3" filter="url(#glowPink)" opacity="0.75" />

                {/* Right Breast Projected Guide */}
                <ellipse cx="350" cy="380" rx="140" ry="140" fill="none" stroke="#ff4d94" strokeWidth="2.5" strokeDasharray="6 4" filter="url(#glowPink)" opacity="0.8" />
                <line x1="210" y1="380" x2="490" y2="380" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
                <line x1="350" y1="240" x2="350" y2="520" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
                <path d="M350 380 Q340 360 330 380 Q320 410 350 420 Q390 430 390 380 Q390 320 340 310 Q270 300 260 380" fill="none" stroke="#ff9cc2" strokeWidth="3" filter="url(#glowPink)" opacity="0.75" />
              </svg>

              {/* User Touch Marker Pin */}
              {cameraTouchPoint && (
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-20"
                  style={{
                    left: `${cameraTouchPoint.x * 100}%`,
                    top: `${cameraTouchPoint.y * 100}%`,
                  }}
                >
                  <div className="w-10 h-10 rounded-full border-2 border-rose-500 bg-rose-500/30 animate-ping absolute -inset-2" />
                  <div className="w-7 h-7 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-xs shadow-lg">
                    📍
                  </div>
                </div>
              )}

              {/* Hand Motion Reticle */}
              {motionCoord && (
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
                  style={{
                    left: `${motionCoord.x * 100}%`,
                    top: `${motionCoord.y * 100}%`,
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border border-dashed border-emerald-400 animate-spin" />
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                  </div>
                </div>
              )}

              {/* MediaPipe 3-Finger + Torso Telemetry HUD */}
              <div className="absolute top-16 left-4 sm:left-6 z-30 max-w-xs pointer-events-none space-y-2">
                <div className="px-3.5 py-2.5 rounded-2xl bg-[#200e1a]/90 backdrop-blur-md border border-rose-400/25 shadow-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                      <Hand className="w-3.5 h-3.5" />
                      MediaPipe 3-Finger Tracking
                    </span>
                    <span className="text-[10px] font-mono font-bold text-rose-200">
                      {motionProgress}% Dwell
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-150 rounded-full"
                      style={{ width: `${motionProgress}%` }}
                    />
                  </div>
                  {mpTelemetry && (
                    <p className="text-[10px] text-stone-300">
                      Active Hand: <strong className="text-white">{mpTelemetry.activeHandLabel}</strong>
                      {mpTelemetry.activeZoneId ? ` • Zone: ${mpTelemetry.activeZoneId.replace(/_/g, ' ')}` : ''}
                    </p>
                  )}
                  {mpTelemetry?.crossBodyHint && (
                    <p className="text-[10px] text-amber-300 font-semibold pt-0.5">
                      {mpTelemetry.crossBodyHint}
                    </p>
                  )}
                </div>
              </div>

              {/* Camera Gesture & Action Bar (Touch an area + Thumbs Down marks problem) */}
              <div className="absolute bottom-6 inset-x-0 mx-auto w-fit z-30 flex items-center gap-3 pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    audioService.playChime('zone');
                    handleZoneReportFinding();
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-xl border border-rose-400 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <span className="text-base">👎</span>
                  <span>Thumbs Down: Problem Here</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    audioService.playChime('zone');
                    setCameraTouchPoint(null);
                    handleAutoAdvanceZone();
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xl border border-emerald-400 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <span className="text-base">👍</span>
                  <span>Thumbs Up: Clear Area</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Soft Ambient Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 42% 42%, transparent 45%, rgba(10,3,8,0.55) 100%)',
        }}
      />

      {/* 3. Top Navigation Bar */}
      <div className="absolute top-4 inset-x-4 sm:inset-x-6 z-30 flex items-center justify-between pointer-events-auto">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold tracking-wide text-white flex items-center gap-2">
              <svg
                width="16"
                height="20"
                viewBox="0 0 24 28"
                className="drop-shadow-[0_0_8px_rgba(255,77,148,0.7)]"
              >
                <path
                  d="M6 27C9 20 12 14 14.5 9 16.5 4.5 14.5 1.5 12 1.5 9.5 1.5 7.5 4.5 9.5 9 12 14 15 20 18 27"
                  fill="none"
                  stroke="#ff5c9a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Know Your Body</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-400/30 text-rose-300">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Right: Camera AR Mode Toggle & Finish */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCameraFullscreen(!isCameraFullscreen)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer backdrop-blur-md ${isCameraFullscreen
                ? 'bg-rose-500 border-rose-400 text-white shadow-md shadow-rose-500/30'
                : 'bg-white/10 hover:bg-white/20 border-white/15 text-stone-200'
              }`}
            title="Toggle Fullscreen Camera AR with Finger Motion Mapping"
          >
            {isCameraFullscreen ? (
              <>
                <Box className="w-3.5 h-3.5" />
                <span>Return to 3D</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5 text-rose-400" />
                <span>Camera AR Mode</span>
              </>
            )}
          </button>

          <button
            onClick={handleFinishSession}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-black shadow-md shadow-rose-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Finish</span>
          </button>
        </div>
      </div>

      {/* 4. Clinical Depth Pressure Pill (Pure indicator, no auto or selection tabs) */}
      <div className="absolute bottom-5 inset-x-0 mx-auto w-fit z-20 pointer-events-auto">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#200e1a]/90 backdrop-blur-md border border-rose-400/25 shadow-xl text-xs">
          <span
            className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0"
            style={{
              backgroundColor: getCurrentPressureInfo().color,
            }}
          />
          <span className="text-stone-300 font-semibold text-[11px]">Recommended Depth:</span>
          <span className="font-bold text-white text-[11px]">{getCurrentPressureInfo().label}</span>
        </div>
      </div>

      {/* 5. Voice Icon at Bottom Left */}
      <div className="absolute bottom-5 left-5 z-20 pointer-events-auto">
        <button
          onClick={() => {
            const next = !voiceEnabled;
            setVoiceEnabled(next);
            audioService.setMuted(!next);
          }}
          className={`p-2 rounded-full backdrop-blur-md border shadow-lg flex items-center justify-center transition-all cursor-pointer ${voiceEnabled
              ? 'bg-[#200e1a]/85 border-rose-400/40 text-rose-300 hover:bg-rose-950/80 shadow-rose-900/30'
              : 'bg-stone-900/85 border-white/15 text-stone-400 hover:text-white'
            }`}
          title={voiceEnabled ? 'Mute Voice Guide' : 'Unmute Voice Guide'}
        >
          {voiceEnabled ? (
            <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />
          ) : (
            <VolumeX className="w-4 h-4 text-stone-400" />
          )}
        </button>
      </div>

      {/* 6. Side Guidance Panel: Clean Sequential Flow */}
      <div className="absolute top-16 right-4 sm:right-6 bottom-5 w-[330px] sm:w-[370px] z-20 flex flex-col pointer-events-auto">
        <div className="h-full rounded-3xl bg-[#200e1a]/92 backdrop-blur-md border border-rose-400/20 shadow-2xl p-4 sm:p-5 flex flex-col justify-between overflow-y-auto space-y-4">
          {/* Top: Sequential Phase Title */}
          <div className="border-b border-rose-400/15 pb-2.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400 block">
              {currentStep === 'explore'
                ? 'Phase 1 of 3: Visual Inspection'
                : currentStep === 'spiral'
                  ? 'Phase 2 of 3: Spiral Palpation'
                  : 'Phase 3 of 3: Key 20-Zone Check'}
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              {currentStep === 'explore'
                ? 'Mirror Check'
                : currentStep === 'spiral'
                  ? 'Continuous Palpation'
                  : 'Targeted Zone Examination'}
            </h3>
          </div>

          {/* Body: Guidance Per Step */}
          <div className="flex-1 space-y-3.5 pt-1">
            {/* PHASE 1: EXPLORE (15-second auto advance timer) */}
            {currentStep === 'explore' && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-stone-300 text-xs leading-relaxed">
                  Look in the mirror for visible contour changes, dimpling, puckering, or nipple retraction.
                </p>

                {/* 15s Auto-advance indicator */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      Auto-moving to Step 2:
                    </span>
                    <span className="font-mono font-bold text-rose-300">{phase1Countdown}s</span>
                  </div>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-pink-400 h-full transition-all duration-1000 rounded-full"
                      style={{ width: `${((15 - phase1Countdown) / 15) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <strong className="text-rose-200 block text-xs">1. Hands on Hips</strong>
                    <p className="text-stone-300 text-[11px] leading-relaxed mt-0.5">
                      Flex your chest muscles to reveal subtle skin pulling.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <strong className="text-rose-200 block text-xs">2. Arms Raised High</strong>
                    <p className="text-stone-300 text-[11px] leading-relaxed mt-0.5">
                      Elevate tissue to expose the lower borders and crease.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGoToSpiral}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <span>Next Step: Spiral Palpation</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* PHASE 2: SPIRAL PALPATION (5 passes auto-advance) */}
            {currentStep === 'spiral' && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-stone-300 text-xs leading-relaxed">
                  Use the flat pads of your middle 3 fingers in small overlapping circular motions, moving
                  along the glowing spiral path across all breast tissue.
                </p>

                {/* 5 Passes Indicator */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-300 font-bold">Spiral Passes:</span>
                    <span className="font-mono text-rose-300 font-bold">
                      Pass {spiralPassCount} of 5
                    </span>
                  </div>
                  {/* 5 Dots Indicator */}
                  <div className="flex items-center gap-2 pt-0.5">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div
                        key={num}
                        className={`flex-1 h-2 rounded-full transition-all duration-300 ${num < spiralPassCount
                            ? 'bg-rose-500'
                            : num === spiralPassCount
                              ? 'bg-rose-400 animate-pulse'
                              : 'bg-white/10'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-stone-400 block pt-0.5">
                    Auto-advances to targeted zones after 5 passes
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handlePrevStep}
                    className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleGoTo20Zones}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Next Step: 20 Key Zones</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PHASE 3: 20 KEY ZONES (One-by-one, auto advance countdown if no report) */}
            {currentStep === 'sectors' && (
              <div className="space-y-3 animate-fade-in">
                {/* Zone Progress Header */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-medium">
                    Zone <strong className="text-white font-bold">{zoneIndex + 1}</strong> of {KEY_20_ZONES.length}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-rose-300">
                    {progressPercent}% Complete
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-gradient-to-r from-rose-500 to-pink-400 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Active Key Zone Card */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-rose-400 tracking-wider">
                      Current Target Zone
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800/40 text-rose-300">
                      Patient {activeKeyZone.side.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-white">{activeKeyZone.displayName}</h4>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Quadrant: <span className="text-rose-200 font-semibold">{activeKeyZone.quadrant}</span>
                    </p>
                  </div>

                  {/* Fast Sub-sector Sweep Banner */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px]">
                    <span className="text-stone-300 flex items-center gap-1.5">
                      <Sparkles className={`w-3.5 h-3.5 text-rose-400 ${isSubSectorSweeping ? 'animate-spin' : ''}`} />
                      {isSubSectorSweeping ? 'Sweeping all micro-sectors...' : 'All sectors systematically swept'}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">100% Covered</span>
                  </div>
                </div>

                {/* Clinical Inquiry Card with Auto-Advance Timer */}
                <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-rose-200">
                      Any problem or unusual feel here?
                    </p>
                    <span className="text-[10px] font-mono text-stone-400">
                      Next in {zoneCountdown}s
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* No Problem Button */}
                    <button
                      onClick={handleZoneNoProblem}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>No Problem (Normal Feel)</span>
                    </button>

                    {/* Report Finding Button */}
                    <button
                      onClick={handleZoneReportFinding}
                      className="w-full py-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Yes, Report a Finding</span>
                    </button>
                  </div>
                </div>

                {/* Zone Navigation */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    onClick={handlePrevZone}
                    disabled={zoneIndex === 0}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-stone-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={handleAutoAdvanceZone}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Skip to Next</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action in Side Panel */}
          <div className="pt-3 border-t border-rose-400/15">
            <button
              onClick={handleFinishSession}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-black text-xs shadow-md shadow-rose-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Complete Guided Routine</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutineSession;
