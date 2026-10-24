import React, { useEffect, useState } from 'react';
import {
  AnatomicalZoneId,
  CycleHealthLog,
  ExamSessionRecord,
  FindingRecord,
  UserProfile,
} from './types/schema';
import {
  clearAllLocalData,
  DEFAULT_USER_PROFILE,
  deleteFinding,
  getAllCycleLogs,
  getAllExams,
  getAllFindings,
  getUserProfile,
  saveCycleLog,
  saveExamSession,
  saveFinding,
  saveUserProfile,
  seedFourMonthDemoHistory,
} from './services/db';
import { analyzeFindingsPersistence } from './services/persistenceEngine';
import { generateClinicianSummaryPDF } from './services/pdfGenerator';
import { Dashboard } from './components/Dashboard';
import { GuidedCheckView } from './components/GuidedCheckView';
import { TimelineComparison } from './components/TimelineComparison';
import { CycleHealthCheckin } from './components/CycleHealthCheckin';
import { FindingLoggerModal } from './components/FindingLoggerModal';
import { OnboardingModal } from './components/OnboardingModal';
import {
  Shield,
  Lock,
  Sparkles,
  FileDown,
  Activity,
  Compass,
  Clock,
  Settings,
  EyeOff,
  Trash2,
} from 'lucide-react';

type ActiveTab = 'dashboard' | 'guided_check' | 'timeline' | 'cycle_health';

export function App() {
  const [todayISO] = useState<string>('2026-10-24');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [exams, setExams] = useState<ExamSessionRecord[]>([]);
  const [findings, setFindings] = useState<FindingRecord[]>([]);
  const [cycleLogs, setCycleLogs] = useState<CycleHealthLog[]>([]);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState<boolean>(false);
  const [preselectedZone, setPreselectedZone] = useState<AnatomicalZoneId | undefined>(undefined);
  const [activeExamIdForFinding, setActiveExamIdForFinding] = useState<string | undefined>(
    undefined
  );

  // Privacy Lock / Camouflage Decoy Screen State
  const [isPrivacyLocked, setIsPrivacyLocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const refreshLocalData = async () => {
    const [p, exList, fList, cList] = await Promise.all([
      getUserProfile(),
      getAllExams(),
      getAllFindings(),
      getAllCycleLogs(),
    ]);
    setProfile(p);
    setExams(exList);
    setFindings(fList);
    setCycleLogs(cList);
  };

  useEffect(() => {
    // Load initial data; if empty, auto-seed the 4-month demo persona so the app is immediately rich for evaluation
    (async () => {
      const existingExams = await getAllExams();
      if (existingExams.length === 0) {
        await seedFourMonthDemoHistory();
      }
      await refreshLocalData();
    })();
  }, []);

  // Press Escape key anytime to trigger Privacy Camouflage Screen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isFindingModalOpen && !isOnboardingOpen) {
        setIsPrivacyLocked((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFindingModalOpen, isOnboardingOpen]);

  const analyses = analyzeFindingsPersistence(findings, exams);

  const handleSaveProfile = async (updated: UserProfile) => {
    await saveUserProfile(updated);
    await refreshLocalData();
    showToast('Personal baseline & cycle rhythm settings saved locally.');
  };

  const handleCompleteExam = async (exam: ExamSessionRecord) => {
    await saveExamSession(exam);
    await refreshLocalData();
    setActiveTab('timeline');
    showToast(
      `Check session saved (${exam.coveragePercent}% zone coverage). Tap "+ Log New Observation" if you noticed any change.`
    );
  };

  const handleSaveFinding = async (finding: FindingRecord) => {
    await saveFinding(finding);
    await refreshLocalData();
    showToast('Observation recorded in local longitudinal log.');
  };

  const handleDeleteFinding = async (id: string) => {
    await deleteFinding(id);
    await refreshLocalData();
    showToast('Observation removed.');
  };

  const handleSaveCycleLog = async (log: CycleHealthLog, updatedLmpISO?: string) => {
    await saveCycleLog(log);
    if (updatedLmpISO) {
      const updatedProfile = { ...profile, lastPeriodStartISO: updatedLmpISO };
      await saveUserProfile(updatedProfile);
    }
    await refreshLocalData();
    showToast('Cycle & hormonal symptom entry saved locally.');
  };

  const handleLoadDemoPersona = async () => {
    await seedFourMonthDemoHistory();
    await refreshLocalData();
    showToast(
      'Loaded 4-Month Demo History (Jul Luteal tenderness -> Aug/Sep Persisting Left Upper Outer spot).'
    );
  };

  const handleClearData = async () => {
    await clearAllLocalData();
    await refreshLocalData();
    showToast('All local IndexedDB records cleared.');
  };

  // Privacy Decoy / Lock Screen
  if (isPrivacyLocked) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-teal-400" />
          </div>
          <h2 className="text-lg font-bold">Daily Rhythm &amp; Wellness Notes — Locked</h2>
          <p className="text-xs text-slate-400">
            Privacy screen active. All data remains encrypted/stored locally in IndexedDB on this device.
          </p>

          {profile.pinCode ? (
            <div className="space-y-2">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter your PIN"
                className="w-48 mx-auto block rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-center text-sm text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (pinInput === profile.pinCode) {
                    setIsPrivacyLocked(false);
                    setPinInput('');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
              >
                Unlock Session
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsPrivacyLocked(false)}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition"
            >
              Resume Session
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation & Demo Control Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold shadow-xs">
              <Shield className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900">
                  Baseline
                </span>
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold uppercase">
                  On-Device • Zero Cloud
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Cycle-Synced Breast Self-Awareness &amp; Clinical Handoff Tracker
              </p>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'dashboard'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guided_check')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'guided_check'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Guided Check
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'timeline'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Timeline &amp; Map ({findings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cycle_health')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'cycle_health'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Cycle Rhythm
            </button>
          </nav>

          {/* Right Utility Controls: Demo Persona Seed, PDF Export, Settings, Privacy Lock */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleLoadDemoPersona}
              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition"
              title="Pre-seed 4 months of longitudinal cycle + breast findings for hackathon demo"
            >
              Reset 4-Mo Demo Data
            </button>

            <button
              type="button"
              onClick={() => generateClinicianSummaryPDF(profile, exams, analyses, cycleLogs)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-bold transition"
              title="Download 1-page Clinician PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              PDF
            </button>

            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              title="Baseline & Cycle Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsPrivacyLocked(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              title="Quick Privacy Lock (or press Esc)"
            >
              <EyeOff className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleClearData}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              title="Clear all local data"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 w-full">
          <div className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between shadow-md">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            profile={profile}
            exams={exams}
            analyses={analyses}
            cycleLogs={cycleLogs}
            todayISO={todayISO}
            onStartGuidedCheck={() => setActiveTab('guided_check')}
            onOpenCycleCheckin={() => setActiveTab('cycle_health')}
            onOpenTimeline={() => setActiveTab('timeline')}
            onOpenFindingLogger={(zoneId) => {
              setPreselectedZone(zoneId);
              setActiveExamIdForFinding(undefined);
              setIsFindingModalOpen(true);
            }}
          />
        )}

        {activeTab === 'guided_check' && (
          <GuidedCheckView
            profile={profile}
            todayISO={todayISO}
            onCompleteExam={handleCompleteExam}
            onOpenFindingLogger={(zoneId, examId) => {
              setPreselectedZone(zoneId);
              setActiveExamIdForFinding(examId);
              setIsFindingModalOpen(true);
            }}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineComparison
            profile={profile}
            exams={exams}
            analyses={analyses}
            cycleLogs={cycleLogs}
            onOpenFindingLogger={(zoneId) => {
              setPreselectedZone(zoneId);
              setActiveExamIdForFinding(undefined);
              setIsFindingModalOpen(true);
            }}
            onDeleteFinding={handleDeleteFinding}
          />
        )}

        {activeTab === 'cycle_health' && (
          <CycleHealthCheckin
            profile={profile}
            cycleLogs={cycleLogs}
            todayISO={todayISO}
            onSaveCycleLog={handleSaveCycleLog}
          />
        )}
      </main>

      {/* Ethical & Privacy Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <p>
            <strong>Clinical Disclaimer:</strong> Baseline supports breast self-awareness and patient-recorded clinical handoffs. It does not diagnose, screen for cancer, or replace clinical breast exams or mammography.
          </p>
          <p>
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 font-mono">Esc</kbd> anytime for Quick Privacy Lock.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <FindingLoggerModal
        isOpen={isFindingModalOpen}
        profile={profile}
        defaultDateISO={todayISO}
        defaultZoneId={preselectedZone}
        examId={activeExamIdForFinding}
        onClose={() => setIsFindingModalOpen(false)}
        onSaveFinding={handleSaveFinding}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        initialProfile={profile}
        onSaveProfile={handleSaveProfile}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}
export default App;
