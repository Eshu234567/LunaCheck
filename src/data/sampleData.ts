import { CycleProfile, Observation, RoutineSessionRecord, UserProfile } from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: '',
  ageBracket: '25–34',
  hasBaselineNotes: false,
  pinHash: '1234',
  isPinLocked: false,
};

export const DEFAULT_CYCLE_PROFILE: CycleProfile = {
  lastPeriodDate: new Date().toISOString().split('T')[0],
  cycleLengthDays: 28,
  trackingEnabled: true,
};

export const SAMPLE_OBSERVATIONS: Observation[] = [];

export const SAMPLE_ROUTINE_HISTORY: RoutineSessionRecord[] = [];
