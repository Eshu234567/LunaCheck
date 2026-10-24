import React, { useState } from 'react';
import {
  CycleHealthLog,
  SystemicSymptom,
  SYSTEMIC_SYMPTOM_LABELS,
  UserProfile,
} from '../types/schema';
import { evaluateCycleAtDate, getPhaseBadgeStyle } from '../services/cycleEngine';
import { Calendar, HeartPulse, Check, Info } from 'lucide-react';

interface CycleHealthCheckinProps {
  profile: UserProfile;
  cycleLogs: CycleHealthLog[];
  todayISO: string;
  onSaveCycleLog: (log: CycleHealthLog, updatedLastPeriodISO?: string) => void;
}

export const CycleHealthCheckin: React.FC<CycleHealthCheckinProps> = ({
  profile,
  cycleLogs,
  todayISO,
  onSaveCycleLog,
}) => {
  const [dateISO, setDateISO] = useState<string>(todayISO);
  const [isPeriodStart, setIsPeriodStart] = useState<boolean>(false);
  const [flowIntensity, setFlowIntensity] = useState<'none' | 'spotting' | 'light' | 'medium' | 'heavy'>('none');
  const [selectedSymptoms, setSelectedSymptoms] = useState<SystemicSymptom[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [savedBanner, setSavedBanner] = useState<boolean>(false);

  const cycleInfo = evaluateCycleAtDate(profile, dateISO);
  const badge = getPhaseBadgeStyle(cycleInfo.phase);

  const toggleSymptom = (sym: SystemicSymptom) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: CycleHealthLog = {
      id: `cyc-${Date.now()}`,
      dateISO,
      isPeriodStart,
      flowIntensity: isPeriodStart && flowIntensity === 'none' ? 'medium' : flowIntensity,
      systemicSymptoms: selectedSymptoms,
      notes: notes.trim() || undefined,
    };

    const newLmp = isPeriodStart && dateISO >= profile.lastPeriodStartISO ? dateISO : undefined;
    onSaveCycleLog(newLog, newLmp);
    setSelectedSymptoms([]);
    setNotes('');
    setIsPeriodStart(false);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3500);
  };

  // Visual 28-day (or custom length) Hormone & Breast Tissue Baseline Bar
  const totalDays = profile.typicalCycleLength || 28;
  const periodDays = profile.typicalPeriodLength || 5;
  const optStart = periodDays + 2;
  const optEnd = Math.min(periodDays + 7, 13);

  return (
    <div className="space-y-6">
      {/* Top Educational Card: Why Menstrual Health Tracking Matters for Breast Self-Awareness */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700">
              <HeartPulse className="w-4 h-4" />
              Health-First Menstrual &amp; Hormone Rhythm Tracker (Zero Fertility Framing)
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              How Your Hormonal Cycle Shapes Your Breast Baseline
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Unlike fertility trackers built around ovulation and pregnancy, this module tracks your cycle strictly as a <strong>physiological baseline clock</strong>. Estrogen and progesterone shifts directly affect ductal fluid and fibrocystic nodularity—knowing your cycle day helps distinguish temporary luteal fullness from persistent changes.
            </p>
          </div>

          <div className={`px-3.5 py-2 rounded-xl border text-xs font-bold ${badge.bg} ${badge.text} ${badge.border}`}>
            {cycleInfo.phaseTitle}
          </div>
        </div>

        {/* Interactive Cycle Day Strip */}
        {profile.trackingMode !== 'non_cycling_anchor' && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span>
                <strong>Current Cycle Day:</strong> Day {cycleInfo.currentCycleDay} of {totalDays}
              </span>
              <span className="text-teal-800 font-semibold">
                Optimal Breast Baseline Check Window: Days {optStart}–{optEnd} ({cycleInfo.optimalWindowStartISO} to {cycleInfo.optimalWindowEndISO})
              </span>
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-14 md:grid-cols-28 gap-1">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                const isToday = d === cycleInfo.currentCycleDay;
                const isMenses = d <= periodDays;
                const isOptimal = d >= optStart && d <= optEnd;
                const isLuteal = d >= 17;

                let cellStyle = 'bg-sky-50 text-sky-900 border-sky-200';
                if (isMenses) cellStyle = 'bg-rose-50 text-rose-900 border-rose-200';
                if (isOptimal) cellStyle = 'bg-teal-100 text-teal-950 border-teal-400 font-bold';
                if (isLuteal) cellStyle = 'bg-amber-50 text-amber-900 border-amber-200';

                return (
                  <div
                    key={d}
                    className={`h-9 rounded-lg border flex flex-col items-center justify-center text-[10px] relative ${cellStyle} ${
                      isToday ? 'ring-2 ring-slate-900 scale-105 z-10' : ''
                    }`}
                    title={
                      isOptimal
                        ? `Day ${d}: Optimal Follicular Baseline Window`
                        : isMenses
                        ? `Day ${d}: Menstrual Phase`
                        : isLuteal
                        ? `Day ${d}: Luteal Phase (Progesterone Dominant)`
                        : `Day ${d}: Mid-Cycle Transition`
                    }
                  >
                    <span>{d}</span>
                    {isOptimal && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />
                Days 1–{periodDays}: Menstruation (Hormones Resetting)
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-teal-900">
                <span className="w-3 h-3 rounded bg-teal-200 border border-teal-500" />
                Days {optStart}–{optEnd}: Optimal Baseline Check Window (Softest Tissue)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-sky-100 border border-sky-300" />
                Days {optEnd + 1}–16: Mid-Cycle Transition
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                Days 17–{totalDays}: Luteal Phase (High Progesterone / Cyclical Tenderness Common)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Log Form + Historical Cycle Health Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Log Period Start or Hormonal Health Symptoms
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Logging when your period starts automatically recalibrates your next optimal post-period breast self-awareness window.
          </p>

          {savedBanner && (
            <div className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-teal-700" />
              Health log saved locally and optimal check window updated!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={dateISO}
                  onChange={(e) => setDateISO(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Menstrual Flow Intensity
                </label>
                <select
                  value={flowIntensity}
                  onChange={(e) => {
                    const val = e.target.value as 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
                    setFlowIntensity(val);
                    if (val !== 'none' && val !== 'spotting') {
                      setIsPeriodStart(true);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900"
                >
                  <option value="none">No Bleeding Today</option>
                  <option value="spotting">Spotting</option>
                  <option value="light">Light Flow</option>
                  <option value="medium">Medium Flow</option>
                  <option value="heavy">Heavy Flow</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50/70 border border-rose-200 cursor-pointer text-xs text-rose-950 font-medium">
              <input
                type="checkbox"
                checked={isPeriodStart}
                onChange={(e) => setIsPeriodStart(e.target.checked)}
                className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
              />
              <span>
                <strong>Mark as Day 1 of a New Period</strong> (re-anchors your post-period breast check window to 7–12 days from this date)
              </span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Systemic &amp; Breast Hormone Symptoms (Select any that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(SYSTEMIC_SYMPTOM_LABELS) as SystemicSymptom[]).map((symKey) => {
                  const active = selectedSymptoms.includes(symKey);
                  return (
                    <button
                      key={symKey}
                      type="button"
                      onClick={() => toggleSymptom(symKey)}
                      className={`px-3 py-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition ${
                        active
                          ? 'bg-teal-50 border-teal-600 text-teal-950 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{SYSTEMIC_SYMPTOM_LABELS[symKey]}</span>
                      {active && <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Health Note (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Bilateral breast soreness started 4 days before period."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-sm transition"
            >
              Save Cycle &amp; Symptom Entry
            </button>
          </form>
        </div>

        {/* Right Side: Historical Cycle & Cyclical Mastalgia Correlation List */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Recorded Cycle Starts &amp; Hormonal Symptom History
            </h3>
            <span className="text-xs text-slate-500">{cycleLogs.length} entries</span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {cycleLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Calendar className="w-3.5 h-3.5 text-teal-700" />
                    {log.dateISO}
                  </span>
                  {log.isPeriodStart && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                      Period Day 1 ({log.flowIntensity ?? 'medium'} flow)
                    </span>
                  )}
                </div>

                {log.systemicSymptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {log.systemicSymptoms.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700 font-medium"
                      >
                        {SYSTEMIC_SYMPTOM_LABELS[s]}
                      </span>
                    ))}
                  </div>
                )}

                {log.notes && <p className="text-xs text-slate-600 italic">&ldquo;{log.notes}&rdquo;</p>}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-100 text-[11px] text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <strong>Clinical Handoff Integration:</strong> Your recorded period start dates and cyclical breast tenderness logs are automatically included in your one-page Clinician PDF so your doctor can evaluate whether observations correlate with your luteal phase.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
