export type Side = 'left' | 'right';

export type AnatomicalZoneId =
  | `${Side}_upper_outer`
  | `${Side}_upper_inner`
  | `${Side}_lower_outer`
  | `${Side}_lower_inner`
  | `${Side}_central_nipple`
  | `${Side}_tail_of_spence`
  | `${Side}_axilla`
  | `${Side}_clavicle`;

export type CyclePhase =
  | 'menstrual'           // Days 1-5: Hormone levels drop; tenderness subsiding
  | 'follicular_baseline' // Days 6-12: OPTIMAL CHECK WINDOW (Estrogen & progesterone low, softest tissue)
  | 'mid_cycle'           // Days 13-16: Estrogen peak (Non-fertility framing: mid-cycle hormone transition)
  | 'luteal'              // Days 17-28+: Progesterone dominant; cyclical mastalgia/lumpiness common
  | 'non_cycling';        // Irregular / Menopause / Hormonal IUD / Fixed monthly anchor

export type FindingType =
  | 'lump'
  | 'thickening'
  | 'tenderness'
  | 'skin_change'         // dimpling, redness, peau d'orange
  | 'nipple_change';      // new inversion, discharge

export type SystemicSymptom =
  | 'cyclical_breast_tenderness'
  | 'breast_fullness_swelling'
  | 'fatigue_low_energy'
  | 'pelvic_cramps'
  | 'headache_migraine'
  | 'sleep_disruption'
  | 'joint_muscle_ache'
  | 'mood_reactivity';

export interface ZoneMetadata {
  id: AnatomicalZoneId;
  side: Side;
  label: string;
  shortLabel: string;
  clinicalGroup: 'breast_mound' | 'tail_axilla' | 'clavicle';
  stepIndex: number; // 1 to 6 guided order
  defaultClockHour: number;
  // Normalized torso coordinates (u: horizontal -0.6 to +0.6, v: vertical 0.0 to 1.0)
  // Note: Anatomical Right is viewer's Left (u < 0), Anatomical Left is viewer's Right (u > 0)
  normCenter: { u: number; v: number; radius: number };
}

export interface ZoneCoverageState {
  zoneId: AnatomicalZoneId;
  dwellMs: number;
  targetMs: number;
  coverageRatio: number; // 0 to 1
  isCovered: boolean;
  lastTouchedAt?: number;
}

export interface FindingRecord {
  id: string;
  examId: string;
  dateISO: string;
  side: Side;
  zoneId: AnatomicalZoneId;
  clockHour?: number; // 1-12
  symptomType: FindingType;
  isBilateral?: boolean;
  cycleDay?: number;
  cyclePhase: CyclePhase;
  userNote?: string;
}

export interface ExamSessionRecord {
  id: string;
  dateISO: string;
  mode: 'camera_assisted' | 'manual_guided';
  cycleDay?: number;
  cyclePhase: CyclePhase;
  coveredZones: AnatomicalZoneId[];
  missedZones: AnatomicalZoneId[];
  coveragePercent: number;
  visualInspectionCompleted: boolean;
  notes?: string;
}

export interface CycleHealthLog {
  id: string;
  dateISO: string;
  isPeriodStart: boolean;
  flowIntensity?: 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
  systemicSymptoms: SystemicSymptom[];
  notes?: string;
}

export interface UserProfile {
  ageRange: '18-29' | '30-39' | '40-49' | '50-59' | '60+';
  trackingMode: 'cycling_regular' | 'cycling_irregular' | 'non_cycling_anchor';
  typicalCycleLength: number; // e.g., 28
  typicalPeriodLength: number; // e.g., 5
  lastPeriodStartISO: string; // e.g., 2026-10-17
  monthlyAnchorDay: number; // 1-28 for non-cycling users
  personalBaselineNote: string;
  pinCode?: string;
  onboardingCompleted: boolean;
}

export interface PersistenceAnalysis {
  finding: FindingRecord;
  status:
    | 'persisting_across_cycle'
    | 'red_flag_clinical_priority'
    | 'luteal_phase_observation_recheck_scheduled'
    | 'single_observation'
    | 'not_noted_subsequent_month';
  badgeText: string;
  clinicalRationale: string;
  severityLevel: 'priority_consult' | 'discuss_at_visit' | 'scheduled_recheck' | 'neutral_log';
  consecutiveMonths: number;
}

export const ANATOMICAL_ZONES: ZoneMetadata[] = [
  // RIGHT SIDE (Viewer's left: u < 0)
  {
    id: 'right_upper_outer',
    side: 'right',
    label: 'Right Upper Outer Quadrant',
    shortLabel: 'R Upper Outer',
    clinicalGroup: 'breast_mound',
    stepIndex: 1,
    defaultClockHour: 10,
    normCenter: { u: -0.34, v: 0.44, radius: 0.13 },
  },
  {
    id: 'right_upper_inner',
    side: 'right',
    label: 'Right Upper Inner Quadrant',
    shortLabel: 'R Upper Inner',
    clinicalGroup: 'breast_mound',
    stepIndex: 1,
    defaultClockHour: 2,
    normCenter: { u: -0.16, v: 0.44, radius: 0.13 },
  },
  {
    id: 'right_lower_outer',
    side: 'right',
    label: 'Right Lower Outer Quadrant',
    shortLabel: 'R Lower Outer',
    clinicalGroup: 'breast_mound',
    stepIndex: 1,
    defaultClockHour: 8,
    normCenter: { u: -0.34, v: 0.62, radius: 0.13 },
  },
  {
    id: 'right_lower_inner',
    side: 'right',
    label: 'Right Lower Inner Quadrant',
    shortLabel: 'R Lower Inner',
    clinicalGroup: 'breast_mound',
    stepIndex: 1,
    defaultClockHour: 4,
    normCenter: { u: -0.16, v: 0.62, radius: 0.13 },
  },
  {
    id: 'right_central_nipple',
    side: 'right',
    label: 'Right Central / Nipple-Areolar Complex',
    shortLabel: 'R Central / Areola',
    clinicalGroup: 'breast_mound',
    stepIndex: 1,
    defaultClockHour: 12,
    normCenter: { u: -0.25, v: 0.53, radius: 0.09 },
  },
  {
    id: 'right_tail_of_spence',
    side: 'right',
    label: 'Right Tail of Spence (Upper Outer Extension)',
    shortLabel: 'R Tail of Spence',
    clinicalGroup: 'tail_axilla',
    stepIndex: 2,
    defaultClockHour: 10,
    normCenter: { u: -0.43, v: 0.34, radius: 0.10 },
  },
  {
    id: 'right_axilla',
    side: 'right',
    label: 'Right Axilla (Underarm Area)',
    shortLabel: 'R Underarm (Axilla)',
    clinicalGroup: 'tail_axilla',
    stepIndex: 2,
    defaultClockHour: 9,
    normCenter: { u: -0.50, v: 0.27, radius: 0.11 },
  },
  {
    id: 'right_clavicle',
    side: 'right',
    label: 'Right Supraclavicular / Collarbone Region',
    shortLabel: 'R Collarbone',
    clinicalGroup: 'clavicle',
    stepIndex: 3,
    defaultClockHour: 12,
    normCenter: { u: -0.26, v: 0.18, radius: 0.11 },
  },

  // LEFT SIDE (Viewer's right: u > 0)
  {
    id: 'left_upper_outer',
    side: 'left',
    label: 'Left Upper Outer Quadrant',
    shortLabel: 'L Upper Outer',
    clinicalGroup: 'breast_mound',
    stepIndex: 4,
    defaultClockHour: 2,
    normCenter: { u: 0.34, v: 0.44, radius: 0.13 },
  },
  {
    id: 'left_upper_inner',
    side: 'left',
    label: 'Left Upper Inner Quadrant',
    shortLabel: 'L Upper Inner',
    clinicalGroup: 'breast_mound',
    stepIndex: 4,
    defaultClockHour: 10,
    normCenter: { u: 0.16, v: 0.44, radius: 0.13 },
  },
  {
    id: 'left_lower_outer',
    side: 'left',
    label: 'Left Lower Outer Quadrant',
    shortLabel: 'L Lower Outer',
    clinicalGroup: 'breast_mound',
    stepIndex: 4,
    defaultClockHour: 4,
    normCenter: { u: 0.34, v: 0.62, radius: 0.13 },
  },
  {
    id: 'left_lower_inner',
    side: 'left',
    label: 'Left Lower Inner Quadrant',
    shortLabel: 'L Lower Inner',
    clinicalGroup: 'breast_mound',
    stepIndex: 4,
    defaultClockHour: 8,
    normCenter: { u: 0.16, v: 0.62, radius: 0.13 },
  },
  {
    id: 'left_central_nipple',
    side: 'left',
    label: 'Left Central / Nipple-Areolar Complex',
    shortLabel: 'L Central / Areola',
    clinicalGroup: 'breast_mound',
    stepIndex: 4,
    defaultClockHour: 12,
    normCenter: { u: 0.25, v: 0.53, radius: 0.09 },
  },
  {
    id: 'left_tail_of_spence',
    side: 'left',
    label: 'Left Tail of Spence (Upper Outer Extension)',
    shortLabel: 'L Tail of Spence',
    clinicalGroup: 'tail_axilla',
    stepIndex: 5,
    defaultClockHour: 2,
    normCenter: { u: 0.43, v: 0.34, radius: 0.10 },
  },
  {
    id: 'left_axilla',
    side: 'left',
    label: 'Left Axilla (Underarm Area)',
    shortLabel: 'L Underarm (Axilla)',
    clinicalGroup: 'tail_axilla',
    stepIndex: 5,
    defaultClockHour: 3,
    normCenter: { u: 0.50, v: 0.27, radius: 0.11 },
  },
  {
    id: 'left_clavicle',
    side: 'left',
    label: 'Left Supraclavicular / Collarbone Region',
    shortLabel: 'L Collarbone',
    clinicalGroup: 'clavicle',
    stepIndex: 6,
    defaultClockHour: 12,
    normCenter: { u: 0.26, v: 0.18, radius: 0.11 },
  },
];

export const FINDING_TYPE_LABELS: Record<FindingType, { label: string; description: string; isImmediateFlag: boolean }> = {
  lump: {
    label: 'Distinct Lump or Knot',
    description: 'A localized knot, pea-like or marble-like spot that feels distinct from surrounding tissue.',
    isImmediateFlag: false,
  },
  thickening: {
    label: 'Tissue Thickening / Firmness',
    description: 'An area that feels denser or firmer than the matching area on the other side.',
    isImmediateFlag: false,
  },
  tenderness: {
    label: 'Focal Tenderness or Pain',
    description: 'Soreness or discomfort when pressing a specific area (can be hormonal or non-cyclical).',
    isImmediateFlag: false,
  },
  skin_change: {
    label: 'Skin Change (Dimpling / Redness)',
    description: 'Puckering, dimpling, warmth, redness, or orange-peel texture on the skin surface.',
    isImmediateFlag: true,
  },
  nipple_change: {
    label: 'Nipple Change or Discharge',
    description: 'New inversion (pulling inward), crusting/scaling, or spontaneous fluid/bloody discharge.',
    isImmediateFlag: true,
  },
};

export const SYSTEMIC_SYMPTOM_LABELS: Record<SystemicSymptom, string> = {
  cyclical_breast_tenderness: 'Bilateral Breast Tenderness',
  breast_fullness_swelling: 'Hormonal Breast Fullness / Swelling',
  fatigue_low_energy: 'Fatigue / Low Energy',
  pelvic_cramps: 'Pelvic Cramps',
  headache_migraine: 'Headache / Hormonal Migraine',
  sleep_disruption: 'Sleep Disruption',
  joint_muscle_ache: 'Joint or Muscle Ache',
  mood_reactivity: 'Mood Shifts / Irritability',
};
