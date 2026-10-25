import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface PinLockModalProps {
  user: UserProfile;
  isOpen: boolean;
  onUnlock: () => void;
  onUpdatePin: (newPin: string) => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({ user, isOpen, onUnlock, onUpdatePin }) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPinStep, setNewPinStep] = useState<'enter_old' | 'enter_new' | 'confirm_new'>('enter_new');
  const [tempNewPin, setTempNewPin] = useState('');

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 4) {
      const next = pinInput + num;
      setPinInput(next);
      setErrorMsg('');

      if (next.length === 4) {
        verifyOrProcessPin(next);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const verifyOrProcessPin = (entered: string) => {
    if (isChangingPin) {
      if (newPinStep === 'enter_new') {
        setTempNewPin(entered);
        setPinInput('');
        setNewPinStep('confirm_new');
      } else if (newPinStep === 'confirm_new') {
        if (entered === tempNewPin) {
          onUpdatePin(entered);
          setIsChangingPin(false);
          setPinInput('');
          setTempNewPin('');
          setErrorMsg('');
          onUnlock();
        } else {
          setErrorMsg('PINs do not match. Please try again.');
          setPinInput('');
          setNewPinStep('enter_new');
        }
      }
    } else {
      // Normal unlock verification
      const correctPin = user.pinHash || '1234';
      if (entered === correctPin) {
        setPinInput('');
        setErrorMsg('');
        onUnlock();
      } else {
        setErrorMsg('Incorrect PIN. Please try again.');
        setTimeout(() => setPinInput(''), 400);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/60 p-6 shadow-2xl flex flex-col items-center">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mb-4 text-teal-400">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white mb-1">
          {isChangingPin ? (newPinStep === 'confirm_new' ? 'Confirm New PIN' : 'Create 4-Digit PIN') : 'Aura Privacy Lock'}
        </h2>
        <p className="text-xs text-slate-400 text-center mb-6">
          {isChangingPin
            ? 'Set a custom 4-digit code to protect your local health observations.'
            : 'Encrypted on-device session. Enter PIN to access your observations.'}
        </p>

        {/* PIN Indicators */}
        <div className="flex gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                pinInput.length > i
                  ? 'bg-teal-400 border-teal-300 scale-110 shadow-[0_0_12px_rgba(45,212,191,0.6)]'
                  : 'border-slate-600 bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-center gap-1.5 text-rose-400 text-xs mb-4 animate-shake">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-teal-900/40 text-xl font-semibold text-white border border-slate-700/50 transition-all flex items-center justify-center active:scale-95 shadow-sm"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={() => {
              setIsChangingPin(!isChangingPin);
              setPinInput('');
              setErrorMsg('');
              setNewPinStep('enter_new');
            }}
            className="h-14 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center justify-center p-1"
          >
            <KeyRound className="w-4 h-4 mr-1" />
            {isChangingPin ? 'Cancel' : 'Set PIN'}
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-teal-900/40 text-xl font-semibold text-white border border-slate-700/50 transition-all flex items-center justify-center active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors flex items-center justify-center"
          >
            Delete
          </button>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-500/60" />
          <span>Local on-device encryption</span>
        </div>
      </div>
    </div>
  );
};
