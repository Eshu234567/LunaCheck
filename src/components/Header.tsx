import React from 'react';
import pinkRibbonImg from '../assets/pink-ribbon.png';
import { ArrowLeft } from 'lucide-react';
import { ActiveScreen } from '../types';

interface HeaderProps {
  activeScreen?: ActiveScreen;
  onNavigate?: (screen: ActiveScreen) => void;
  onLock?: () => void;
  onExportBackup?: () => void;
  onResetData?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeScreen,
  onNavigate,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-rose-100/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Brand: Just Sally */}
        <div
          onClick={() => onNavigate?.('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 p-1.5 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
            <img src={pinkRibbonImg} alt="Sally" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-rose-950">
            Sally
          </span>
        </div>

        {/* Back to Dashboard if on a sub-screen */}
        {activeScreen && activeScreen !== 'dashboard' && (
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-200/80 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-rose-500" />
            <span>Back to Dashboard</span>
          </button>
        )}
      </div>
    </header>
  );
};
