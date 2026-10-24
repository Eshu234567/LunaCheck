import React from 'react';
import {
  AnatomicalZoneId,
  CycleHealthLog,
  ExamSessionRecord,
  FINDING_TYPE_LABELS,
  PersistenceAnalysis,
  UserProfile,
} from '../types/schema';
import { evaluateCycleAtDate, getPhaseBadgeStyle } from '../services/cycleEngine';
import { getZoneShortLabel } from '../services/persistenceEngine';
import { generateClinicianSummaryPDF } from '../services/pdfGenerator';
import {
  Sparkles,
  Calendar,
  Shield,
  FileDown,
  Activity,
  AlertCircle,
  ArrowRight,
  Stethoscope,
  Clock,
} from 'lucide-react';

interface DashboardProps {
  profile: UserProfile;
  exams: ExamSessionRecord[];
  analyses: PersistenceAnalysis[];
  cycleLogs: CycleHealthLog[];
  todayISO: string;
  onStartGuidedCheck: () => void;
  onOpenCycleCheckin: () => void;
  onOpenTimeline: () => void;
  onOpenFindingLogger: (zoneId?: AnatomicalZoneId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  exams,
  analyses,
  cycleLogs,
  todayISO,
  onStartGuidedCheck,
  onOpenCycleCheckin,
  onOpenTimeline,
  onOpenFindingLogger,
}) => {
  const cycleInfo = evaluateCycleAtDate(profile, todayISO);
  const badge = getPhaseBadgeStyle(cycleInfo.phase);

  const persistingItems = analyses.filter(
    (a) => a.status === 'persisting_across_cycle' || a.status === 'red_flag_clinical_priority'
  );
  const lutealRecheckItems = analyses.filter(
    (a) => a.status === 'luteal_phase_observation_recheck_scheduled'
  );

  const lastExam = exams[0];

  return (
    <div className="space-y-6">
      {/* Hero Banner: Cycle-Synced Breast Self-Awareness Window */}
      <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-400/20 text-teal-200 border border-teal-400/30">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                {cycleInfo.phaseTitle}
              </span>
              {cycleInfo.isOptimalCheckWindow && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-400 text-slate-950">
                  ★ Optimal Post-Period Check Window Open Now
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Know What&apos;s Normal for You—Synced to Your Body&apos;s Rhythm
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 leading-relaxed">
              {cycleInfo.recommendationBanner}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onStartGuidedCheck}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs sm:text-sm shadow-sm transition"
            >
              Start Guided Self-Awareness Check
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => generateClinicianSummaryPDF(profile, exams, analyses, cycleLogs)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition"
            >
              <FileDown className="w-4 h-4" />
              Export 1-Page Clinician PDF
            </button>
          </div>
        </div>

        {/* 3 Core Pillars Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/15 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="font-bold text-teal-300">1. Complete Zone Coverage</p>
            <p className="text-slate-300 mt-0.5">
              Voice + on-device MediaPipe avatar guides you across all 4 breast quadrants, Tail of Spence, underarm, and collarbone.
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="font-bold text-teal-300">2. Cycle-Aware Longitudinal Memory</p>
            <p className="text-slate-300 mt-0.5">
              Distinguishes luteal-phase hormone fullness from changes that persist across your post-period baseline window.
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="font-bold text-teal-300">3. Private By Design</p>
            <p className="text-slate-300 mt-0.5">
              Zero camera images or video ever displayed or stored. Everything stays in local IndexedDB on your device.
            </p>
          </div>
        </div>
      </div>

      {/* Priority Persistence Nudges or Luteal Re-Check Cards */}
      {(persistingItems.length > 0 || lutealRecheckItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {persistingItems.length > 0 && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-200 text-rose-900">
                  Persisting Across Cycle — Worth Discussing with a Doctor
                </span>
                <h3 className="text-sm font-bold text-rose-950">
                  {persistingItems.length} Observation{persistingItems.length > 1 ? 's' : ''} Recorded Across Consecutive Checks
                </h3>
                <p className="text-xs text-rose-900 leading-relaxed">
                  <strong>{getZoneShortLabel(persistingItems[0].finding.zoneId)}</strong> ({FINDING_TYPE_LABELS[persistingItems[0].finding.symptomType].label}) has been noted across {persistingItems[0].consecutiveMonths} checks, including during your post-period baseline window.
                </p>
                <div className="pt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onOpenTimeline}
                    className="text-xs font-bold text-rose-800 hover:underline"
                  >
                    Review on Body Map Timeline &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => generateClinicianSummaryPDF(profile, exams, analyses, cycleLogs)}
                    className="text-xs font-bold text-teal-800 hover:underline ml-2"
                  >
                    Download Clinician Summary PDF &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {lutealRecheckItems.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-950">
                  Cycle-Aware Follow-Up Reminder
                </span>
                <h3 className="text-sm font-bold text-amber-950">
                  Targeted Baseline Re-Check Scheduled
                </h3>
                <p className="text-xs text-amber-900 leading-relaxed">
                  You logged <strong>{getZoneShortLabel(lutealRecheckItems[0].finding.zoneId)}</strong> during your luteal phase when progesterone elevates fullness. Re-check this zone during your post-period window ({cycleInfo.optimalWindowStartISO}).
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3-Card Summary Row: Hormonal Tissue Context, Recent Coverage, Clinical Screening Guidelines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Current Hormone & Breast Tissue State */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                Hormone &amp; Tissue State
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {cycleInfo.currentCycleDay ? `Day ${cycleInfo.currentCycleDay}` : 'Steady Mode'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              {cycleInfo.phaseTitle}
            </h3>
            <p className="text-xs text-slate-600 mb-2 leading-relaxed">
              <strong>Physiology:</strong> {cycleInfo.hormonalSummary}
            </p>
            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
              <strong>What to expect in breast tissue:</strong> {cycleInfo.breastTissueState}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCycleCheckin}
            className="mt-4 w-full py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-800 transition"
          >
            Log Period Start or Hormonal Symptoms &rarr;
          </button>
        </div>

        {/* Card 2: Recent Check Coverage & Observations */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Longitudinal Record
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {exams.length} checks logged
              </span>
            </div>

            {lastExam ? (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-950">Last Check: {lastExam.dateISO}</span>
                    <span className="font-bold text-teal-800">{lastExam.coveragePercent}% Coverage</span>
                  </div>
                  <p className="text-[11px] text-teal-900 mt-1">
                    Performed on Cycle Day {lastExam.cycleDay ?? '-'} ({lastExam.cyclePhase.replace('_', ' ')}).
                  </p>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    <strong>Personal Baseline Note:</strong> &ldquo;{profile.personalBaselineNote}&rdquo;
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No check sessions recorded yet. Start your first guided check or load the 4-month demo persona above.
              </p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onOpenTimeline}
              className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-800 transition"
            >
              View Monthly Timeline
            </button>
            <button
              type="button"
              onClick={() => onOpenFindingLogger()}
              className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold transition"
            >
              + Quick Log
            </button>
          </div>
        </div>

        {/* Card 3: Clinical Screening & Ethical Framing */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4" />
                Clinical Screening Guidance
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Age: {profile.ageRange}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              Self-Awareness + Clinical Screening
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Major guidelines (ACS, USPSTF) emphasize <strong>breast self-awareness</strong>—knowing how your breasts normally look and feel and reporting changes promptly—alongside routine clinical screening:
            </p>

            <ul className="text-xs text-slate-700 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <li>
                • <strong>Ages 40–74 (USPSTF / ACS):</strong> Biennial or annual screening mammography is recommended.
              </li>
              <li>
                • <strong>Ages 18–39:</strong> Know your personal baseline, discuss family history risk assessment with a clinician, and report any persistent change.
              </li>
            </ul>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
            <Shield className="w-4 h-4 text-teal-700 shrink-0" />
            <span>
              Baseline never displays &ldquo;all clear&rdquo;—always consult a clinician for any concerning change.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
