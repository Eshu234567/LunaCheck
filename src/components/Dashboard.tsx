import React from 'react';
import { CycleProfile, Observation, RoutineSessionRecord, UserProfile } from '../types';
import pinkRibbonImg from '../assets/pink-ribbon.png';
import guideImg from '../assets/guide.png';
import pdfImg from '../assets/pdf.jpg';
import personalImg from '../assets/personal.jpg';
import timeline1Img from '../assets/timeline1.jpg';
import timeline2Img from '../assets/timeline2.jpg';
import {
  Calendar,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Heart,
} from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  cycle: CycleProfile;
  observations: Observation[];
  routines: RoutineSessionRecord[];
  onStartRoutine: (mode?: 'camera' | 'manual' | 'simulated') => void;
  onOpenBodyMap: () => void;
  onOpenTimeline: () => void;
  onOpenReport: () => void;
  onUpdateCycle: (updated: CycleProfile) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  cycle,
  observations,
  routines,
  onStartRoutine,
  onOpenBodyMap,
  onOpenTimeline,
  onOpenReport,
}) => {
  // Compute current cycle day
  const today = new Date();
  const lastPeriod = new Date(cycle.lastPeriodDate);
  const diffTime = today.getTime() - lastPeriod.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentCycleDay = diffDays >= 0 ? (diffDays % cycle.cycleLengthDays) + 1 : 1;

  // Window status
  const isOptimalWindow = currentCycleDay >= 3 && currentCycleDay <= 10;
  const recentRoutines = routines.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 1. Welcoming Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500/95 via-pink-500/90 to-rose-400 p-6 sm:p-8 text-white shadow-xl shadow-rose-900/10">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-rose-50">
              <Sparkles className="w-3.5 h-3.5 text-rose-200" />
              <span>Personal Breast Health Baseline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-xs">
              Welcome back, {user.name}
            </h1>
            <p className="text-xs sm:text-sm text-rose-100/90 font-medium leading-relaxed">
              Knowing what is normal for your body is the foundation of breast awareness. Explore your 108 anatomical zones, track tactile observations, and prepare clinician-ready summaries.
            </p>
          </div>

          {/* Cycle & Routine Quick Pill */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="glass-panel-warm rounded-2xl p-4 bg-white/15 backdrop-blur-md border border-white/25 flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-rose-100" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-200 block">
                  Cycle Day {currentCycleDay}
                </span>
                <span className="text-xs font-bold block">
                  {isOptimalWindow ? 'Optimal Self-Check Window' : 'Post-Baseline Window'}
                </span>
              </div>
            </div>

            <div className="glass-panel-warm rounded-2xl p-4 bg-white/15 backdrop-blur-md border border-white/25 flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-rose-100" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-200 block">
                  Last Routine
                </span>
                <span className="text-xs font-bold block">
                  {recentRoutines[0]?.date || 'No routine yet'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Four Clean, Visual Core Modules (Primary Navigation with Uploaded Images) */}
      <div>
        <h2 className="text-sm font-extrabold text-rose-950 uppercase tracking-wider mb-3 px-1">
          Select Routine or Module
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* Module 1: Guided Routine (using guide.png) */}
          <div
            onClick={() => onStartRoutine()}
            className="group glass-panel-pink rounded-3xl p-5 sm:p-6 border border-pink-200/90 hover:border-rose-400 hover:shadow-xl hover:shadow-rose-500/10 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Image Banner */}
              <div className="relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden bg-white border border-pink-200 mb-4 flex items-center justify-center shadow-xs">
                <img
                  src={guideImg}
                  alt="Guided Routine"
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] uppercase font-extrabold text-rose-600 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full border border-pink-200 shadow-xs">
                    Step-by-Step
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-rose-950 mb-1 group-hover:text-rose-600 transition-colors">
                Guided Routine
              </h3>
              <p className="text-xs text-rose-900/70 leading-relaxed">
                Step-by-step visual inspection, continuous spiral palpation, and targeted sector examination with on-device camera AI.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-pink-100 flex items-center justify-between text-xs font-bold text-rose-600 group-hover:translate-x-0.5 transition-transform">
              <span>Start Routine Check</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Module 2: Timeline & Trends (Combining timeline1.jpg & timeline2.jpg) */}
          <div
            onClick={onOpenTimeline}
            className="group glass-panel rounded-3xl p-5 sm:p-6 border border-rose-200 hover:border-rose-400 hover:shadow-xl hover:shadow-rose-500/10 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Combined Split Image Banner */}
              <div className="relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden bg-white border border-rose-200 mb-4 flex shadow-xs">
                {/* Left Half: timeline1.jpg (Clinical Heatmap Area) */}
                <div className="w-1/2 h-full relative overflow-hidden border-r border-rose-200/80">
                  <img
                    src={timeline1Img}
                    alt="Findings Mapping"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white uppercase tracking-wider">
                    Anatomical Log
                  </div>
                </div>

                {/* Right Half: timeline2.jpg (Calendar Dates) */}
                <div className="w-1/2 h-full relative overflow-hidden bg-slate-50">
                  <img
                    src={timeline2Img}
                    alt="Timeline Calendar"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white uppercase tracking-wider">
                    Session Dates
                  </div>
                </div>

                <div className="absolute top-3 right-3">
                  <span className="text-[10px] uppercase font-extrabold text-rose-700 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full border border-rose-200 shadow-xs">
                    History
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-rose-950 mb-1 group-hover:text-rose-600 transition-colors">
                Timeline & Trends
              </h3>
              <p className="text-xs text-rose-900/70 leading-relaxed">
                Review sessions and observations grouped by date, correlated with your cycle, and mapped on the sector diagram.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-rose-100 flex items-center justify-between text-xs font-bold text-rose-600 group-hover:translate-x-0.5 transition-transform">
              <span>Open Timeline</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Module 3: Personal Log (using personal.jpg) */}
          <div
            onClick={onOpenBodyMap}
            className="group glass-panel-peach rounded-3xl p-5 sm:p-6 border border-orange-200/90 hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/10 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Image Banner */}
              <div className="relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden bg-white border border-orange-200 mb-4 flex items-center justify-center shadow-xs">
                <img
                  src={personalImg}
                  alt="Personal Log"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] uppercase font-extrabold text-orange-600 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full border border-orange-200 shadow-xs">
                    Notes & Map
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-orange-950 mb-1 group-hover:text-orange-600 transition-colors">
                Personal Log
              </h3>
              <p className="text-xs text-orange-900/70 leading-relaxed">
                Add personal notes and reflections, refer to the breast sector map, and review the clinical awareness guide.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-orange-100 flex items-center justify-between text-xs font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform">
              <span>Open Personal Log</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Module 4: Clinician PDF Report (using pdf.jpg) */}
          <div
            onClick={onOpenReport}
            className="group glass-panel-yellow rounded-3xl p-5 sm:p-6 border border-amber-200 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Image Banner */}
              <div className="relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden bg-white border border-amber-200 mb-4 flex items-center justify-center shadow-xs">
                <img
                  src={pdfImg}
                  alt="Clinician Consultation PDF"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] uppercase font-extrabold text-amber-700 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full border border-amber-200 shadow-xs">
                    Doctor Ready
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-amber-950 mb-1 group-hover:text-amber-600 transition-colors">
                Report (Clinician PDF)
              </h3>
              <p className="text-xs text-amber-900/70 leading-relaxed">
                Download a clean, high-contrast 1-page summary mapping observations onto quadrant schematics for your doctor.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
              <span>Preview & Download PDF</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Subtle Clinical Footnote */}
      <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/60 flex items-center justify-between text-xs text-rose-900/70">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Patient-recorded observations for clinical consultation • 100% On-device privacy</span>
        </div>
        <span className="hidden sm:inline text-[11px] text-rose-800/60 font-semibold">
          ACS & USPSTF Aligned
        </span>
      </div>
    </div>
  );
};

export default Dashboard;
