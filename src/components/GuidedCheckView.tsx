import React, { useEffect, useRef, useState } from 'react';
import {
  AnatomicalZoneId,
  ANATOMICAL_ZONES,
  ExamSessionRecord,
  UserProfile,
  ZoneCoverageState,
} from '../types/schema';
import { NormalizedHandTelemetry, OnDeviceCoverageTracker } from '../cv/coverageTracker';
import { MediaPipeVisionEngine } from '../cv/mediapipeService';
import { AvatarBodyMap } from './AvatarBodyMap';
import { voiceService } from '../services/voiceService';
import { evaluateCycleAtDate } from '../services/cycleEngine';
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
} from 'lucide-react';

interface GuidedCheckViewProps {
  profile: UserProfile;
  todayISO: string;
  onCompleteExam: (exam: ExamSessionRecord) => void;
  onOpenFindingLogger: (preselectedZone?: AnatomicalZoneId, examId?: string) => void;
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
    techniqueTip: 'Use the pads of your 3 middle fingers (not fingertips) with light, medium, and firm pressure.',
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
    techniqueTip: 'Relax your right arm slightly at your side so the pectoral muscle is soft while checking the underarm.',
    zones: ['right_tail_of_spence', 'right_axilla'],
  },
  {
    stepNumber: 3,
    title: 'Step 3: Right Collarbone (Supraclavicular Area)',
    voicePrompt:
      'Step 3. Check just above and below your right collarbone toward the base of your neck.',
    techniqueTip: 'Commonly skipped area—feel gently along the hollow above and below the collarbone.',
    zones: ['right_clavicle'],
  },
  {
    stepNumber: 4,
    title: 'Step 4: Left Breast Quadrants & Central Area',
    voicePrompt:
      'Step 4. Switch hands. Using the finger pads of your right hand, check your left upper, lower, and central breast zones in small circles.',
    techniqueTip: 'Compare what you feel on the left side with the corresponding area on the right.',
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
    techniqueTip: 'More than half of breast tissue extends toward the upper outer quadrant and underarm.',
    zones: ['left_tail_of_spence', 'left_axilla'],
  },
  {
    stepNumber: 6,
    title: 'Step 6: Left Collarbone (Supraclavicular Area)',
    voicePrompt:
      'Step 6. Finish by checking above and below your left collarbone.',
    techniqueTip: 'Once complete, we will review any missed zones and log any observations.',
    zones: ['left_clavicle'],
  },
];

export const GuidedCheckView: React.FC<GuidedCheckViewProps> = ({
  profile,
  todayISO,
  onCompleteExam,
  onOpenFindingLogger,
}) => {
  const trackerRef = useRef<OnDeviceCoverageTracker>(new OnDeviceCoverageTracker());
  const visionRef = useRef<MediaPipeVisionEngine | null>(null);
  const autoPilotTimerRef = useRef<number | null>(null);

  const [coverageStates, setCoverageStates] = useState<Record<AnatomicalZoneId, ZoneCoverageState>>(
    () => trackerRef.current.getCoverageStates()
  );
  const [telemetry, setTelemetry] = useState<NormalizedHandTelemetry | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isGapReview, setIsGapReview] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'camera' | 'manual_no_camera'>('camera');
  const [cameraStatusMessage, setCameraStatusMessage] = useState<string>(
    'On-device MediaPipe ready (webcam feed is never displayed or saved)'
  );
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isSimulatingPalpation, setIsSimulatingPalpation] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [visualInspectionDone, setVisualInspectionDone] = useState<boolean>(true);
  const [currentExamId] = useState<string>(() => `exam-${Date.now()}`);

  const currentStep = GUIDED_STEPS[currentStepIdx];
  const cycleInfo = evaluateCycleAtDate(profile, todayISO);

  // Speak step instructions when step changes
  useEffect(() => {
    if (!isGapReview && currentStep) {
      voiceService.speak(currentStep.voicePrompt, true);
    }
  }, [currentStepIdx, isGapReview]);

  // Cleanup camera and timers on unmount
  useEffect(() => {
    return () => {
      visionRef.current?.stop();
      if (autoPilotTimerRef.current) window.clearInterval(autoPilotTimerRef.current);
      voiceService.stop();
    };
  }, []);

  const syncStatesFromTracker = () => {
    setCoverageStates({ ...trackerRef.current.getCoverageStates() });
  };

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      visionRef.current?.stop();
      setIsCameraActive(false);
      setCameraStatusMessage('Camera stopped — you can drag across the avatar or use Manual Mode.');
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
          `Webcam unavailable in this environment (${errReason}). Interactive Avatar Palpation Simulator enabled!`
        );
      }
    );
  };

  // Dragging finger/cursor directly on the abstract SVG avatar simulates real-time MediaPipe hand landmarks
  const handleAvatarPalpationMove = (u: number, v: number) => {
    const hand: 'Left' | 'Right' = u < 0 ? 'Left' : 'Right';
    const t = trackerRef.current.updateFromNormalizedPoint(u, v, hand, performance.now());
    setTelemetry(t);
    syncStatesFromTracker();
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

    // Target zones in current step (or all zones except left_axilla so the Gap Prompt can be demonstrated live!)
    const targetZones = ANATOMICAL_ZONES.filter((z) => z.id !== 'left_axilla');
    let zIdx = 0;
    let angle = 0;

    autoPilotTimerRef.current = window.setInterval(() => {
      const target = targetZones[zIdx];
      if (!target) {
        if (autoPilotTimerRef.current) window.clearInterval(autoPilotTimerRef.current);
        setIsSimulatingPalpation(false);
        setIsGapReview(true);
        voiceService.speak(
          'You have not covered the Left Underarm area yet. Would you like to go back and cover it?'
        );
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
        zIdx++;
      }
    }, 65);
  };

  const handleZoneTap = (zoneId: AnatomicalZoneId) => {
    if (cameraMode === 'manual_no_camera' || isGapReview) {
      const isCurrentlyCovered = coverageStates[zoneId]?.isCovered ?? false;
      trackerRef.current.markZoneCoveredManually(zoneId, !isCurrentlyCovered);
      syncStatesFromTracker();
    } else {
      // In camera mode, tapping a zone lets you either log a finding or fill dwell progress
      trackerRef.current.markZoneCoveredManually(zoneId, true);
      syncStatesFromTracker();
    }
  };

  const totalZones = ANATOMICAL_ZONES.length;
  const coveredZonesList = ANATOMICAL_ZONES.filter((z) => coverageStates[z.id]?.isCovered).map(
    (z) => z.id
  );
  const missedZonesList = ANATOMICAL_ZONES.filter((z) => !coverageStates[z.id]?.isCovered).map(
    (z) => z.id
  );
  const overallCoveragePercent = Math.round((coveredZonesList.length / totalZones) * 100);

  const handleFinishOrReviewGaps = () => {
    if (!isGapReview && missedZonesList.length > 0) {
      setIsGapReview(true);
      const firstMissedLabel =
        ANATOMICAL_ZONES.find((z) => z.id === missedZonesList[0])?.label ?? 'an outer area';
      voiceService.speak(
        `You haven't covered ${firstMissedLabel}${
          missedZonesList.length > 1 ? ` and ${missedZonesList.length - 1} other zone` : ''
        }. Want to go back?`
      );
      return;
    }

    const record: ExamSessionRecord = {
      id: currentExamId,
      dateISO: todayISO,
      mode: cameraMode === 'camera' ? 'camera_assisted' : 'manual_guided',
      cycleDay: cycleInfo.currentCycleDay,
      cyclePhase: cycleInfo.phase,
      coveredZones: coveredZonesList,
      missedZones: missedZonesList,
      coveragePercent: overallCoveragePercent,
      visualInspectionCompleted: visualInspectionDone,
    };
    onCompleteExam(record);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Interactive Abstract Avatar + On-Device CV Telemetry */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        {/* Privacy & Mode Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
              Avatar-Only Privacy View (Zero Video Saved)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                voiceService.setEnabled(next);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Toggle Voice Guidance"
            >
              {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-teal-700" /> : <VolumeX className="w-3.5 h-3.5" />}
              {voiceEnabled ? 'Voice On' : 'Voice Muted'}
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                cameraMode === 'manual_no_camera'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cameraMode === 'manual_no_camera' ? (
                <>
                  <CameraOff className="w-3.5 h-3.5" /> No-Camera Manual Mode Active
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-teal-700" /> Switch to No-Camera Mode
                </>
              )}
            </button>
          </div>
        </div>

        {/* Camera / Simulator Trigger Bar */}
        {cameraMode === 'camera' && (
          <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
              <p className="font-semibold text-slate-800">{cameraStatusMessage}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tip: Prop phone at chest height, or <strong>click &amp; drag in small circles on the avatar</strong> (or run Auto-Sim) to test hand dwell tracking.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleCamera}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition ${
                  isCameraActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-teal-700 hover:bg-teal-800 text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                {isCameraActive ? 'Stop Webcam' : 'Start Webcam Tracking'}
              </button>

              <button
                type="button"
                onClick={handleRunLiveDemoSimulation}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  isSimulatingPalpation
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-white hover:bg-teal-50 border-teal-300 text-teal-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isSimulatingPalpation ? 'Pause Demo Sim' : 'Simulate Clothed Demo'}
              </button>
            </div>
          </div>
        )}

        {/* Interactive SVG Body Map */}
        <AvatarBodyMap
          mode={isGapReview ? 'gap_review' : 'coverage'}
          coverageStates={coverageStates}
          activeStepZones={isGapReview ? missedZonesList : currentStep.zones}
          fingerPadNorm={telemetry?.fingerPadNorm}
          onZoneSelect={handleZoneTap}
          onSimulatedPalpationMove={handleAvatarPalpationMove}
        />

        {/* Cross-body hand technique hint */}
        {telemetry?.crossBodyHint && (
          <div className="mt-3 px-3.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <Hand className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{telemetry.crossBodyHint}</span>
          </div>
        )}

        {/* Honest Clinical Limits Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            <strong>Honest Technical Scope:</strong> Measures zone-level hand coverage only—cannot measure pressure, depth, or detect tissue changes.
          </span>
          <button
            type="button"
            onClick={() => {
              trackerRef.current.resetCoverage();
              syncStatesFromTracker();
              setIsGapReview(false);
              setCurrentStepIdx(0);
            }}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
          >
            <RotateCcw className="w-3 h-3" /> Reset Map
          </button>
        </div>
      </div>

      {/* Right Column: Step-by-Step Voice Guide, Gap Prompts & Finding Logger Trigger */}
      <div className="lg:col-span-5 space-y-4">
        {/* Progress Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Zone Coverage Progress
            </span>
            <span className="text-sm font-bold text-slate-900">
              {coveredZonesList.length} / {totalZones} Zones ({overallCoveragePercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-teal-600 transition-all duration-300 rounded-full"
              style={{ width: `${overallCoveragePercent}%` }}
            />
          </div>

          {/* Visual Inspection Checkbox */}
          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={visualInspectionDone}
              onChange={(e) => setVisualInspectionDone(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>
              <strong>Visual Mirror Check Included:</strong> Checked for symmetry, skin dimpling, redness, or nipple changes with arms at sides and raised.
            </span>
          </label>
        </div>

        {/* Active Guided Step OR Gap Prompt Card */}
        {!isGapReview ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-900">
                Step {currentStep.stepNumber} of {GUIDED_STEPS.length}
              </span>
              <button
                type="button"
                onClick={() => voiceService.speak(currentStep.voicePrompt, true)}
                className="text-xs text-teal-700 hover:underline font-medium"
              >
                Replay Voice Prompt
              </button>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1.5">{currentStep.title}</h3>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">{currentStep.voicePrompt}</p>

            <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-100 text-xs text-teal-900 mb-4">
              <strong>Technique Note:</strong> {currentStep.techniqueTip}
            </div>

            {/* Zones in this step */}
            <div className="space-y-1.5 mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition ${
                      state?.isCovered
                        ? 'bg-teal-50 border-teal-300 text-teal-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{zMeta.label}</span>
                    <span className="font-bold">
                      {state?.isCovered ? 'Covered ✓' : `${Math.round((state?.coverageRatio ?? 0) * 100)}%`}
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
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                Previous Step
              </button>

              {currentStepIdx < GUIDED_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStepIdx((i) => Math.min(GUIDED_STEPS.length - 1, i + 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-sm"
                >
                  Next Step <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishOrReviewGaps}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-sm"
                >
                  Review Coverage &amp; Finish <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Gap Prompt Card */
          <div className="bg-amber-50/90 rounded-2xl border-2 border-amber-300 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-amber-950">
                  Gap Prompt: Zones You May Have Missed
                </h3>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed">
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
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-amber-200 text-xs"
                    >
                      <span className="font-medium text-slate-800">{zMeta.label}</span>
                      <button
                        type="button"
                        onClick={() => handleZoneTap(zId)}
                        className="px-2.5 py-1 rounded bg-teal-700 text-white font-semibold hover:bg-teal-800"
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
                className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-amber-950 hover:bg-amber-100"
              >
                Go Back to Guided Steps
              </button>
              <button
                type="button"
                onClick={handleFinishOrReviewGaps}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold shadow-sm"
              >
                Save Check Session ({overallCoveragePercent}% Coverage)
              </button>
            </div>
          </div>
        )}

        {/* Quick Action: Felt Something Unusual? Log a Finding Immediately */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm">
          <h4 className="text-sm font-bold mb-1">Noticed Something Unusual During Your Check?</h4>
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            Tap any zone on the avatar or click below to record a lump, thickening, focal tenderness, skin change, or nipple change tagged with today&apos;s cycle day (Day {cycleInfo.currentCycleDay ?? '-'}).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenFindingLogger(currentStep.zones[0], currentExamId)}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition"
            >
              + Log Observation in Current Zone
            </button>
            <button
              type="button"
              onClick={handleFinishOrReviewGaps}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
            >
              Check Gaps &amp; Complete Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
