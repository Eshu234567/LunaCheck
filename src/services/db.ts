import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  ANATOMICAL_ZONES,
  CycleHealthLog,
  ExamSessionRecord,
  FindingRecord,
  UserProfile,
} from '../types/schema';

interface BaselineDB extends DBSchema {
  profile: {
    key: string;
    value: UserProfile;
  };
  exams: {
    key: string;
    value: ExamSessionRecord;
  };
  findings: {
    key: string;
    value: FindingRecord;
  };
  cycleLogs: {
    key: string;
    value: CycleHealthLog;
  };
}

const DB_NAME = 'baseline_breast_cycle_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BaselineDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<BaselineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile');
        }
        if (!db.objectStoreNames.contains('exams')) {
          db.createObjectStore('exams', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('findings')) {
          db.createObjectStore('findings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cycleLogs')) {
          db.createObjectStore('cycleLogs', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  ageRange: '30-39',
  trackingMode: 'cycling_regular',
  typicalCycleLength: 28,
  typicalPeriodLength: 5,
  lastPeriodStartISO: '2026-10-17', // Makes 2026-10-24 Cycle Day 8 (Follicular Baseline Window!)
  monthlyAnchorDay: 8,
  personalBaselineNote: 'Slight natural firmness along outer upper regions right before period; normally soft post-period.',
  onboardingCompleted: false,
};

export async function getUserProfile(): Promise<UserProfile> {
  const db = await getDB();
  const existing = await db.get('profile', 'current');
  if (existing) return existing;
  return DEFAULT_USER_PROFILE;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put('profile', profile, 'current');
}

export async function getAllExams(): Promise<ExamSessionRecord[]> {
  const db = await getDB();
  const list = await db.getAll('exams');
  return list.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

export async function saveExamSession(exam: ExamSessionRecord): Promise<void> {
  const db = await getDB();
  await db.put('exams', exam);
}

export async function getAllFindings(): Promise<FindingRecord[]> {
  const db = await getDB();
  const list = await db.getAll('findings');
  return list.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

export async function saveFinding(finding: FindingRecord): Promise<void> {
  const db = await getDB();
  await db.put('findings', finding);
}

export async function deleteFinding(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('findings', id);
}

export async function getAllCycleLogs(): Promise<CycleHealthLog[]> {
  const db = await getDB();
  const list = await db.getAll('cycleLogs');
  return list.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

export async function saveCycleLog(log: CycleHealthLog): Promise<void> {
  const db = await getDB();
  await db.put('cycleLogs', log);
}

export async function clearAllLocalData(): Promise<void> {
  const db = await getDB();
  await db.clear('profile');
  await db.clear('exams');
  await db.clear('findings');
  await db.clear('cycleLogs');
}

/**
 * Seeds a rich 4-month longitudinal dataset ("Maya, 30-39") for live hackathon demos
 * so judges can immediately see:
 * 1. A July Luteal-phase tenderness & thickening entry that resolved at August baseline ("Not noted at subsequent baseline")
 * 2. A Left Upper Outer (2 o'clock) small firm knot first noticed in August baseline, persisting in September baseline, and confirmed in October baseline.
 * 3. Multi-month non-fertility cycle logs showing cyclical mastalgia vs baseline checks.
 */
export async function seedFourMonthDemoHistory(): Promise<void> {
  const db = await getDB();
  await clearAllLocalData();

  const demoProfile: UserProfile = {
    ageRange: '30-39',
    trackingMode: 'cycling_regular',
    typicalCycleLength: 28,
    typicalPeriodLength: 5,
    lastPeriodStartISO: '2026-10-17', // Today (2026-10-24) is Day 8 — Optimal Follicular Baseline Window
    monthlyAnchorDay: 8,
    personalBaselineNote: 'Slight cyclical fullness 4-5 days before period; normally smooth 3 days after period ends.',
    onboardingCompleted: true,
  };
  await db.put('profile', demoProfile, 'current');

  const allZoneIds = ANATOMICAL_ZONES.map((z) => z.id);

  const demoExams: ExamSessionRecord[] = [
    {
      id: 'exam-2026-07',
      dateISO: '2026-07-21',
      mode: 'camera_assisted',
      cycleDay: 24,
      cyclePhase: 'luteal',
      coveredZones: allZoneIds.filter((id) => id !== 'left_clavicle'),
      missedZones: ['left_clavicle'],
      coveragePercent: 94,
      visualInspectionCompleted: true,
      notes: 'Checked a few days before period started; felt general pre-period soreness on right side.',
    },
    {
      id: 'exam-2026-08',
      dateISO: '2026-08-03',
      mode: 'camera_assisted',
      cycleDay: 9,
      cyclePhase: 'follicular_baseline',
      coveredZones: allZoneIds,
      missedZones: [],
      coveragePercent: 100,
      visualInspectionCompleted: true,
      notes: 'Re-checked during post-period baseline window. Right side luteal soreness was not present, but felt a small pea-sized spot on left upper outer.',
    },
    {
      id: 'exam-2026-09',
      dateISO: '2026-09-01',
      mode: 'camera_assisted',
      cycleDay: 10,
      cyclePhase: 'follicular_baseline',
      coveredZones: allZoneIds,
      missedZones: [],
      coveragePercent: 100,
      visualInspectionCompleted: true,
      notes: 'Monthly baseline check after period ended. Small spot on left upper outer (2 o’clock) is still present.',
    },
  ];

  for (const ex of demoExams) {
    await db.put('exams', ex);
  }

  const demoFindings: FindingRecord[] = [
    {
      id: 'find-2026-07-r',
      examId: 'exam-2026-07',
      dateISO: '2026-07-21',
      side: 'right',
      zoneId: 'right_upper_outer',
      clockHour: 10,
      symptomType: 'tenderness',
      isBilateral: true,
      cycleDay: 24,
      cyclePhase: 'luteal',
      userNote: 'Tender and slightly fuller before period; felt similar on both sides.',
    },
    {
      id: 'find-2026-08-l',
      examId: 'exam-2026-08',
      dateISO: '2026-08-03',
      side: 'left',
      zoneId: 'left_upper_outer',
      clockHour: 2,
      symptomType: 'lump',
      isBilateral: false,
      cycleDay: 9,
      cyclePhase: 'follicular_baseline',
      userNote: 'Small firm pea-like spot at 2 o’clock, about 3cm from nipple. Not tender.',
    },
    {
      id: 'find-2026-09-l',
      examId: 'exam-2026-09',
      dateISO: '2026-09-01',
      side: 'left',
      zoneId: 'left_upper_outer',
      clockHour: 2,
      symptomType: 'lump',
      isBilateral: false,
      cycleDay: 10,
      cyclePhase: 'follicular_baseline',
      userNote: 'Same firm spot at 2 o’clock on left upper outer quadrant; feels unchanged from August.',
    },
  ];

  for (const f of demoFindings) {
    await db.put('findings', f);
  }

  const demoCycleLogs: CycleHealthLog[] = [
    {
      id: 'cyc-2026-07-25',
      dateISO: '2026-07-25',
      isPeriodStart: true,
      flowIntensity: 'medium',
      systemicSymptoms: ['cyclical_breast_tenderness', 'pelvic_cramps', 'fatigue_low_energy'],
      notes: 'Period started on schedule; pre-period breast tenderness eased by Day 3.',
    },
    {
      id: 'cyc-2026-08-22',
      dateISO: '2026-08-22',
      isPeriodStart: true,
      flowIntensity: 'medium',
      systemicSymptoms: ['breast_fullness_swelling', 'sleep_disruption'],
      notes: 'Mild luteal swelling the week prior.',
    },
    {
      id: 'cyc-2026-09-19',
      dateISO: '2026-09-19',
      isPeriodStart: true,
      flowIntensity: 'light',
      systemicSymptoms: ['fatigue_low_energy', 'headache_migraine'],
      notes: '28-day cycle.',
    },
    {
      id: 'cyc-2026-10-17',
      dateISO: '2026-10-17',
      isPeriodStart: true,
      flowIntensity: 'medium',
      systemicSymptoms: ['pelvic_cramps', 'cyclical_breast_tenderness'],
      notes: 'Latest period start. Post-period baseline window opens Oct 23–28.',
    },
  ];

  for (const c of demoCycleLogs) {
    await db.put('cycleLogs', c);
  }
}
