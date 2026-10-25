import React, { useState } from 'react';
import { Calendar, Sparkles, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { CycleProfile } from '../types';

interface CycleWidgetProps {
  cycle: CycleProfile;
  onUpdateCycle: (updated: CycleProfile) => void;
}

export const CycleWidget: React.FC<CycleWidgetProps> = ({ cycle, onUpdateCycle }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [periodDate, setPeriodDate] = useState(cycle.lastPeriodDate);
  const [cycleLength, setCycleLength] = useState(cycle.cycleLengthDays);

  // Compute current cycle day
  const today = new Date();
  const lastPeriod = new Date(cycle.lastPeriodDate);
  const diffTime = today.getTime() - lastPeriod.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentCycleDay = diffDays >= 0 ? (diffDays % cycle.cycleLengthDays) + 1 : 1;

  // Optimal BSA Window is 3 to 10 days post-period onset (ACOG & ACS clinical guidelines)
  const isOptimalWindow = currentCycleDay >= 3 && currentCycleDay <= 10;
  const isLutealPhase = currentCycleDay > 18;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCycle({
      ...cycle,
      lastPeriodDate: periodDate,
      cycleLengthDays: Number(cycleLength),
    });
    setIsEditing(false);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        className={`absolute -right-10 -top-10 w-36 h-36 rounded-full blur-3xl pointer-events-none transition-colors ${
          isOptimalWindow ? 'bg-teal-500/15' : isLutealPhase ? 'bg-amber-500/10' : 'bg-indigo-500/10'
        }`}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Menstrual Cycle & Baseline Timing</h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isOptimalWindow
                    ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
                    : isLutealPhase
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {isOptimalWindow ? '✨ Optimal Self-Check Window' : isLutealPhase ? '⚡ Hormonal Fullness Phase' : 'Normal Baseline Phase'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Contextualizes hormonal breast tenderness and nodularity</p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium bg-slate-800/60 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/60 transition-colors"
        >
          <span>{isEditing ? 'Cancel Edit' : 'Adjust Cycle Dates'}</span>
          {isEditing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Cycle Day Meter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Current Cycle Day</span>
            <div className="text-2xl font-extrabold text-white flex items-baseline gap-1 mt-0.5">
              <span>Day {currentCycleDay}</span>
              <span className="text-xs font-normal text-slate-400">of {cycle.cycleLengthDays}</span>
            </div>
          </div>
          <Clock className="w-5 h-5 text-teal-400/60" />
        </div>

        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Last Period Start</span>
            <div className="text-base font-bold text-slate-200 mt-0.5">
              {new Date(cycle.lastPeriodDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <Calendar className="w-5 h-5 text-indigo-400/60" />
        </div>

        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex flex-col justify-center">
          <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Clinical Guidance</span>
          <p className="text-xs text-slate-300 mt-0.5 leading-snug">
            {isOptimalWindow ? (
              <span className="text-teal-300 font-medium">
                Ideal window: Tissue hormonal engorgement is minimal 3–10 days post-period.
              </span>
            ) : isLutealPhase ? (
              <span className="text-amber-300/90">
                Pre-menstrual luteal phase: Normal progesterone can cause temporary tenderness or swelling.
              </span>
            ) : (
              <span>Approaching next recommended baseline self-check.</span>
            )}
          </p>
        </div>
      </div>

      {/* Cycle Edit Form */}
      {isEditing && (
        <form onSubmit={handleSave} className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Last Period Onset Date</label>
            <input
              type="date"
              value={periodDate}
              onChange={(e) => setPeriodDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Average Cycle Length (Days)</label>
            <input
              type="number"
              min="20"
              max="45"
              value={cycleLength}
              onChange={(e) => setCycleLength(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg transition-colors shadow-sm"
          >
            Update Cycle Dates
          </button>
        </form>
      )}
    </div>
  );
};
