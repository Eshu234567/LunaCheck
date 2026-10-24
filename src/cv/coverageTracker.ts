import {
  AnatomicalZoneId,
  ANATOMICAL_ZONES,
  ZoneCoverageState,
} from '../types/schema';

export interface NormalizedHandTelemetry {
  isTrackingPose: boolean;
  isTrackingHand: boolean;
  activeHandLabel: 'Left' | 'Right' | 'None';
  // Normalized torso coordinates: u in [-0.65, +0.65], v in [0.0, 1.0]
  fingerPadNorm: { u: number; v: number } | null;
  activeZoneId: AnatomicalZoneId | null;
  isMovingPalpation: boolean;
  crossBodyHint: string | null;
  postureHint: string;
}

const TARGET_DWELL_MS = 1600; // 1.6s of active palpation per zone
const EMA_ALPHA = 0.38;

export class OnDeviceCoverageTracker {
  private coverageMap: Map<AnatomicalZoneId, ZoneCoverageState> = new Map();
  private smoothedTorso: {
    shoulderMidX: number;
    shoulderMidY: number;
    shoulderWidth: number;
    torsoHeight: number;
    lastGoodTimestamp: number;
  } | null = null;

  private smoothedFinger: { u: number; v: number; timestamp: number } | null = null;
  private lastFrameTimestamp: number = performance.now();

  constructor() {
    this.resetCoverage();
  }

  public resetCoverage() {
    this.coverageMap.clear();
    for (const z of ANATOMICAL_ZONES) {
      this.coverageMap.set(z.id, {
        zoneId: z.id,
        dwellMs: 0,
        targetMs: TARGET_DWELL_MS,
        coverageRatio: 0,
        isCovered: false,
      });
    }
    this.smoothedFinger = null;
  }

  public getCoverageStates(): Record<AnatomicalZoneId, ZoneCoverageState> {
    const out = {} as Record<AnatomicalZoneId, ZoneCoverageState>;
    for (const z of ANATOMICAL_ZONES) {
      out[z.id] = this.coverageMap.get(z.id)!;
    }
    return out;
  }

  public markZoneCoveredManually(zoneId: AnatomicalZoneId, covered: boolean = true) {
    const current = this.coverageMap.get(zoneId);
    if (!current) return;
    current.dwellMs = covered ? current.targetMs : 0;
    current.coverageRatio = covered ? 1 : 0;
    current.isCovered = covered;
    current.lastTouchedAt = Date.now();
  }

  /**
   * Processes a frame of MediaPipe Pose + Hand landmarks, or simulated normalized coordinates
   */
  public updateFromNormalizedPoint(
    u: number,
    v: number,
    handLabel: 'Left' | 'Right' = 'Left',
    nowMs: number = performance.now()
  ): NormalizedHandTelemetry {
    const dt = Math.min(120, Math.max(8, nowMs - this.lastFrameTimestamp));
    this.lastFrameTimestamp = nowMs;

    let speed = 0.05; // default healthy palpation movement
    if (this.smoothedFinger) {
      const du = u - this.smoothedFinger.u;
      const dv = v - this.smoothedFinger.v;
      const dist = Math.hypot(du, dv);
      speed = dist / (dt / 1000);
      this.smoothedFinger = {
        u: this.smoothedFinger.u * (1 - EMA_ALPHA) + u * EMA_ALPHA,
        v: this.smoothedFinger.v * (1 - EMA_ALPHA) + v * EMA_ALPHA,
        timestamp: nowMs,
      };
    } else {
      this.smoothedFinger = { u, v, timestamp: nowMs };
    }

    const su = this.smoothedFinger.u;
    const sv = this.smoothedFinger.v;

    // Find closest zone within radius
    let matchedZone: AnatomicalZoneId | null = null;
    let bestDist = Infinity;

    for (const zone of ANATOMICAL_ZONES) {
      const d = Math.hypot(su - zone.normCenter.u, sv - zone.normCenter.v);
      if (d <= zone.normCenter.radius && d < bestDist) {
        bestDist = d;
        matchedZone = zone.id;
      }
    }

    // Palpation movement check: neither completely frozen (<0.002) nor wildly flying across screen (>1.8)
    const isMovingPalpation = speed >= 0.001 && speed <= 1.8;

    if (matchedZone && isMovingPalpation) {
      const state = this.coverageMap.get(matchedZone)!;
      state.dwellMs = Math.min(state.targetMs, state.dwellMs + dt);
      state.coverageRatio = Math.min(1, state.dwellMs / state.targetMs);
      state.isCovered = state.coverageRatio >= 1;
      state.lastTouchedAt = Date.now();
    }

    // Cross-body hand tip: For right side (u < 0), clinical technique recommends left hand, and vice versa
    let crossBodyHint: string | null = null;
    if (matchedZone) {
      const isRightSide = matchedZone.startsWith('right_');
      if (isRightSide && handLabel === 'Right') {
        crossBodyHint = 'Tip: Try using the finger pads of your opposite (Left) hand to check your Right side.';
      } else if (!isRightSide && handLabel === 'Left') {
        crossBodyHint = 'Tip: Try using the finger pads of your opposite (Right) hand to check your Left side.';
      }
    }

    return {
      isTrackingPose: true,
      isTrackingHand: true,
      activeHandLabel: handLabel,
      fingerPadNorm: { u: su, v: sv },
      activeZoneId: matchedZone,
      isMovingPalpation,
      crossBodyHint,
      postureHint: 'Torso frame locked on-device (no video rendered)',
    };
  }

  /**
   * Processes raw MediaPipe PoseLandmarker and HandLandmarker results
   */
  public processMediaPipeResults(
    poseLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }> | undefined,
    handLandmarksList: Array<Array<{ x: number; y: number; z: number }>> | undefined,
    handednessList: Array<Array<{ categoryName: string }>> | undefined,
    nowMs: number = performance.now()
  ): NormalizedHandTelemetry {
    // 1. Update or hold-last-good torso frame
    if (poseLandmarks && poseLandmarks.length >= 25) {
      const lShoulder = poseLandmarks[11];
      const rShoulder = poseLandmarks[12];
      const lHip = poseLandmarks[23];
      const rHip = poseLandmarks[24];

      const vis11 = lShoulder.visibility ?? 0.8;
      const vis12 = rShoulder.visibility ?? 0.8;

      if (vis11 > 0.45 && vis12 > 0.45) {
        const midX = (lShoulder.x + rShoulder.x) / 2;
        const midY = (lShoulder.y + rShoulder.y) / 2;
        const width = Math.max(0.12, Math.hypot(lShoulder.x - rShoulder.x, lShoulder.y - rShoulder.y));
        const hipMidY =
          lHip && rHip ? (lHip.y + rHip.y) / 2 : midY + width * 1.35;
        const height = Math.max(0.18, Math.abs(hipMidY - midY));

        if (!this.smoothedTorso) {
          this.smoothedTorso = {
            shoulderMidX: midX,
            shoulderMidY: midY,
            shoulderWidth: width,
            torsoHeight: height,
            lastGoodTimestamp: nowMs,
          };
        } else {
          this.smoothedTorso = {
            shoulderMidX: this.smoothedTorso.shoulderMidX * (1 - EMA_ALPHA) + midX * EMA_ALPHA,
            shoulderMidY: this.smoothedTorso.shoulderMidY * (1 - EMA_ALPHA) + midY * EMA_ALPHA,
            shoulderWidth: this.smoothedTorso.shoulderWidth * (1 - EMA_ALPHA) + width * EMA_ALPHA,
            torsoHeight: this.smoothedTorso.torsoHeight * (1 - EMA_ALPHA) + height * EMA_ALPHA,
            lastGoodTimestamp: nowMs,
          };
        }
      }
    }

    // Check if torso anchor is still valid (hold-last-good up to 2500ms during arm occlusion)
    const hasValidTorso =
      this.smoothedTorso !== null && nowMs - this.smoothedTorso.lastGoodTimestamp <= 2500;

    if (!hasValidTorso || !this.smoothedTorso) {
      return {
        isTrackingPose: false,
        isTrackingHand: false,
        activeHandLabel: 'None',
        fingerPadNorm: null,
        activeZoneId: null,
        isMovingPalpation: false,
        crossBodyHint: null,
        postureHint: 'Position shoulders in frame at chest height (camera feed stays hidden)',
      };
    }

    if (!handLandmarksList || handLandmarksList.length === 0) {
      return {
        isTrackingPose: true,
        isTrackingHand: false,
        activeHandLabel: 'None',
        fingerPadNorm: null,
        activeZoneId: null,
        isMovingPalpation: false,
        crossBodyHint: null,
        postureHint: 'Torso aligned — bring your 3 middle finger pads to the highlighted zone',
      };
    }

    // Use the first detected hand and compute centroid of index (8), middle (12), and ring (16) fingertips
    const hand = handLandmarksList[0];
    const indexTip = hand[8];
    const middleTip = hand[12];
    const ringTip = hand[16];

    const padX = (indexTip.x + middleTip.x + ringTip.x) / 3;
    const padY = (indexTip.y + middleTip.y + ringTip.y) / 3;

    // Transform into normalized torso coordinates (u, v)
    // Note: Webcam stream is mirrored horizontally for natural avatar alignment:
    // In raw webcam coordinates, user's anatomical right shoulder (12) has smaller X than left shoulder (11).
    const u = (padX - this.smoothedTorso.shoulderMidX) / (this.smoothedTorso.shoulderWidth * 1.15);
    const v = (padY - this.smoothedTorso.shoulderMidY) / (this.smoothedTorso.torsoHeight * 0.95) + 0.18;

    const rawHandLabel = handednessList?.[0]?.[0]?.categoryName;
    const handLabel: 'Left' | 'Right' = rawHandLabel === 'Right' ? 'Right' : 'Left';

    return this.updateFromNormalizedPoint(u, v, handLabel, nowMs);
  }
}
