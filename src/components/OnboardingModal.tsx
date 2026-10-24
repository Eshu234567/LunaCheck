import React, { useState } from 'react';
import { UserProfile } from '../types/schema';
import { ShieldCheck, Lock, HeartPulse, CheckCircle2 } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  initialProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  initialProfile,
  onSaveProfile,
  onClose,
}) => {
  const [ageRange, setAgeRange] = useState<UserProfile['ageRange']>(initialProfile.ageRange);
  const [trackingMode, setTrackingMode] = useState<UserProfile['trackingMode']>(
    initialProfile.trackingMode
  );
  const [typicalCycleLength, setTypicalCycleLength] = useState<number>(
    initialProfile.typicalCycleLength
  );
  const [typicalPeriodLength, setTypicalPeriodLength] = useState<number>(
    initialProfile.typicalPeriodLength
  );
  const [lastPeriodStartISO, setLastPeriodStartISO] = useState<string>(
    initialProfile.lastPeriodStartISO
  );
  const [monthlyAnchorDay, setMonthlyAnchorDay] = useState<number>(
    initialProfile.monthlyAnchorDay
  );
  const [personalBaselineNote, setPersonalBaselineNote] = useState<string>(
    initialProfile.personalBaselineNote
  );
  const [pinCode, setPinCode] = useState<string>(initialProfile.pinCode || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ageRange,
      trackingMode,
      typicalCycleLength,
      typicalPeriodLength,
      lastPeriodStartISO,
      monthlyAnchorDay,
      personalBaselineNote,
      pinCode: pinCode.trim() || undefined,
      onboardingCompleted: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 my-8">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700">
              <ShieldCheck className="w-4 h-4" />
              100% On-Device Setup &amp; Personal Baseline
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              Personalize Your Breast &amp; Cycle Baseline
            </h2>
          </div>
          {initialProfile.onboardingCompleted && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Age Range & Rhythm Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Age Range (for Clinical Screening Reminders)
              </label>
              <select
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value as UserProfile['ageRange'])}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="18-29">18–29 years</option>
                <option value="30-39">30–39 years</option>
                <option value="40-49">40–49 years (Annual/Biennial Mammogram Window)</option>
                <option value="50-59">50–59 years (Routine Mammography Recommended)</option>
                <option value="60+">60+ years (Routine Mammography Recommended)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hormonal Cycle Rhythm Mode
              </label>
              <select
                value={trackingMode}
                onChange={(e) =>
                  setTrackingMode(e.target.value as UserProfile['trackingMode'])
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900"
              >
                <option value="cycling_regular">
                  Regular Menstrual Cycle (Post-Period Window)
                </option>
                <option value="cycling_irregular">
                  Irregular Cycle / PCOS (Adapts to Logged Period)
                </option>
                <option value="non_cycling_anchor">
                  Non-Cycling / Menopause / Hormonal IUD (Monthly Anchor Day)
                </option>
              </select>
            </div>
          </div>

          {/* Cycle Timing Parameters */}
          {trackingMode !== 'non_cycling_anchor' ? (
            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                <HeartPulse className="w-4 h-4 text-teal-700" />
                Cycle Timing Calibration (Used Only for Breast Tissue Baseline — Never Fertility)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Last Period Start Date (Day 1)
                  </label>
                  <input
                    type="date"
                    value={lastPeriodStartISO}
                    onChange={(e) => setLastPeriodStartISO(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Typical Cycle Length (Days)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={45}
                    value={typicalCycleLength}
                    onChange={(e) => setTypicalCycleLength(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Typical Period Length (Days)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={typicalPeriodLength}
                    onChange={(e) => setTypicalPeriodLength(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
                  />
                </div>
              </div>
              <p className="text-[11px] text-teal-900">
                We schedule your monthly check for <strong>Days {typicalPeriodLength + 2}–{Math.min(typicalPeriodLength + 7, 13)}</strong> (a few days after your period ends), when estrogen and progesterone are quietest and breast tissue is least lumpy.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consistent Monthly Check Anchor Day (1–28)
              </label>
              <input
                type="number"
                min={1}
                max={28}
                value={monthlyAnchorDay}
                onChange={(e) => setMonthlyAnchorDay(Number(e.target.value))}
                className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
              />
              <p className="text-[11px] text-slate-600 mt-1">
                Checking on the same calendar day each month builds reliable longitudinal memory.
              </p>
            </div>
          )}

          {/* Personal Baseline Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              What Feels &ldquo;Normal for You&rdquo;? (Personal Baseline Note)
            </label>
            <textarea
              rows={2}
              value={personalBaselineNote}
              onChange={(e) => setPersonalBaselineNote(e.target.value)}
              placeholder="e.g., My upper outer quadrants naturally feel slightly ridge-like the week before my period, and soften afterwards."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>

          {/* Optional Local PIN Lock */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-slate-600" />
              <div>
                <p className="text-xs font-bold text-slate-800">Optional Local Privacy PIN</p>
                <p className="text-[11px] text-slate-500">
                  Protects your timeline when you tap Quick-Lock (stored strictly in local IndexedDB).
                </p>
              </div>
            </div>
            <input
              type="password"
              maxLength={6}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="4-digit PIN (optional)"
              className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
            />
          </div>

          {/* Ethical & Privacy Pledge */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-[11px] space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              Privacy &amp; Clinical Scope Guarantee
            </p>
            <p>
              • All pose and hand tracking runs 100% in your browser. Zero images or video are ever displayed or saved.
            </p>
            <p>
              • Baseline supports breast self-awareness and clinician handoffs—it is not a diagnostic or screening device and never outputs &ldquo;all clear.&rdquo;
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-sm transition"
            >
              Save Baseline &amp; Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
