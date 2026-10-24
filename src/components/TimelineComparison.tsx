import React, { useState } from 'react';
import {
  AnatomicalZoneId,
  CycleHealthLog,
  ExamSessionRecord,
  FINDING_TYPE_LABELS,
  PersistenceAnalysis,
  UserProfile,
} from '../types/schema';
import { AvatarBodyMap } from './AvatarBodyMap';
import { getZoneLabel } from '../services/persistenceEngine';
import { getPhaseBadgeStyle } from '../services/cycleEngine';
import { generateClinicianSummaryPDF } from '../services/pdfGenerator';
import {
  FileDown,
  AlertCircle,
  Clock,
  CheckCircle,
  PlusCircle,
  Trash2,
  Calendar,
} from 'lucide-react';

interface TimelineComparisonProps {
  profile: UserProfile;
  exams: ExamSessionRecord[];
  analyses: PersistenceAnalysis[];
  cycleLogs: CycleHealthLog[];
  onOpenFindingLogger: (zoneId?: AnatomicalZoneId) => void;
  onDeleteFinding: (findingId: string) => void;
}

export const TimelineComparison: React.FC<TimelineComparisonProps> = ({
  profile,
  exams,
  analyses,
  cycleLogs,
  onOpenFindingLogger,
  onDeleteFinding,
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<AnatomicalZoneId | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const months = Array.from(new Set(analyses.map((a) => a.finding.dateISO.slice(0, 7))));

  const filteredAnalyses = analyses.filter((item) => {
    const matchesMonth = filterMonth === 'all' || item.finding.dateISO.startsWith(filterMonth);
    const matchesZone = !selectedZoneId || item.finding.zoneId === selectedZoneId;
    return matchesMonth && matchesZone;
  });

  const persistingCount = analyses.filter(
    (a) => a.status === 'persisting_across_cycle' || a.status === 'red_flag_clinical_priority'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Action Banner: Longitudinal Summary & One-Page Clinician PDF Export */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
            Longitudinal Memory &amp; Clinical Handoff
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            Monthly Body Map Timeline &amp; Persistence Tracker
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Answers <em>&ldquo;Was that spot there last month, and what phase of my cycle was I in?&rdquo;</em> Observations are labeled factually (<strong className="text-rose-700">Persisting across checks</strong>, <strong className="text-amber-700">Logged in luteal phase</strong>, or <strong className="text-teal-800">Not noted in subsequent check</strong>)—never as a diagnosis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onOpenFindingLogger(selectedZoneId ?? undefined)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-teal-600 text-teal-800 hover:bg-teal-50 text-xs font-bold transition"
          >
            <PlusCircle className="w-4 h-4" />
            + Log New Observation
          </button>

          <button
            type="button"
            onClick={() => generateClinicianSummaryPDF(profile, exams, analyses, cycleLogs)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-sm transition"
          >
            <FileDown className="w-4 h-4" />
            Export 1-Page Clinician PDF
          </button>
        </div>
      </div>

      {/* Main Content Grid: Interactive Pin Map + Longitudinal Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Body Map with Numbered Observation Pins */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Interactive Observation Map
            </h3>
            {selectedZoneId && (
              <button
                type="button"
                onClick={() => setSelectedZoneId(null)}
                className="text-xs text-teal-700 hover:underline font-semibold"
              >
                Show All Zones
              </button>
            )}
          </div>

          <AvatarBodyMap
            mode="findings"
            selectedZoneId={selectedZoneId}
            findingsAnalyses={filteredAnalyses}
            onZoneSelect={(zId) =>
              setSelectedZoneId((prev) => (prev === zId ? null : zId))
            }
          />

          {/* Pin Color Legend */}
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 inline-block" />
              <span className="font-semibold text-slate-800">
                Persisting (&ge;2 Checks) or Priority Symptom ({persistingCount})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" />
              <span className="text-slate-700">
                Logged in Luteal Phase — Scheduled for Post-Period Re-Check
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-600 inline-block" />
              <span className="text-slate-700">
                Not Noted in Subsequent Baseline Check / Single Entry
              </span>
            </div>
          </div>
        </div>

        {/* Right: Month Filter + Detailed Persistence Cards & Check Sessions */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-600">Filter by Month:</span>
              <button
                type="button"
                onClick={() => setFilterMonth('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filterMonth === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Months ({analyses.length})
              </button>
              {months.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFilterMonth(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    filterMonth === m
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {selectedZoneId && (
              <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-900">
                Zone: {getZoneLabel(selectedZoneId)}
              </span>
            )}
          </div>

          {/* Findings List */}
          {filteredAnalyses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No observations recorded for this filter.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Remember: Baseline never displays &ldquo;all clear&rdquo;—continue routine monthly self-awareness checks and age-appropriate clinical screening.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnalyses.map((item, idx) => {
                const f = item.finding;
                const phaseStyle = getPhaseBadgeStyle(f.cyclePhase);
                const isPriority =
                  item.status === 'persisting_across_cycle' ||
                  item.status === 'red_flag_clinical_priority';
                const isLuteal =
                  item.status === 'luteal_phase_observation_recheck_scheduled';

                return (
                  <div
                    key={f.id}
                    className={`rounded-2xl border p-5 bg-white shadow-xs transition ${
                      isPriority
                        ? 'border-rose-300 ring-1 ring-rose-200'
                        : isLuteal
                        ? 'border-amber-300'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-bold text-white flex items-center justify-center ${
                            isPriority
                              ? 'bg-rose-600'
                              : isLuteal
                              ? 'bg-amber-600'
                              : 'bg-teal-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {getZoneLabel(f.zoneId)}{' '}
                            {f.clockHour ? `(${f.clockHour} o'clock)` : ''}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Logged on <strong>{f.dateISO}</strong> •{' '}
                            {FINDING_TYPE_LABELS[f.symptomType].label}
                            {f.isBilateral ? ' • Bilateral' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${phaseStyle.bg} ${phaseStyle.text} ${phaseStyle.border}`}
                        >
                          {f.cycleDay ? `Cycle Day ${f.cycleDay} • ` : ''}
                          {phaseStyle.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteFinding(f.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete observation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Persistence Status Badge & Clinical Rationale */}
                    <div
                      className={`mt-2.5 p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                        isPriority
                          ? 'bg-rose-50 text-rose-950 border border-rose-200'
                          : isLuteal
                          ? 'bg-amber-50 text-amber-950 border border-amber-200'
                          : 'bg-teal-50/70 text-teal-950 border border-teal-200'
                      }`}
                    >
                      {isPriority ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : isLuteal ? (
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold">{item.badgeText}</p>
                        <p className="mt-0.5 leading-relaxed opacity-90">
                          {item.clinicalRationale}
                        </p>
                      </div>
                    </div>

                    {f.userNote && (
                      <p className="mt-2.5 text-xs text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 italic">
                        Patient Note: &ldquo;{f.userNote}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Recorded Check Sessions Coverage History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-700" />
              Completed Self-Awareness Check Sessions ({exams.length})
            </h3>
            <div className="space-y-2">
              {exams.map((ex) => {
                const pStyle = getPhaseBadgeStyle(ex.cyclePhase);
                return (
                  <div
                    key={ex.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{ex.dateISO}</span>
                      <span className="text-slate-500 ml-2">
                        ({ex.mode === 'camera_assisted' ? 'On-Device Camera Coverage' : 'Manual Guided Mode'})
                      </span>
                      {ex.notes && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{ex.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}
                      >
                        {ex.cycleDay ? `Day ${ex.cycleDay}` : pStyle.label}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 font-bold">
                        {ex.coveragePercent}% Zones Covered
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
