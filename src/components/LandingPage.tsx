import React from 'react';
import pinkRibbonImg from '../assets/pink-ribbon.png';
import awarenessHeroImg from '../assets/awareness-hero.png';
import {
  Heart,
  Layers,
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';

interface LandingPageProps {
  onEnterPortal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterPortal }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDFB] text-[#2C2025]">
      {/* 1. Clean, Soothing Medical Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-rose-100/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Logo & Brand: "Sally" */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center p-1.5 shadow-xs">
              <img
                src={pinkRibbonImg}
                alt="Sally Awareness Ribbon"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-rose-950">
                Sally
              </span>
              <p className="text-[11px] text-rose-800/60 font-medium leading-none mt-0.5">
                Breast Self-Awareness Companion
              </p>
            </div>
          </div>

          {/* Simple, Non-intrusive Action */}
          <button
            onClick={onEnterPortal}
            className="px-5 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Soft, Simple Hero Section - Full First Viewport */}
      <section className="min-h-[calc(100vh-73px)] max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row items-center justify-between gap-12 w-full">
        {/* Left: Gentle Value Statement & CTA */}
        <div className="max-w-lg space-y-6 text-center lg:text-left my-auto">
          {/* Calming Headline with Refined Typography */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-rose-950 tracking-tight leading-[1.18]">
            Empower Your <span className="text-rose-600">Self-Awareness</span>.<br />
            Know Your Baseline.
          </h1>

          {/* Soothing Clinical Guidance Notes (Clean & Focused) */}
          <div className="space-y-3 pt-1 text-xs sm:text-sm text-rose-900/80 font-medium">
            <div className="flex items-center gap-2.5 justify-center lg:justify-start">
              <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Structured 108-zone circular palpation routine</span>
            </div>
            <div className="flex items-center gap-2.5 justify-center lg:justify-start">
              <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Menstrual cycle timing & optimal check window</span>
            </div>
            <div className="flex items-center gap-2.5 justify-center lg:justify-start">
              <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
              <span>On-device privacy — zero video or photo storage</span>
            </div>
            <div className="flex items-center gap-2.5 justify-center lg:justify-start">
              <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Clinician-ready 1-page consultation summary PDF</span>
            </div>
          </div>

          {/* Clean CTA Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <button
              onClick={onEnterPortal}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 text-white font-bold text-sm shadow-md hover:shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right: Soft Soothing Hero Visual */}
        <div className="w-full max-w-md relative flex items-center justify-center my-auto">
          {/* Subtle Ambient Glow */}
          <div className="absolute -inset-2 bg-gradient-to-tr from-pink-100 via-orange-50 to-rose-50 rounded-3xl blur-xl opacity-80" />

          {/* Clean Image Card */}
          <div className="relative z-10 w-full rounded-3xl bg-white p-3 border border-rose-100 shadow-xl shadow-rose-950/5">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-rose-50 relative">
              <img
                src={awarenessHeroImg}
                alt="Breast Health Self-Awareness"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-rose-950/30 via-transparent to-transparent" />

              {/* Minimal Reassurance Overlay */}
              <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md rounded-2xl p-2.5 px-3.5 text-xs text-rose-950 border border-white/80 shadow-xs flex items-center justify-between">
                <span className="font-bold text-rose-950 text-xs">Knowing Your Normal</span>
                <span className="text-rose-600 font-semibold text-[11px]">Private & Respectful</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Soft Four-Pillar Clinical Standard Section - Displays on scroll as dedicated page */}
      <section className="min-h-screen bg-gradient-to-b from-transparent via-rose-50/40 to-orange-50/20 py-20 border-t border-rose-100/70 flex flex-col justify-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-extrabold text-rose-950 tracking-tight">
              A Four-Pillar Clinical Standard
            </h2>
            <p className="text-xs sm:text-sm text-rose-800/60 mt-1.5 font-medium">
              Thoughtfully created to foster body awareness and open communication with your healthcare provider.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Pillar 1 */}
            <div className="bg-white rounded-3xl p-5 border border-rose-100/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-3.5">
                  <Heart className="w-5 h-5 fill-rose-100" />
                </div>
                <h3 className="font-bold text-sm text-rose-950 mb-1.5">1. Guides & Tracks</h3>
                <p className="text-xs text-rose-900/70 leading-relaxed font-normal">
                  Never diagnoses or reassures. Purely focused on helping you become familiar with your normal baseline.
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-rose-600 mt-4 tracking-wider">
                Ethical Boundary
              </span>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white rounded-3xl p-5 border border-rose-100/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 mb-3.5">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-rose-950 mb-1.5">2. 108 Body Zones</h3>
                <p className="text-xs text-rose-900/70 leading-relaxed font-normal">
                  Systematic circular exploration across 4 concentric rings, 12 clock positions, underarms, and collarbone.
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-orange-600 mt-4 tracking-wider">
                Systematic Routine
              </span>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white rounded-3xl p-5 border border-rose-100/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-rose-950 mb-1.5">3. Privacy by Design</h3>
                <p className="text-xs text-rose-900/70 leading-relaxed font-normal">
                  Zero video or still image storage. Computer vision runs locally in-memory. Manual mode is always available.
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-amber-700 mt-4 tracking-wider">
                Local On-Device
              </span>
            </div>

            {/* Pillar 4 */}
            <div className="bg-white rounded-3xl p-5 border border-rose-100/90 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 mb-3.5">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-rose-950 mb-1.5">4. Doctor-Ready Handout</h3>
                <p className="text-xs text-rose-900/70 leading-relaxed font-normal">
                  Export an authentic 1-page PDF summary with quadrant schematics, persistence flags, and cycle timing.
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-rose-600 mt-4 tracking-wider">
                Clinical Summary
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Serene Footer */}
      <footer className="bg-white border-t border-rose-100/70 py-6 text-center text-xs text-rose-900/50">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-900 font-semibold text-xs">
            <img src={pinkRibbonImg} alt="Sally" className="w-4 h-4 object-contain" />
            <span>Sally — Breast Self-Awareness Companion</span>
          </div>
          <p className="text-[11px] text-rose-800/60 font-medium">
            Patient-recorded observations for clinical discussion. Not a diagnostic tool.
          </p>
        </div>
      </footer>
    </div>
  );
};
