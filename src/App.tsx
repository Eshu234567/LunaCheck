import React, { useState, useEffect } from 'react';
import { ActiveScreen, BodyZone, CycleProfile, Observation, RoutineSessionRecord, UserProfile } from './types';
import { storageService } from './services/storage';
import { audioService } from './services/audioService';
import { Header } from './components/Header';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { RoutineSession } from './components/RoutineSession';
import { BodyMapView } from './components/BodyMapView';
import { TimelineView } from './components/TimelineView';
import { FindingModal } from './components/FindingModal';
import { PdfExportModal } from './components/PdfExportModal';
import { RoutineVideoModal } from './components/RoutineVideoModal';
import pinkRibbonImg from './assets/pink-ribbon.png';

export const App: React.FC = () => {
  // Start on the Landing Page for the complete user journey: Landing -> Dashboard -> Options
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('landing');
  const [user, setUser] = useState<UserProfile>(storageService.getUserProfile());
  const [cycle, setCycle] = useState<CycleProfile>(storageService.getCycleProfile());
  const [observations, setObservations] = useState<Observation[]>(storageService.getObservations());
  const [routines, setRoutines] = useState<RoutineSessionRecord[]>(storageService.getRoutines());
  const [isMuted, setIsMuted] = useState<boolean>(audioService.getIsMuted());

  // Modal states
  const [selectedZoneForModal, setSelectedZoneForModal] = useState<BodyZone | null>(null);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isRoutineVideoOpen, setIsRoutineVideoOpen] = useState(false);

  // Compute current cycle day
  const today = new Date();
  const lastPeriod = new Date(cycle.lastPeriodDate);
  const diffTime = today.getTime() - lastPeriod.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentCycleDay = diffDays >= 0 ? (diffDays % cycle.cycleLengthDays) + 1 : 1;

  // Stop all voice narration immediately when navigating to any different screen
  useEffect(() => {
    audioService.stopAll();
  }, [activeScreen]);

  // Handlers
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioService.setMuted(next);
  };

  const handleUpdateCycle = (updated: CycleProfile) => {
    setCycle(updated);
    storageService.saveCycleProfile(updated);
  };

  const [findingCallback, setFindingCallback] = useState<(() => void) | null>(null);

  const handleSaveObservation = (data: Omit<Observation, 'id' | 'persistenceStatus' | 'consecutiveCyclesCount'>) => {
    storageService.computeObservationPersistence(data);
    setObservations(storageService.getObservations());
    setIsFindingModalOpen(false);
    setSelectedZoneForModal(null);
    if (findingCallback) {
      findingCallback();
      setFindingCallback(null);
    }
  };

  const handleFinishRoutine = (newRecord: RoutineSessionRecord) => {
    const updated = [newRecord, ...routines];
    setRoutines(updated);
    storageService.saveRoutines(updated);
  };

  const handleExportBackup = () => {
    const jsonStr = storageService.exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Aura-Health-Backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    if (window.confirm('Clear all app data and reset to a clean baseline?')) {
      storageService.resetToDefault();
      setUser(storageService.getUserProfile());
      setCycle(storageService.getCycleProfile());
      setObservations(storageService.getObservations());
      setRoutines(storageService.getRoutines());
    }
  };

  const openFindingModalForZone = (zone: BodyZone, onSaved?: () => void) => {
    setSelectedZoneForModal(zone);
    setFindingCallback(() => onSaved || null);
    setIsFindingModalOpen(true);
  };

  // If on Landing Page, render the dedicated Landing Page view
  if (activeScreen === 'landing') {
    return <LandingPage onEnterPortal={() => setActiveScreen('dashboard')} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* 1. Clinical Disclaimer Banner */}
      <DisclaimerBanner />

      {/* 2. Top Navigation Header */}
      <Header
        activeScreen={activeScreen}
        onNavigate={(screen) => setActiveScreen(screen)}
        onExportBackup={handleExportBackup}
        onResetData={handleResetData}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* 3. Screen Body */}
      <main className="flex-1 pb-16">
        {activeScreen === 'dashboard' && (
          <Dashboard
            user={user}
            cycle={cycle}
            observations={observations}
            routines={routines}
            onStartRoutine={() => setActiveScreen('routine')}
            onOpenBodyMap={() => setActiveScreen('bodymap')}
            onOpenTimeline={() => setActiveScreen('timeline')}
            onOpenReport={() => setIsPdfModalOpen(true)}
            onUpdateCycle={handleUpdateCycle}
          />
        )}

        {activeScreen === 'routine' && (
          <RoutineSession
            currentCycleDay={currentCycleDay}
            onFinishRoutine={handleFinishRoutine}
            onOpenFindingModal={openFindingModalForZone}
            onExit={() => setActiveScreen('dashboard')}
            onOpenVideoDemo={() => setIsRoutineVideoOpen(true)}
          />
        )}

        {activeScreen === 'bodymap' && (
          <BodyMapView
            observations={observations}
            onOpenFindingModal={openFindingModalForZone}
          />
        )}

        {activeScreen === 'timeline' && (
          <TimelineView
            observations={observations}
            routines={routines}
            onExportPDF={() => setIsPdfModalOpen(true)}
            onSelectZoneToLog={() => setActiveScreen('bodymap')}
          />
        )}

        {activeScreen === 'report' && (
          <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="glass-panel-peach rounded-3xl p-6 sm:p-10 border border-orange-200 text-center max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto p-3 shadow-sm">
                <img src={pinkRibbonImg} alt="Ribbon" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-xl font-black text-rose-950">Generate Clinician Consultation PDF</h2>
              <p className="text-xs text-rose-900/70 leading-relaxed font-medium">
                Click below to open the complete 1-page clinician document preview. Ready for your annual checkup or doctor consultation.
              </p>
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 text-white font-extrabold text-xs shadow-md shadow-rose-500/25 transition-all"
              >
                Open Clinician PDF Generator
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 4. Footer */}
      <footer className="border-t border-rose-100 bg-white/80 py-6 px-4 text-center text-xs text-rose-900/50 space-y-2">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-medium">
          <div className="flex items-center gap-2 text-rose-800">
            <img src={pinkRibbonImg} alt="Ribbon" className="w-3.5 h-3.5 object-contain" />
            <span>Sally — Breast Self-Awareness Companion</span>
          </div>
          <div className="text-rose-700/60">
            Aligned with ACS, USPSTF & ACOG Breast Health Guidelines
          </div>
          <div className="text-rose-600 font-bold">
            100% On-Device • Encrypted Local Storage
          </div>
        </div>
        <p className="max-w-3xl mx-auto text-[10px] text-rose-800/40 leading-relaxed pt-1">
          Notice: This software is designed for patient baseline self-tracking and consultation support only. It does not provide medical screening, diagnostic conclusions, or pathology reassurance.
        </p>
      </footer>

      {/* 5. Modals */}
      <FindingModal
        zone={selectedZoneForModal}
        currentCycleDay={currentCycleDay}
        isOpen={isFindingModalOpen}
        onClose={() => {
          setIsFindingModalOpen(false);
          setSelectedZoneForModal(null);
          setFindingCallback(null);
        }}
        onSaveObservation={handleSaveObservation}
      />

      <PdfExportModal
        user={user}
        cycle={cycle}
        observations={observations}
        routines={routines}
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
      />

      <RoutineVideoModal
        isOpen={isRoutineVideoOpen}
        onProceed={() => {
          setIsRoutineVideoOpen(false);
          setActiveScreen('routine');
        }}
        onClose={() => setIsRoutineVideoOpen(false)}
      />
    </div>
  );
};

export default App;
