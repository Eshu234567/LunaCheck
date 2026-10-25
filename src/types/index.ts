// Core types for Aura Health - Breast Self-Awareness (BSA)

export type BreastSide = 'left' | 'right';

export type BodyRegion = 'breast' | 'axilla' | 'clavicular' | 'areola';

export type Quadrant =
  | 'Upper Outer Quadrant (UOQ)'
  | 'Upper Inner Quadrant (UIQ)'
  | 'Lower Outer Quadrant (LOQ)'
  | 'Lower Inner Quadrant (LIQ)'
  | 'Axillary Tail of Spence'
  | 'Areola / Nipple Complex'
  | 'Supraclavicular / Collarbone';

export interface BodyZone {
  id: string; // e.g., 'L-B-10-2' (Left Breast 10 o'clock Ring 2)
  side: BreastSide;
  region: BodyRegion;
  clockPosition?: number; // 1 to 12
  ring?: number; // 1: Periareolar, 2: Inner-Mid, 3: Outer-Mid, 4: Peripheral
  name: string; // e.g. "Left Breast 10:00 - Outer Mid"
  quadrant: Quadrant;
  svgPath?: string;
  cx: number;
  cy: number;
  radius?: number;
}

export type SymptomCategory =
  | 'Lump / Distinct Nodularity'
  | 'Area of Firmness or Thickening'
  | 'Localized Tenderness / Discomfort'
  | 'Skin Changes (dimpling, puckering, redness)'
  | 'Nipple Changes (inversion, discharge, scaling)';

export type TextureFeel =
  | 'Soft & Mobile'
  | 'Firm & Rubbery'
  | 'Hard & Immobile'
  | 'Diffuse / Grainy (Fibrocystic texture)'
  | 'Superficial / Skin level';

export type SizeReference =
  | 'Small Pea (~5 mm)'
  | 'Marble (~12 mm)'
  | 'Walnut (~25 mm)'
  | 'Diffuse area (>30 mm)'
  | 'Not palpable / visual only';

export type PersistenceStatus =
  | 'New Observation'
  | 'Persisting Observation' // Observed across >=2 consecutive exams in same/adjacent zone
  | 'Cyclic Tendency' // Present in luteal phase, resolved/noted lower post-period
  | 'Not Noted This Month'; // Never "Gone" or "Healed"

export interface Observation {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  zoneId: string;
  side: BreastSide;
  zoneName: string;
  quadrant: Quadrant;
  category: SymptomCategory;
  feel: TextureFeel;
  size: SizeReference;
  cycleDay?: number;
  isRedFlag: boolean; // Triggers clinical advisory
  notes?: string;
  persistenceStatus: PersistenceStatus;
  consecutiveCyclesCount?: number;
}

export interface RoutineSessionRecord {
  id: string;
  date: string;
  mode: 'camera' | 'manual' | 'simulated';
  durationSeconds: number;
  coveredZoneIds: string[];
  totalZonesCount: number;
  coveragePercentage: number;
  observationsLoggedCount: number;
  cycleDay?: number;
  completedRoutine: boolean;
}

export interface CycleProfile {
  lastPeriodDate: string; // YYYY-MM-DD
  cycleLengthDays: number; // default 28
  trackingEnabled: boolean;
}

export interface UserProfile {
  name: string;
  ageBracket: string; // e.g. '25-34', '35-44', etc.
  hasBaselineNotes: boolean;
  pinHash: string; // default "1234"
  isPinLocked: boolean;
}

export type ActiveScreen = 'landing' | 'pin' | 'dashboard' | 'routine' | 'timeline' | 'bodymap' | 'report';

export interface PersonalLogEntry {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  timestamp: string; // e.g. "3:45 PM"
  notes: string;
  markedZoneIds: string[];
  markedZoneNames: string[];
}
