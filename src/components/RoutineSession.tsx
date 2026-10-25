import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  AnatomicalZoneId,
  ANATOMICAL_ZONES,
  ZoneCoverageState,
} from '../types/schema';
import { NormalizedHandTelemetry, OnDeviceCoverageTracker } from '../cv/coverageTracker';
import { MediaPipeVisionEngine } from '../cv/mediapipeService';
import { AvatarBodyMap } from './AvatarBodyMap';
import { ALL_BODY_ZONES, ZONE_MAP } from '../data/bodyZones';
import { BodyZone, RoutineSessionRecord } from '../types';
import { audioService } from '../services/audioService';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Volume2,
  VolumeX,
  AlertTriangle,
  Sparkles,
  Hand,
  ArrowRight,
  RotateCcw,
  Box,
  Layers,
  PlayCircle,
} from 'lucide-react';

interface RoutineSessionProps {
  currentCycleDay: number;
  onFinishRoutine: (record: RoutineSessionRecord) => void;
  onOpenFindingModal: (zone: BodyZone, onSaved?: () => void) => void;
  onExit: () => void;
  onOpenVideoDemo?: () => void;
}

interface GuidedStep {
  stepNumber: number;
  title: string;
  voicePrompt: string;
  techniqueTip: string;
  zones: AnatomicalZoneId[];
}

const GUIDED_STEPS: GuidedStep[] = [
  {
    stepNumber: 1,
    title: 'Step 1: Right Breast Quadrants & Central Area',
    voicePrompt:
      'Step 1. Using the flat finger pads of your left hand, move in small circular motions across your right upper, lower, and central breast zones.',
    techniqueTip:
      'Use the pads of your 3 middle fingers (not fingertips) with light, medium, and firm pressure.',
    zones: [
      'right_upper_outer',
      'right_upper_inner',
      'right_lower_outer',
      'right_lower_inner',
      'right_central_nipple',
    ],
  },
  {
    stepNumber: 2,
    title: 'Step 2: Right Tail of Spence & Underarm (Axilla)',
    voicePrompt:
      'Step 2. Move up along the outer edge of your right breast into the Tail of Spence and check the hollow of your right underarm.',
    techniqueTip:
      'Relax your right arm slightly at your side so the pectoral muscle is soft while checking the underarm.',
    zones: ['right_tail_of_spence', 'right_axilla'],
  },
  {
    stepNumber: 3,
    title: 'Step 3: Right Collarbone (Supraclavicular Area)',
    voicePrompt:
      'Step 3. Check just above and below your right collarbone toward the base of your neck.',
    techniqueTip:
      'Commonly skipped area—feel gently along the hollow above and below the collarbone.',
    zones: ['right_clavicle'],
  },
  {
    stepNumber: 4,
    title: 'Step 4: Left Breast Quadrants & Central Area',
    voicePrompt:
      'Step 4. Switch hands. Using the finger pads of your right hand, check your left upper, lower, and central breast zones in small circles.',
    techniqueTip:
      'Compare what you feel on the left side with the corresponding area on the right.',
    zones: [
      'left_upper_outer',
      'left_upper_inner',
      'left_lower_outer',
      'left_lower_inner',
      'left_central_nipple',
    ],
  },
  {
    stepNumber: 5,
    title: 'Step 5: Left Tail of Spence & Underarm (Axilla)',
    voicePrompt:
      'Step 5. Follow the upper outer curve into your left Tail of Spence and left underarm area.',
    techniqueTip:
      'More than half of breast tissue extends toward the upper outer quadrant and underarm.',
    zones: ['left_tail_of_spence', 'left_axilla'],
  },
  {
    stepNumber: 6,
    title: 'Step 6: Left Collarbone (Supraclavicular Area)',
    voicePrompt: 'Step 6. Finish by checking above and below your left collarbone.',
    techniqueTip:
      'Once complete, we will review any missed zones and log any observations.',
    zones: ['left_clavicle'],
  },
];

// Map the 16 LunaCheck AnatomicalZoneIds to Sally's 108-zone BodyZone IDs for seamless FindingModal & Timeline integration
const ANATOMICAL_TO_BODY_ZONE: Record<AnatomicalZoneId, string> = {
  right_upper_outer: 'R-B-R3-10',
  right_upper_inner: 'R-B-R3-2',
  right_lower_outer: 'R-B-R3-8',
  right_lower_inner: 'R-B-R3-4',
  right_central_nipple: 'R-AREOLA',
  right_tail_of_spence: 'R-AX-MID',
  right_axilla: 'R-AX-UPPER',
  right_clavicle: 'R-CLAV-LAT',
  left_upper_outer: 'L-B-R3-2',
  left_upper_inner: 'L-B-R3-10',
  left_lower_outer: 'L-B-R3-4',
  left_lower_inner: 'L-B-R3-8',
  left_central_nipple: 'L-AREOLA',
  left_tail_of_spence: 'L-AX-MID',
  left_axilla: 'L-AX-UPPER',
  left_clavicle: 'L-CLAV-LAT',
};

// Convert normalized torso coordinates (u in [-0.6, +0.6], v in [0, 1]) to 3D torso surface (x, y)
// Note: In 3D torso space, Anatomical Right (viewer's left) has x > 0 (since camera looks from +Z toward origin, wait: in Three.js camera at +Z looking at 0, +X is viewer's right, -X is viewer's left!)
function normTo3dXY(u: number, v: number): { x: number; y: number } {
  const x = u * 0.28;
  const y = 0.27 - v * 0.26;
  return { x, y };
}

function xy3dToNorm(x: number, y: number): { u: number; v: number } {
  const u = x / 0.28;
  const v = (0.27 - y) / 0.26;
  return { u, v };
}

export const RoutineSession: React.FC<RoutineSessionProps> = ({
  currentCycleDay,
  onFinishRoutine,
  onOpenFindingModal,
  onExit,
  onOpenVideoDemo,
}) => {
  const trackerRef = useRef<OnDeviceCoverageTracker>(new OnDeviceCoverageTracker());
  const visionRef = useRef<MediaPipeVisionEngine | null>(null);
  const autoPilotTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const [coverageStates, setCoverageStates] = useState<Record<AnatomicalZoneId, ZoneCoverageState>>(
    () => trackerRef.current.getCoverageStates()
  );
  const [telemetry, setTelemetry] = useState<NormalizedHandTelemetry | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isGapReview, setIsGapReview] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'camera' | 'manual_no_camera'>('camera');
  const [avatarRenderMode, setAvatarRenderMode] = useState<'3d_zones' | '2d_zones'>('3d_zones');
  const [cameraStatusMessage, setCameraStatusMessage] = useState<string>(
    'On-device MediaPipe ready (webcam feed is never displayed or saved)'
  );
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isSimulatingPalpation, setIsSimulatingPalpation] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [visualInspectionDone, setVisualInspectionDone] = useState<boolean>(true);

  // Refs for Three.js live state reading
  const threeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const coverageStatesRef = useRef(coverageStates);
  const activeStepZonesRef = useRef<AnatomicalZoneId[]>([]);
  const isGapReviewRef = useRef(isGapReview);
  const fingerPadNormRef = useRef<{ u: number; v: number } | null>(null);

  const currentStep = GUIDED_STEPS[currentStepIdx];
  const totalZones = ANATOMICAL_ZONES.length;
  const coveredZonesList = ANATOMICAL_ZONES.filter((z) => coverageStates[z.id]?.isCovered).map(
    (z) => z.id
  );
  const missedZonesList = ANATOMICAL_ZONES.filter((z) => !coverageStates[z.id]?.isCovered).map(
    (z) => z.id
  );
  const overallCoveragePercent = Math.round((coveredZonesList.length / totalZones) * 100);

  coverageStatesRef.current = coverageStates;
  activeStepZonesRef.current = isGapReview ? missedZonesList : currentStep.zones;
  isGapReviewRef.current = isGapReview;
  fingerPadNormRef.current = telemetry?.fingerPadNorm ?? null;

  // Speak step instructions when step changes
  useEffect(() => {
    if (!isGapReview && currentStep && voiceEnabled) {
      audioService.speak(currentStep.voicePrompt);
    }
  }, [currentStepIdx, isGapReview, voiceEnabled]);

  // Cleanup camera and timers on unmount
  useEffect(() => {
    return () => {
      visionRef.current?.stop();
      if (autoPilotTimerRef.current) window.clearInterval(autoPilotTimerRef.current);
      audioService.stopAll();
    };
  }, []);

  const syncStatesFromTracker = () => {
    setCoverageStates({ ...trackerRef.current.getCoverageStates() });
  };

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      visionRef.current?.stop();
      setIsCameraActive(false);
      setCameraStatusMessage('Camera stopped — drag across the chest zones or use Manual Mode.');
      return;
    }

    setCameraMode('camera');
    setCameraStatusMessage('Starting on-device MediaPipe Pose + Hand Landmarker...');
    const engine = new MediaPipeVisionEngine();
    visionRef.current = engine;
    setIsCameraActive(true);

    await engine.initializeAndStartCamera(
      trackerRef.current,
      (liveTelemetry) => {
        setTelemetry(liveTelemetry);
        syncStatesFromTracker();
      },
      (errReason) => {
        setIsCameraActive(false);
        setCameraStatusMessage(
          `Webcam unavailable (${errReason}). Touch & drag across the chest zones to map palpation!`
        );
      }
    );
  };

  // Dragging finger/cursor directly on the 2D or 3D avatar simulates real-time MediaPipe hand landmarks
  const handleAvatarPalpationMove = (u: number, v: number) => {
    const hand: 'Left' | 'Right' = u < 0 ? 'Left' : 'Right';
    const prevCoveredCount = ANATOMICAL_ZONES.filter(
      (z) => trackerRef.current.getCoverageStates()[z.id]?.isCovered
    ).length;

    const t = trackerRef.current.updateFromNormalizedPoint(u, v, hand, performance.now());
    setTelemetry(t);
    const nextStates = trackerRef.current.getCoverageStates();
    setCoverageStates({ ...nextStates });

    const nextCoveredCount = ANATOMICAL_ZONES.filter((z) => nextStates[z.id]?.isCovered).length;
    if (nextCoveredCount > prevCoveredCount) {
      audioService.playChime('zone');
    }
  };

  // One-click live demo simulator for stage presentations (leaves 1 zone missed intentionally to demonstrate the Gap Prompt!)
  const handleRunLiveDemoSimulation = () => {
    if (isSimulatingPalpation) {
      if (autoPilotTimerRef.current) window.clearInterval(autoPilotTimerRef.current);
      setIsSimulatingPalpation(false);
      return;
    }

    setIsSimulatingPalpation(true);
    setIsGapReview(false);

    // Target all zones except left_axilla so the Gap Prompt can be demonstrated live!
    const targetZones = ANATOMICAL_ZONES.filter((z) => z.id !== 'left_axilla');
    let zIdx = 0;
    let angle = 0;

    autoPilotTimerRef.current = window.setInterval(() => {
      const target = targetZones[zIdx];
      if (!target) {
        if (autoPilotTimerRef.current) window.clearInterval(autoPilotTimerRef.current);
        setIsSimulatingPalpation(false);
        setIsGapReview(true);
        if (voiceEnabled) {
          audioService.speak(
            'You have not covered the Left Underarm area yet. Would you like to go back and cover it?'
          );
        }
        return;
      }

      // Advance step indicator to match zone
      const stepForZone = GUIDED_STEPS.findIndex((s) => s.zones.includes(target.id));
      if (stepForZone >= 0) setCurrentStepIdx(stepForZone);

      // Circular micro-palpation motion around zone center
      angle += 0.55;
      const u = target.normCenter.u + Math.cos(angle) * 0.03;
      const v = target.normCenter.v + Math.sin(angle) * 0.03;
      const oppositeHand: 'Left' | 'Right' = target.side === 'right' ? 'Left' : 'Right';

      const t = trackerRef.current.updateFromNormalizedPoint(u, v, oppositeHand, performance.now());
      setTelemetry(t);
      const latest = trackerRef.current.getCoverageStates();
      setCoverageStates({ ...latest });

      if (latest[target.id]?.isCovered) {
        audioService.playChime('zone');
        zIdx++;
      }
    }, 65);
  };

  const handleZoneTap = (zoneId: AnatomicalZoneId) => {
    if (cameraMode === 'manual_no_camera' || isGapReview) {
      const isCurrentlyCovered = coverageStates[zoneId]?.isCovered ?? false;
      trackerRef.current.markZoneCoveredManually(zoneId, !isCurrentlyCovered);
      syncStatesFromTracker();
      audioService.playChime('zone');
    } else {
      trackerRef.current.markZoneCoveredManually(zoneId, true);
      syncStatesFromTracker();
      audioService.playChime('zone');
    }
  };

  const handleOpenFindingForZone = (zoneId: AnatomicalZoneId) => {
    const mappedId = ANATOMICAL_TO_BODY_ZONE[zoneId] || 'L-B-R3-2';
    const bodyZone: BodyZone = ZONE_MAP[mappedId] || ALL_BODY_ZONES[0];
    onOpenFindingModal(bodyZone);
  };

  const handleFinishOrReviewGaps = () => {
    if (!isGapReview && missedZonesList.length > 0) {
      setIsGapReview(true);
      const firstMissedLabel =
        ANATOMICAL_ZONES.find((z) => z.id === missedZonesList[0])?.label ?? 'an outer area';
      if (voiceEnabled) {
        audioService.speak(
          `You haven't covered ${firstMissedLabel}${
            missedZonesList.length > 1 ? ` and ${missedZonesList.length - 1} other zone` : ''
          }. Want to go back?`
        );
      }
      return;
    }

    const mappedCoveredIds = coveredZonesList.map((zId) => ANATOMICAL_TO_BODY_ZONE[zId]);
    const record: RoutineSessionRecord = {
      id: `session-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      mode: isCameraActive ? 'camera' : isSimulatingPalpation ? 'simulated' : 'manual',
      durationSeconds: Math.max(10, Math.round((Date.now() - startTimeRef.current) / 1000)),
      coveredZoneIds: mappedCoveredIds.length > 0 ? mappedCoveredIds : ALL_BODY_ZONES.map((z) => z.id),
      totalZonesCount: totalZones,
      coveragePercentage: overallCoveragePercent,
      observationsLoggedCount: 0,
      cycleDay: currentCycleDay,
      completedRoutine: true,
    };

    onFinishRoutine(record);
    onExit();
  };

  // Interactive 3D Zone-Mapped Torso Engine (maps the 16 LunaCheck zones onto the 3D chest + raycasts touch/drag!)
  useEffect(() => {
    if (avatarRenderMode !== '3d_zones') return;
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    let isDisposed = false;
    const PI = Math.PI;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x23111b);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 20);
    camera.position.set(0, 0.19, 0.72);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.16, 0.02);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableRotate = false; // Keep torso stable so dragging maps zones directly like LunaCheck!
    controls.enableZoom = true;
    controls.minDistance = 0.45;
    controls.maxDistance = 1.1;

    const resize = () => {
      if (isDisposed || !canvas.parentElement) return;
      const w = canvas.parentElement.clientWidth || 460;
      const h = canvas.parentElement.clientHeight || 390;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize);
    resize();

    // Lighting
    const keyLight = new THREE.DirectionalLight(0xfff0e6, 2.2);
    keyLight.position.set(1.5, 2.2, 2.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffd6e7, 0.8);
    fillLight.position.set(-2, 0.8, 1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff7aa8, 1.4);
    rimLight.position.set(0, 1.5, -2.0);
    scene.add(rimLight);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x442233, 0.35));

    // Procedural Torso Geometry
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

    const skinMat = new THREE.MeshPhysicalMaterial({
      color: 0xe8b89d,
      roughness: 0.5,
      metalness: 0,
      sheen: 1,
      sheenColor: new THREE.Color(0xffc6b0),
      sheenRoughness: 0.5,
      clearcoat: 0.15,
    });

    const body = new THREE.Group();
    scene.add(body);

    const S = 100;
    const R = 90;
    const pos: number[] = [];
    const idx: number[] = [];

    for (let i = 0; i <= R; i++) {
      const y = Y0 + ((Y1 - Y0) * i) / R;
      for (let j = 0; j < S; j++) {
        const p = surf((j / S) * PI * 2, y);
        pos.push(p.x, p.y, p.z);
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
    torsoGeo.setIndex(idx);
    torsoGeo.computeVertexNormals();

    const torsoMesh = new THREE.Mesh(torsoGeo, skinMat);
    body.add(torsoMesh);

    // Shoulders & Arms
    const armProfile = [
      [0.0, -0.058],
      [0.03, -0.055],
      [0.052, -0.035],
      [0.058, 0.0],
      [0.055, 0.05],
      [0.047, 0.15],
      [0.04, 0.26],
    ];
    for (const k of [1, -1]) {
      const grp = new THREE.Group();
      grp.position.set(k * 0.165, 0.272, 0);
      const lathe = new THREE.Mesh(
        new THREE.LatheGeometry(
          armProfile.map(([r, y]) => new THREE.Vector2(r, y)),
          36
        ),
        skinMat
      );
      lathe.rotation.z = (-k * PI) / 2;
      grp.add(lathe);
      body.add(grp);

      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 28, 20), skinMat);
      sh.position.set(k * 0.168, 0.272, 0);
      body.add(sh);
    }

    // Create 16 Interactive 3D Zone Pads conforming to the 3D chest surface!
    const zoneMeshes: Map<
      AnatomicalZoneId,
      {
        disc: THREE.Mesh;
        ring: THREE.Mesh;
        discMat: THREE.MeshBasicMaterial;
        ringMat: THREE.MeshBasicMaterial;
      }
    > = new Map();

    const surfPt = (x: number, y: number, offset = 0.0035) =>
      new THREE.Vector3(x, y, frontZ(x, y) + offset);

    // Draw breast quadrant crosshairs on 3D surface
    const guideMat = new THREE.MeshBasicMaterial({
      color: 0xffb3c6,
      transparent: true,
      opacity: 0.45,
    });
    for (const k of [1, -1]) {
      const cx = k * BR.cx;
      const cy = BR.cy;
      const rad = 0.075;
      const circPts: THREE.Vector3[] = [];
      for (let a = 0; a <= 48; a++) {
        const ang = (a / 48) * PI * 2;
        circPts.push(surfPt(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 0.002));
      }
      const curve = new THREE.CatmullRomCurve3(circPts);
      body.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.0012, 6, false), guideMat));
    }

    // Build 3D surface-conforming zone patches for all 16 ANATOMICAL_ZONES
    ANATOMICAL_ZONES.forEach((z) => {
      const { x: cx, y: cy } = normTo3dXY(z.normCenter.u, z.normCenter.v);
      const r3d = z.id.includes('central_nipple') ? 0.018 : 0.024;

      const discGeo = new THREE.CircleGeometry(r3d, 28);
      const posAttr = discGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = cx + posAttr.getX(i);
        const vy = cy + posAttr.getY(i);
        const vz = frontZ(vx, vy) + (z.id.includes('central_nipple') ? 0.0055 : 0.0038);
        posAttr.setXYZ(i, vx, vy, vz);
      }
      discGeo.computeVertexNormals();

      const discMat = new THREE.MeshBasicMaterial({
        color: 0xffe4e6,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.userData = { zoneId: z.id };
      body.add(disc);

      // Ring outline around each 3D zone
      const ringPts: THREE.Vector3[] = [];
      for (let a = 0; a <= 32; a++) {
        const ang = (a / 32) * PI * 2;
        ringPts.push(
          surfPt(
            cx + Math.cos(ang) * r3d,
            cy + Math.sin(ang) * r3d,
            z.id.includes('central_nipple') ? 0.006 : 0.0045
          )
        );
      }
      const ringCurve = new THREE.CatmullRomCurve3(ringPts);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfda4af,
        transparent: true,
        opacity: 0.75,
      });
      const ring = new THREE.Mesh(
        new THREE.TubeGeometry(ringCurve, 36, 0.0011, 6, false),
        ringMat
      );
      body.add(ring);

      zoneMeshes.set(z.id, { disc, ring, discMat, ringMat });
    });

    // Live 3D Finger-Pad Cursor Sphere
    const cursorGroup = new THREE.Group();
    const cursorCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.008, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    const cursorHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.35,
      })
    );
    cursorGroup.add(cursorCore, cursorHalo);
    cursorGroup.visible = false;
    body.add(cursorGroup);

    // Raycaster for direct touch/drag zone mapping on the 3D torso!
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerMoveOrDown = (e: PointerEvent) => {
      if (e.type === 'pointermove' && e.buttons !== 1 && e.pointerType === 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(torsoMesh);
      if (hits.length > 0) {
        const pt = hits[0].point;
        const { u, v } = xy3dToNorm(pt.x, pt.y);
        handleAvatarPalpationMove(u, v);
      }
    };

    const handlePointerClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const discList = Array.from(zoneMeshes.values()).map((zm) => zm.disc);
      const hits = raycaster.intersectObjects(discList);
      if (hits.length > 0) {
        const zId = hits[0].object.userData?.zoneId as AnatomicalZoneId | undefined;
        if (zId) handleZoneTap(zId);
      }
    };

    canvas.addEventListener('pointerdown', handlePointerMoveOrDown);
    canvas.addEventListener('pointermove', handlePointerMoveOrDown);
    canvas.addEventListener('click', handlePointerClick);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      if (isDisposed) return;
      const t = clock.getElapsedTime();
      controls.update();

      const states = coverageStatesRef.current;
      const activeZones = activeStepZonesRef.current;
      const gapMode = isGapReviewRef.current;

      // Update each of the 16 3D zones based on live coverage state
      zoneMeshes.forEach((zm, zId) => {
        const st = states[zId];
        const ratio = st?.coverageRatio ?? 0;
        const isCovered = st?.isCovered ?? false;
        const isStepActive = activeZones.includes(zId);

        if (gapMode) {
          if (!isCovered) {
            zm.discMat.color.setHex(0xf59e0b); // Amber missed zone
            zm.discMat.opacity = 0.65 + 0.2 * Math.sin(t * 5);
            zm.ringMat.color.setHex(0xfbbf24);
            zm.ringMat.opacity = 0.95;
          } else {
            zm.discMat.color.setHex(0x10b981);
            zm.discMat.opacity = 0.45;
            zm.ringMat.color.setHex(0x34d399);
            zm.ringMat.opacity = 0.7;
          }
        } else if (isCovered) {
          zm.discMat.color.setHex(0xe11d48); // Deep Rose Covered
          zm.discMat.opacity = 0.75;
          zm.ringMat.color.setHex(0xffffff);
          zm.ringMat.opacity = 0.95;
        } else if (ratio > 0.05) {
          zm.discMat.color.setHex(0xfb7185); // Filling progress
          zm.discMat.opacity = 0.35 + ratio * 0.45;
          zm.ringMat.color.setHex(0xffe4e6);
          zm.ringMat.opacity = 0.9;
        } else if (isStepActive) {
          zm.discMat.color.setHex(0xffb3c6); // Highlighted active step zone
          zm.discMat.opacity = 0.35 + 0.15 * Math.sin(t * 4);
          zm.ringMat.color.setHex(0xff4d94);
          zm.ringMat.opacity = 0.9;
        } else {
          zm.discMat.color.setHex(0xfff1f2);
          zm.discMat.opacity = 0.14;
          zm.ringMat.color.setHex(0xfda4af);
          zm.ringMat.opacity = 0.38;
        }
      });

      // Update live 3D finger-pad cursor
      const fp = fingerPadNormRef.current;
      if (fp) {
        const { x, y } = normTo3dXY(fp.u, fp.v);
        cursorGroup.position.copy(surfPt(x, y, 0.008));
        cursorGroup.visible = true;
        cursorHalo.scale.setScalar(1 + 0.25 * Math.sin(t * 8));
      } else {
        cursorGroup.visible = false;
      }

      renderer.render(scene, camera);
    });

    return () => {
      isDisposed = true;
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', handlePointerMoveOrDown);
      canvas.removeEventListener('pointermove', handlePointerMoveOrDown);
      canvas.removeEventListener('click', handlePointerClick);
      controls.dispose();
      pmrem.dispose();
      envTexture.dispose();
      torsoGeo.dispose();
      skinMat.dispose();
      renderer.dispose();
    };
  }, [avatarRenderMode]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Zone-Mapped Torso (3D Model + 2D LunaCheck Map) & On-Device CV Telemetry */}
        <div className="lg:col-span-7 glass-panel rounded-3xl border border-rose-200 shadow-sm p-5">
          {/* Privacy & Mode Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-rose-100">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Avatar-Only Privacy View (Zero Video Saved)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Toggle between 3D Zone-Mapped Model and 2D LunaCheck SVG Zone Map */}
              <button
                type="button"
                onClick={() =>
                  setAvatarRenderMode((m) => (m === '3d_zones' ? '2d_zones' : '3d_zones'))
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 transition cursor-pointer"
                title="Switch between 3D Zone-Mapped Torso and 2D Zone Map"
              >
                {avatarRenderMode === '3d_zones' ? (
                  <>
                    <Layers className="w-3.5 h-3.5 text-rose-600" />
                    <span>2D Zone Map</span>
                  </>
                ) : (
                  <>
                    <Box className="w-3.5 h-3.5 text-rose-600" />
                    <span>3D Zone Model</span>
                  </>
                )}
              </button>

              {onOpenVideoDemo && (
                <button
                  type="button"
                  onClick={onOpenVideoDemo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50/70 hover:bg-rose-100 text-rose-800 border border-rose-200/70 transition cursor-pointer"
                  title="Watch Routine Video Guide"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Video Guide</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const next = !voiceEnabled;
                  setVoiceEnabled(next);
                  audioService.setMuted(!next);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50/70 hover:bg-rose-100 text-rose-800 border border-rose-200/70 transition cursor-pointer"
                title="Toggle Voice Guidance"
              >
                {voiceEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                )}
                {voiceEnabled ? 'Voice On' : 'Muted'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (cameraMode === 'camera') {
                    visionRef.current?.stop();
                    setIsCameraActive(false);
                    setCameraMode('manual_no_camera');
                  } else {
                    setCameraMode('camera');
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  cameraMode === 'manual_no_camera'
                    ? 'bg-rose-900 text-white'
                    : 'bg-rose-50/70 hover:bg-rose-100 text-rose-800 border border-rose-200/70'
                }`}
              >
                {cameraMode === 'manual_no_camera' ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" /> No-Camera Manual Mode
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 text-rose-600" /> Switch to No-Camera Mode
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Camera / Simulator Trigger Bar (LunaCheck Workflow) */}
          {cameraMode === 'camera' && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="text-xs text-rose-900">
                <p className="font-bold text-rose-950">{cameraStatusMessage}</p>
                <p className="text-[11px] text-rose-800/70 mt-0.5">
                  Tip: Prop phone at chest height, or{' '}
                  <strong>click &amp; drag in small circles across any chest zone</strong> (or run
                  Auto-Sim) to map hand dwell coverage.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-xs transition cursor-pointer ${
                    isCameraActive
                      ? 'bg-rose-700 hover:bg-rose-800 text-white'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  {isCameraActive ? 'Stop Webcam' : 'Start Webcam Tracking'}
                </button>

                <button
                  type="button"
                  onClick={handleRunLiveDemoSimulation}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    isSimulatingPalpation
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-white hover:bg-rose-50 border-rose-300 text-rose-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  {isSimulatingPalpation ? 'Pause Demo Sim' : 'Simulate Clothed Demo'}
                </button>
              </div>
            </div>
          )}

          {/* Interactive Torso Zone Mapper: 3D Zone-Mapped Model OR 2D LunaCheck SVG Body Map */}
          {avatarRenderMode === '3d_zones' ? (
            <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-rose-200 bg-[#23111b] shadow-inner">
              <canvas
                ref={threeCanvasRef}
                className="w-full h-full block cursor-crosshair touch-none"
              />
              {/* Orientation & Instruction Overlay on 3D Zone Model */}
              <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between pointer-events-none text-[10px] font-bold uppercase tracking-wider text-rose-200/90">
                <span className="px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-xs border border-rose-400/30">
                  Anatomical Right (Viewer Left)
                </span>
                <span className="px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-xs border border-rose-400/30">
                  Anatomical Left (Viewer Right)
                </span>
              </div>
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none text-[11px] text-rose-100/90 bg-black/50 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-rose-400/20">
                <span>
                  <strong>16-Zone 3D Chest Map:</strong> Click &amp; drag in circles on any zone (or
                  use Webcam) to map coverage
                </span>
                <span className="font-mono font-extrabold text-rose-300">
                  {overallCoveragePercent}% Mapped
                </span>
              </div>
            </div>
          ) : (
            <AvatarBodyMap
              mode={isGapReview ? 'gap_review' : 'coverage'}
              coverageStates={coverageStates}
              activeStepZones={isGapReview ? missedZonesList : currentStep.zones}
              fingerPadNorm={telemetry?.fingerPadNorm}
              onZoneSelect={handleZoneTap}
              onSimulatedPalpationMove={handleAvatarPalpationMove}
            />
          )}

          {/* Cross-body hand technique hint */}
          {telemetry?.crossBodyHint && (
            <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2 font-medium">
              <Hand className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{telemetry.crossBodyHint}</span>
            </div>
          )}

          {/* Honest Clinical Limits Footer */}
          <div className="mt-4 pt-3 border-t border-rose-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-rose-800/70">
            <span>
              <strong>Honest Technical Scope:</strong> Measures zone-level hand coverage
              only—cannot measure pressure, depth, or detect tissue changes.
            </span>
            <button
              type="button"
              onClick={() => {
                trackerRef.current.resetCoverage();
                syncStatesFromTracker();
                setIsGapReview(false);
                setCurrentStepIdx(0);
              }}
              className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-950 font-bold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset Map
            </button>
          </div>
        </div>

        {/* Right Column: Step-by-Step Voice Guide, Gap Prompts & Finding Logger Trigger */}
        <div className="lg:col-span-5 space-y-4">
          {/* Progress Summary Card */}
          <div className="glass-panel rounded-3xl border border-rose-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">
                Zone Coverage Progress
              </span>
              <span className="text-sm font-black text-rose-950">
                {coveredZonesList.length} / {totalZones} Zones ({overallCoveragePercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-rose-100/80 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300 rounded-full"
                style={{ width: `${overallCoveragePercent}%` }}
              />
            </div>

            {/* Visual Inspection Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50/50 border border-rose-200/80 cursor-pointer text-xs text-rose-900">
              <input
                type="checkbox"
                checked={visualInspectionDone}
                onChange={(e) => setVisualInspectionDone(e.target.checked)}
                className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
              />
              <span>
                <strong>Visual Mirror Check Included:</strong> Checked for symmetry, skin dimpling,
                redness, or nipple changes with arms at sides and raised.
              </span>
            </label>
          </div>

          {/* Active Guided Step OR Gap Prompt Card */}
          {!isGapReview ? (
            <div className="glass-panel rounded-3xl border border-rose-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-200">
                  Step {currentStep.stepNumber} of {GUIDED_STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={() => audioService.speak(currentStep.voicePrompt)}
                  className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  Replay Voice Prompt
                </button>
              </div>

              <h3 className="text-base font-extrabold text-rose-950 mb-1.5">
                {currentStep.title}
              </h3>
              <p className="text-xs sm:text-sm text-rose-900/80 leading-relaxed mb-3 font-medium">
                {currentStep.voicePrompt}
              </p>

              <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-xs text-rose-900 mb-4">
                <strong>Technique Note:</strong> {currentStep.techniqueTip}
              </div>

              {/* Zones in this step */}
              <div className="space-y-1.5 mb-5">
                <p className="text-[11px] font-extrabold text-rose-800/60 uppercase tracking-wider">
                  Zones in this step (tap to mark or dwell with hand):
                </p>
                {currentStep.zones.map((zId) => {
                  const zMeta = ANATOMICAL_ZONES.find((z) => z.id === zId)!;
                  const state = coverageStates[zId];
                  return (
                    <button
                      key={zId}
                      type="button"
                      onClick={() => handleZoneTap(zId)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        state?.isCovered
                          ? 'bg-rose-500/15 border-rose-400 text-rose-950'
                          : 'bg-white/90 border-rose-200/80 text-rose-900 hover:bg-rose-50/60'
                      }`}
                    >
                      <span>{zMeta.label}</span>
                      <span
                        className={`font-extrabold ${
                          state?.isCovered ? 'text-rose-600' : 'text-rose-800/70'
                        }`}
                      >
                        {state?.isCovered
                          ? 'Covered ✓'
                          : `${Math.round((state?.coverageRatio ?? 0) * 100)}%`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Step Navigation */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={currentStepIdx === 0}
                  onClick={() => setCurrentStepIdx((i) => Math.max(0, i - 1))}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-800 disabled:opacity-40 hover:bg-rose-50 cursor-pointer"
                >
                  Previous Step
                </button>

                {currentStepIdx < GUIDED_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentStepIdx((i) => Math.min(GUIDED_STEPS.length - 1, i + 1))
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-extrabold shadow-sm cursor-pointer"
                  >
                    Next Step <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishOrReviewGaps}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-extrabold shadow-sm cursor-pointer"
                  >
                    Review Coverage &amp; Finish <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Gap Prompt Card */
            <div className="bg-amber-50/95 rounded-3xl border-2 border-amber-300 shadow-sm p-5">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-extrabold text-amber-950">
                    Gap Prompt: Zones You May Have Missed
                  </h3>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed font-medium">
                    {missedZonesList.length > 0
                      ? `You haven't covered ${missedZonesList.length} zone${
                          missedZonesList.length === 1 ? '' : 's'
                        } yet (highlighted in amber on the body map). Outer quadrants, the underarm (axilla), and collarbone areas are commonly skipped. Want to go back or mark them covered?`
                      : 'All 16 anatomical zones (both breasts, underarms, and collarbones) have been covered!'}
                  </p>
                </div>
              </div>

              {missedZonesList.length > 0 && (
                <div className="space-y-1.5 mb-4 max-h-44 overflow-y-auto pr-1">
                  {missedZonesList.map((zId) => {
                    const zMeta = ANATOMICAL_ZONES.find((z) => z.id === zId)!;
                    return (
                      <div
                        key={zId}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-amber-200 text-xs"
                      >
                        <span className="font-bold text-rose-950">{zMeta.label}</span>
                        <button
                          type="button"
                          onClick={() => handleZoneTap(zId)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer"
                        >
                          Mark Covered
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGapReview(false)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-950 hover:bg-amber-100 cursor-pointer"
                >
                  Go Back to Guided Steps
                </button>
                <button
                  type="button"
                  onClick={handleFinishOrReviewGaps}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  Save Check Session ({overallCoveragePercent}% Coverage)
                </button>
              </div>
            </div>
          )}

          {/* Quick Action: Felt Something Unusual? Log a Finding Immediately */}
          <div className="glass-panel-pink rounded-3xl p-5 border border-rose-200 shadow-sm">
            <h4 className="text-sm font-extrabold text-rose-950 mb-1">
              Noticed Something Unusual During Your Check?
            </h4>
            <p className="text-xs text-rose-900/75 mb-3 leading-relaxed font-medium">
              Tap below to record a lump, thickening, focal tenderness, skin change, or nipple
              change in the current zone tagged with today&apos;s cycle day (Day {currentCycleDay}).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleOpenFindingForZone(currentStep.zones[0])}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 text-white font-extrabold text-xs shadow-sm transition cursor-pointer"
              >
                + Log Observation in Current Zone
              </button>
              <button
                type="button"
                onClick={handleFinishOrReviewGaps}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-900 font-bold text-xs border border-rose-200 transition cursor-pointer"
              >
                Check Gaps &amp; Complete Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutineSession;
