import React, { useState } from 'react';
import { ShieldAlert, Info, X } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const disclaimerText = (
    <span className="inline-flex items-center gap-2">
      <strong className="text-amber-950 font-extrabold uppercase tracking-wider text-[11px]">
        Medical & Clinical Guardrail:
      </strong>
      <span>
        Patient-recorded observations for clinical discussion. <strong>Not a diagnostic tool.</strong> This application guides personal baseline awareness — it never provides diagnoses, reassurance, or "all clear" assessments.
      </span>
      <span className="text-amber-400 font-bold mx-3">•</span>
      <span className="text-emerald-700 font-semibold">
        ACS & USPSTF Aligned • 100% On-Device Local Privacy
      </span>
      <span className="text-amber-400 font-bold mx-3">•</span>
    </span>
  );

  return (
    <div className="bg-amber-50/95 border-b border-amber-200/90 px-3 sm:px-4 py-2 text-xs text-amber-900 relative overflow-hidden select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left Guardrail Badge */}
        <div className="flex items-center gap-1.5 shrink-0 bg-amber-100/90 border border-amber-300/80 px-2.5 py-1 rounded-full text-amber-950 font-bold text-[11px] shadow-xs">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span className="hidden sm:inline">Guardrail</span>
        </div>

        {/* Center: Infinite Smooth Horizontal Scrolling Ticker */}
        <div className="flex-1 overflow-hidden relative mx-2">
          {/* Subtle edge fade overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-amber-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-amber-50 to-transparent z-10 pointer-events-none" />

          {/* Marquee Content */}
          <div className="animate-marquee-scroll py-0.5">
            <div className="inline-flex items-center gap-3 pr-8">
              {disclaimerText}
            </div>
            <div className="inline-flex items-center gap-3 pr-8">
              {disclaimerText}
            </div>
          </div>
        </div>

        {/* Right Action & Alignment Tag */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 font-bold">
            <Info className="w-3 h-3 text-emerald-600" /> ACS Aligned
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-700/80 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-100/80 transition-colors cursor-pointer"
            title="Dismiss clinical guardrail"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
