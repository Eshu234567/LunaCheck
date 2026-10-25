import { CycleProfile, Observation, RoutineSessionRecord, UserProfile, PersonalLogEntry } from '../types';
import { DEFAULT_CYCLE_PROFILE, DEFAULT_USER_PROFILE, SAMPLE_OBSERVATIONS, SAMPLE_ROUTINE_HISTORY } from '../data/sampleData';

const STORAGE_KEYS = {
  USER_PROFILE: 'aura_bsa_user_profile',
  CYCLE_PROFILE: 'aura_bsa_cycle_profile',
  OBSERVATIONS: 'aura_bsa_observations',
  ROUTINES: 'aura_bsa_routines',
  PERSONAL_LOGS: 'aura_bsa_personal_logs',
  IS_LOCKED: 'aura_bsa_locked_state',
  CLEAN_V3: 'aura_bsa_clean_v3',
};

export const storageService = {
  // Purge any legacy sample/mock data from previous versions
  initCleanState(): void {
    try {
      const isClean = localStorage.getItem(STORAGE_KEYS.CLEAN_V3);
      if (!isClean) {
        localStorage.removeItem(STORAGE_KEYS.OBSERVATIONS);
        localStorage.removeItem(STORAGE_KEYS.ROUTINES);
        const user = this.getUserProfile();
        if (user.name === 'Elena Vance') {
          this.saveUserProfile({ ...DEFAULT_USER_PROFILE, name: '' });
        }
        localStorage.setItem(STORAGE_KEYS.CLEAN_V3, 'true');
      }
    } catch {
      // Ignore
    }
  },

  getUserProfile(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (!data) return DEFAULT_USER_PROFILE;
      const parsed = JSON.parse(data);
      if (parsed.name === 'Elena Vance') {
        parsed.name = '';
        parsed.hasBaselineNotes = false;
      }
      return parsed;
    } catch {
      return DEFAULT_USER_PROFILE;
    }
  },

  saveUserProfile(profile: UserProfile): void {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  },

  getCycleProfile(): CycleProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CYCLE_PROFILE);
      return data ? JSON.parse(data) : DEFAULT_CYCLE_PROFILE;
    } catch {
      return DEFAULT_CYCLE_PROFILE;
    }
  },

  saveCycleProfile(profile: CycleProfile): void {
    localStorage.setItem(STORAGE_KEYS.CYCLE_PROFILE, JSON.stringify(profile));
  },

  getObservations(): Observation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OBSERVATIONS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      // Purge any mock observations
      return parsed.filter((o) => !o.id.startsWith('obs-aug-') && !o.id.startsWith('obs-sep-') && !o.id.startsWith('obs-oct-'));
    } catch {
      return [];
    }
  },

  saveObservations(observations: Observation[]): void {
    localStorage.setItem(STORAGE_KEYS.OBSERVATIONS, JSON.stringify(observations));
  },

  getRoutines(): RoutineSessionRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ROUTINES);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      // Purge any mock routines
      return parsed.filter((r) => !r.id.startsWith('session-aug-') && !r.id.startsWith('session-sep-') && !r.id.startsWith('session-oct-'));
    } catch {
      return [];
    }
  },

  saveRoutines(routines: RoutineSessionRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
  },

  getPersonalLogs(): PersonalLogEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PERSONAL_LOGS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  savePersonalLogs(logs: PersonalLogEntry[]): void {
    localStorage.setItem(STORAGE_KEYS.PERSONAL_LOGS, JSON.stringify(logs));
  },

  deletePersonalLog(id: string): void {
    const logs = this.getPersonalLogs().filter((l) => l.id !== id);
    this.savePersonalLogs(logs);
  },

  isLocked(): boolean {
    const status = localStorage.getItem(STORAGE_KEYS.IS_LOCKED);
    return status === 'true';
  },

  setLocked(locked: boolean): void {
    localStorage.setItem(STORAGE_KEYS.IS_LOCKED, String(locked));
  },

  // Recalculates persistence & cyclic tendencies whenever observations change
  computeObservationPersistence(newObs: Omit<Observation, 'id' | 'persistenceStatus' | 'consecutiveCyclesCount'>): Observation {
    const existingList = this.getObservations();
    
    // Find prior observations in the same zone
    const priorMatching = existingList
      .filter((o) => o.zoneId === newObs.zoneId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let persistenceStatus: Observation['persistenceStatus'] = 'New Observation';
    let consecutiveCyclesCount = 1;

    if (priorMatching.length > 0) {
      const lastPrior = priorMatching[0];
      const daysDiff = (new Date(newObs.date).getTime() - new Date(lastPrior.date).getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff >= 18 && daysDiff <= 75) {
        persistenceStatus = 'Persisting Observation';
        consecutiveCyclesCount = (lastPrior.consecutiveCyclesCount || 1) + 1;
      } else if (newObs.cycleDay && newObs.cycleDay > 20 && newObs.category === 'Localized Tenderness / Discomfort') {
        persistenceStatus = 'Cyclic Tendency';
      } else {
        persistenceStatus = 'Persisting Observation';
        consecutiveCyclesCount = (lastPrior.consecutiveCyclesCount || 1) + 1;
      }
    } else if (newObs.cycleDay && newObs.cycleDay > 20 && newObs.category === 'Localized Tenderness / Discomfort') {
      persistenceStatus = 'Cyclic Tendency';
    }

    const created: Observation = {
      ...newObs,
      id: `obs-${Date.now()}`,
      persistenceStatus,
      consecutiveCyclesCount,
    };

    const updated = [created, ...existingList];
    this.saveObservations(updated);
    return created;
  },

  // Export all application data as encrypted/portable JSON
  exportDataJSON(): string {
    const bundle = {
      user: this.getUserProfile(),
      cycle: this.getCycleProfile(),
      observations: this.getObservations(),
      routines: this.getRoutines(),
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0-aura',
    };
    return JSON.stringify(bundle, null, 2);
  },

  // Restore or import data
  importDataJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.user) this.saveUserProfile(parsed.user);
      if (parsed.cycle) this.saveCycleProfile(parsed.cycle);
      if (parsed.observations) this.saveObservations(parsed.observations);
      if (parsed.routines) this.saveRoutines(parsed.routines);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  },

  // Reset to initial clean state
  resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.CYCLE_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.OBSERVATIONS);
    localStorage.removeItem(STORAGE_KEYS.ROUTINES);
    localStorage.removeItem(STORAGE_KEYS.IS_LOCKED);
  },
};

// Initialize clean state immediately on script load
storageService.initCleanState();
