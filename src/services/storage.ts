import { CycleProfile, Observation, RoutineSessionRecord, UserProfile, PersonalLogEntry } from '../types';
import { DEFAULT_CYCLE_PROFILE, DEFAULT_USER_PROFILE } from '../data/sampleData';

const GLOBAL_KEYS = {
  ACCOUNTS_REGISTRY: 'sally_accounts_registry_v1',
  ACTIVE_EMAIL: 'sally_active_account_email_v1',
  LAST_EMAIL: 'sally_last_used_email_v1',
  IS_LOCKED: 'aura_bsa_locked_state',
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getVaultKey(email: string | null, suffix: string): string {
  const scope = email ? normalizeEmail(email) : 'guest';
  return `sally_vault_${scope}_${suffix}`;
}

// Generate 16-byte random hex salt using Web Crypto API
export function generateCryptographicSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Salted SHA-256 hash using Web Crypto API (with deterministic fallback if subtle is unavailable)
export async function hashPinWithSalt(pin: string, salt: string): Promise<string> {
  const payload = `sally-pin-v1:${salt}:${pin}`;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback FNV-1a 256-bit style expansion
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export const storageService = {
  // Retrieve all registered private user accounts on this device
  getRegisteredAccounts(): UserProfile[] {
    try {
      const raw = localStorage.getItem(GLOBAL_KEYS.ACCOUNTS_REGISTRY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveRegisteredAccounts(accounts: UserProfile[]): void {
    localStorage.setItem(GLOBAL_KEYS.ACCOUNTS_REGISTRY, JSON.stringify(accounts));
  },

  getActiveAccountEmail(): string | null {
    return localStorage.getItem(GLOBAL_KEYS.ACTIVE_EMAIL);
  },

  getLastUsedEmail(): string {
    return localStorage.getItem(GLOBAL_KEYS.LAST_EMAIL) || '';
  },

  setActiveAccountEmail(email: string | null): void {
    if (email) {
      const norm = normalizeEmail(email);
      localStorage.setItem(GLOBAL_KEYS.ACTIVE_EMAIL, norm);
      localStorage.setItem(GLOBAL_KEYS.LAST_EMAIL, norm);
    } else {
      localStorage.removeItem(GLOBAL_KEYS.ACTIVE_EMAIL);
    }
  },

  // Create a new private account with Email + 4-digit PIN (salted SHA-256)
  async registerAccount(params: {
    name: string;
    email: string;
    ageBracket: string;
    pin: string;
  }): Promise<{ ok: boolean; error?: string; user?: UserProfile }> {
    const normEmail = normalizeEmail(params.email);
    const trimmedName = params.name.trim();

    if (!trimmedName) {
      return { ok: false, error: 'Please enter your name for your personal profile.' };
    }
    if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (!/^\d{4}$/.test(params.pin)) {
      return { ok: false, error: 'Security PIN must be exactly 4 digits.' };
    }

    const accounts = this.getRegisteredAccounts();
    const existing = accounts.find((a) => normalizeEmail(a.email || '') === normEmail);
    if (existing) {
      return {
        ok: false,
        error: 'An account with this email already exists. Please switch to Sign In.',
      };
    }

    const pinSalt = generateCryptographicSalt();
    const pinHash = await hashPinWithSalt(params.pin, pinSalt);

    const newUser: UserProfile = {
      email: normEmail,
      name: trimmedName,
      ageBracket: params.ageBracket || '25–34',
      hasBaselineNotes: false,
      pinHash,
      pinSalt,
      isPinLocked: false,
      createdAt: new Date().toISOString(),
    };

    const updatedAccounts = [...accounts, newUser];
    this.saveRegisteredAccounts(updatedAccounts);
    this.setActiveAccountEmail(normEmail);
    this.saveUserProfile(newUser);
    this.setLocked(false);

    return { ok: true, user: newUser };
  },

  // Authenticate an existing private account with Email + 4-digit PIN
  async authenticateAccount(
    email: string,
    pin: string
  ): Promise<{ ok: boolean; error?: string; user?: UserProfile }> {
    const normEmail = normalizeEmail(email);
    if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (!/^\d{4}$/.test(pin)) {
      return { ok: false, error: 'Please enter your 4-digit security PIN.' };
    }

    const accounts = this.getRegisteredAccounts();
    const account = accounts.find((a) => normalizeEmail(a.email || '') === normEmail);

    if (!account) {
      return {
        ok: false,
        error: 'No account found for this email. Please create a new account first.',
      };
    }

    let isValid = false;
    if (account.pinSalt) {
      const computedHash = await hashPinWithSalt(pin, account.pinSalt);
      isValid = computedHash === account.pinHash;
    } else {
      // Legacy plain comparison fallback
      isValid = pin === account.pinHash;
    }

    if (!isValid) {
      return { ok: false, error: 'Incorrect 4-digit PIN for this email. Please try again.' };
    }

    this.setActiveAccountEmail(normEmail);
    this.saveUserProfile(account);
    this.setLocked(false);

    return { ok: true, user: account };
  },

  logoutAccount(): void {
    this.setLocked(true);
    this.setActiveAccountEmail(null);
  },

  getUserProfile(): UserProfile {
    try {
      const activeEmail = this.getActiveAccountEmail();
      if (activeEmail) {
        const accounts = this.getRegisteredAccounts();
        const found = accounts.find((a) => normalizeEmail(a.email || '') === normalizeEmail(activeEmail));
        if (found) return found;
      }
      const key = getVaultKey(activeEmail, 'user_profile');
      const data = localStorage.getItem(key);
      if (!data) return DEFAULT_USER_PROFILE;
      return JSON.parse(data);
    } catch {
      return DEFAULT_USER_PROFILE;
    }
  },

  saveUserProfile(profile: UserProfile): void {
    const email = profile.email || this.getActiveAccountEmail();
    const key = getVaultKey(email, 'user_profile');
    localStorage.setItem(key, JSON.stringify(profile));

    if (email) {
      const accounts = this.getRegisteredAccounts();
      const idx = accounts.findIndex((a) => normalizeEmail(a.email || '') === normalizeEmail(email));
      if (idx >= 0) {
        accounts[idx] = profile;
        this.saveRegisteredAccounts(accounts);
      }
    }
  },

  getCycleProfile(): CycleProfile {
    try {
      const key = getVaultKey(this.getActiveAccountEmail(), 'cycle_profile');
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : DEFAULT_CYCLE_PROFILE;
    } catch {
      return DEFAULT_CYCLE_PROFILE;
    }
  },

  saveCycleProfile(profile: CycleProfile): void {
    const key = getVaultKey(this.getActiveAccountEmail(), 'cycle_profile');
    localStorage.setItem(key, JSON.stringify(profile));
  },

  getObservations(): Observation[] {
    try {
      const key = getVaultKey(this.getActiveAccountEmail(), 'observations');
      const data = localStorage.getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveObservations(observations: Observation[]): void {
    const key = getVaultKey(this.getActiveAccountEmail(), 'observations');
    localStorage.setItem(key, JSON.stringify(observations));
  },

  getRoutines(): RoutineSessionRecord[] {
    try {
      const key = getVaultKey(this.getActiveAccountEmail(), 'routines');
      const data = localStorage.getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveRoutines(routines: RoutineSessionRecord[]): void {
    const key = getVaultKey(this.getActiveAccountEmail(), 'routines');
    localStorage.setItem(key, JSON.stringify(routines));
  },

  getPersonalLogs(): PersonalLogEntry[] {
    try {
      const key = getVaultKey(this.getActiveAccountEmail(), 'personal_logs');
      const data = localStorage.getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  savePersonalLogs(logs: PersonalLogEntry[]): void {
    const key = getVaultKey(this.getActiveAccountEmail(), 'personal_logs');
    localStorage.setItem(key, JSON.stringify(logs));
  },

  deletePersonalLog(id: string): void {
    const logs = this.getPersonalLogs().filter((l) => l.id !== id);
    this.savePersonalLogs(logs);
  },

  isLocked(): boolean {
    const status = localStorage.getItem(GLOBAL_KEYS.IS_LOCKED);
    return status === 'true';
  },

  setLocked(locked: boolean): void {
    localStorage.setItem(GLOBAL_KEYS.IS_LOCKED, String(locked));
  },

  // Recalculates persistence & cyclic tendencies whenever observations change
  computeObservationPersistence(
    newObs: Omit<Observation, 'id' | 'persistenceStatus' | 'consecutiveCyclesCount'>
  ): Observation {
    const existingList = this.getObservations();

    // Find prior observations in the same zone
    const priorMatching = existingList
      .filter((o) => o.zoneId === newObs.zoneId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let persistenceStatus: Observation['persistenceStatus'] = 'New Observation';
    let consecutiveCyclesCount = 1;

    if (priorMatching.length > 0) {
      const lastPrior = priorMatching[0];
      const daysDiff =
        (new Date(newObs.date).getTime() - new Date(lastPrior.date).getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysDiff >= 18 && daysDiff <= 75) {
        persistenceStatus = 'Persisting Observation';
        consecutiveCyclesCount = (lastPrior.consecutiveCyclesCount || 1) + 1;
      } else if (
        newObs.cycleDay &&
        newObs.cycleDay > 20 &&
        newObs.category === 'Localized Tenderness / Discomfort'
      ) {
        persistenceStatus = 'Cyclic Tendency';
      } else {
        persistenceStatus = 'Persisting Observation';
        consecutiveCyclesCount = (lastPrior.consecutiveCyclesCount || 1) + 1;
      }
    } else if (
      newObs.cycleDay &&
      newObs.cycleDay > 20 &&
      newObs.category === 'Localized Tenderness / Discomfort'
    ) {
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

  exportDataJSON(): string {
    const bundle = {
      user: this.getUserProfile(),
      cycle: this.getCycleProfile(),
      observations: this.getObservations(),
      routines: this.getRoutines(),
      personalLogs: this.getPersonalLogs(),
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0-sally',
    };
    return JSON.stringify(bundle, null, 2);
  },

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

  // Reset only the active user's vault data
  resetToDefault(): void {
    const email = this.getActiveAccountEmail();
    localStorage.removeItem(getVaultKey(email, 'cycle_profile'));
    localStorage.removeItem(getVaultKey(email, 'observations'));
    localStorage.removeItem(getVaultKey(email, 'routines'));
    localStorage.removeItem(getVaultKey(email, 'personal_logs'));
  },
};
