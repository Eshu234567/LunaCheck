import React from 'react';
import pinkRibbonImg from '../assets/pink-ribbon.png';
import { ArrowLeft, Lock, User } from 'lucide-react';
import { ActiveScreen, UserProfile } from '../types';

interface HeaderProps {
  user?: UserProfile;
  activeScreen?: ActiveScreen;
  onNavigate?: (screen: ActiveScreen) => void;
  onLock?: () => void;
  onExportBackup?: () => void;
  onResetData?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeScreen,
  onNavigate,
  onLock,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-rose-100/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        {/* Brand: Sally */}
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

        {/* Right Controls: User Profile Badge, Back to Dashboard & Lock/Switch Account */}
        <div className="flex items-center gap-2">
          {user?.email && (
            <div
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50/70 border border-rose-200/70 text-xs font-semibold text-rose-900"
              title={`Signed in as ${user.email}`}
            >
              <User className="w-3.5 h-3.5 text-rose-500" />
              <span>{user.name || user.email}</span>
            </div>
          )}

          {activeScreen && activeScreen !== 'dashboard' && (
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-200/80 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-rose-500" />
              <span>Back to Dashboard</span>
            </button>
          )}

          {onLock && (
            <button
              onClick={onLock}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200/90 shadow-2xs transition-all cursor-pointer"
              title="Lock Private Vault or Switch Account"
            >
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>Lock Vault</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
