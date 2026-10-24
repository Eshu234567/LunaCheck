import React, { useState } from 'react';
import {
  AnatomicalZoneId,
  ANATOMICAL_ZONES,
  FindingRecord,
  FindingType,
  FINDING_TYPE_LABELS,
  UserProfile,
} from '../types/schema';
import { evaluateCycleAtDate, getPhaseBadgeStyle } from '../services/cycleEngine';
import { AlertCircle, X, Check } from 'lucide-react';

interface FindingLoggerModalProps {
  isOpen: boolean;
  profile: UserProfile;
  defaultDateISO: string;
  defaultZoneId?: AnatomicalZoneId;
  examId?: string;
  onClose: () => void;
  onSaveFinding: (finding: FindingRecord) => void;
}

export const FindingLoggerModal: React.FC<FindingLoggerModalProps> = ({
  isOpen,
  profile,
  defaultDateISO,
  defaultZoneId = 'left_upper_outer',
  examId,
  onClose,
  onSaveFinding,
}) => {
  const [dateISO, setDateISO] = useState<string>(defaultDateISO);
  const [zoneId, setZoneId] = useState<AnatomicalZoneId>(defaultZoneId);
  const [symptomType, setSymptomType] = useState<FindingType>('lump');
  const [clockHour, setClockHour] = useState<number>(2);
  const [isBilateral, setIsBilateral] = useState<boolean>(false);
  const [userNote, setUserNote] = useState<string>('');

  if (!isOpen) return null;

  const selectedZoneMeta = ANATOMICAL_ZONES.find((z) => z.id === zoneId) ?? ANATOMICAL_ZONES[8];
  const cycleInfo = evaluateCycleAtDate(profile, dateISO);
  const phaseBadge = getPhaseBadgeStyle(cycleInfo.phase);
  const typeMeta = FINDING_TYPE_LABELS[symptomType];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const record: FindingRecord = {
      id: `find-${Date.now()}`,
      examId: examId ?? `exam-${dateISO}`,
      dateISO,
      side: selectedZoneMeta.side,
      zoneId,
      clockHour,
      symptomType,
      isBilateral,
      cycleDay: cycleInfo.currentCycleDay,
      cyclePhase: cycleInfo.phase,
      userNote: userNote.trim() || undefined,
    };
    onSaveFinding(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 my-8">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Patient Observation Log (Non-Diagnostic)
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Record a Breast or Underarm Observation
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Date & Auto-Calculated Cycle Timing Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observation Date
              </label>
              <input
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hormonal Cycle Context (Auto-Tagged)
              </label>
              <div
                className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between ${phaseBadge.bg} ${phaseBadge.text} ${phaseBadge.border}`}
              >
                <span>
                  {cycleInfo.currentCycleDay ? `Day ${cycleInfo.currentCycleDay} • ` : ''}
                  {phaseBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Cycle-Awareness Guidance Banner */}
          {cycleInfo.phase === 'luteal' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
              <strong>Luteal Phase Context (Day {cycleInfo.currentCycleDay}):</strong> Progesterone is elevated right now, which often causes temporary hormonal fullness or tenderness. We will record this and schedule a targeted re-check in your next <strong>Follicular Baseline Window ({cycleInfo.optimalWindowStartISO})</strong>.
            </div>
          )}

          {/* Anatomical Zone & Clock-Face Position */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Anatomical Zone
              </label>
              <select
                value={zoneId}
                onChange={(e) => {
                  const nextId = e.target.value as AnatomicalZoneId;
                  setZoneId(nextId);
                  const meta = ANATOMICAL_ZONES.find((z) => z.id === nextId);
                  if (meta) setClockHour(meta.defaultClockHour);
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <optgroup label="Anatomical Right Side">
                  {ANATOMICAL_ZONES.filter((z) => z.side === 'right').map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Anatomical Left Side">
                  {ANATOMICAL_ZONES.filter((z) => z.side === 'left').map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clock-Face Position
              </label>
              <select
                value={clockHour}
                onChange={(e) => setClockHour(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                  <option key={h} value={h}>
                    {h} o&apos;clock
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Symptom Type Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              What Did You Notice?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(FINDING_TYPE_LABELS) as FindingType[]).map((tKey) => {
                const info = FINDING_TYPE_LABELS[tKey];
                const active = symptomType === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setSymptomType(tKey)}
                    className={`text-left p-2.5 rounded-xl border transition ${
                      active
                        ? 'bg-teal-50 border-teal-600 ring-1 ring-teal-600'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{info.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-teal-700" />}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      {info.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rule-Based Clinical Nudge for Immediate Red-Flag Symptom Types */}
          {typeMeta.isImmediateFlag && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Clinical Guidance Nudge:</strong> Skin changes (such as dimpling, puckering, or redness) or new nipple changes (inversion or discharge) are always worth discussing promptly with a healthcare professional, regardless of where you are in your menstrual cycle.
              </div>
            </div>
          )}

          {/* Bilateral Symmetry Check */}
          <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={isBilateral}
              onChange={(e) => setIsBilateral(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>
              <strong>Felt symmetrically on both sides?</strong> (Cyclical hormonal fullness often feels similar in both upper outer breasts)
            </span>
          </label>

          {/* Optional Personal Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Personal Note for Your Records / Clinician (Optional)
            </label>
            <textarea
              rows={2}
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="e.g., Pea-sized firm spot about 3cm from nipple; movable; no skin change."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-sm"
            >
              Save Observation to Local Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
