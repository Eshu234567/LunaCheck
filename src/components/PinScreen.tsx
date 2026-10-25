import React, { useState, useRef, useEffect } from 'react';
import pinkRibbonImg from '../assets/pink-ribbon.png';
import { Lock, ShieldCheck, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';

interface PinScreenProps {
  user: UserProfile;
  onUnlock: () => void;
  onBackToLanding: () => void;
}

export const PinScreen: React.FC<PinScreenProps> = ({ user, onUnlock, onBackToLanding }) => {
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...pinDigits];
      next[index] = '';
      setPinDigits(next);
      return;
    }

    const digit = cleaned.slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);
    setErrorMsg('');

    // Auto forward focus
    if (index < 3 && digit) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    const fullPin = next.join('');
    if (fullPin.length === 4) {
      verifyPin(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      // Move back on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      const fullPin = pinDigits.join('');
      if (fullPin.length === 4) {
        verifyPin(fullPin);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const next = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setPinDigits(next);
    setErrorMsg('');

    if (pasted.length === 4) {
      verifyPin(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 3)]?.focus();
    }
  };

  const handleKeypadPress = (num: string) => {
    // Find first empty index
    const emptyIndex = pinDigits.findIndex((d) => d === '');
    if (emptyIndex !== -1) {
      handleDigitChange(emptyIndex, num);
    }
  };

  const handleKeypadBackspace = () => {
    // Find last filled index
    for (let i = 3; i >= 0; i--) {
      if (pinDigits[i] !== '') {
        const next = [...pinDigits];
        next[i] = '';
        setPinDigits(next);
        inputRefs.current[i]?.focus();
        setErrorMsg('');
        break;
      }
    }
  };

  const verifyPin = (entered: string) => {
    setIsSubmitting(true);
    const correctPin = user.pinHash || '1234';

    setTimeout(() => {
      if (entered === correctPin) {
        setErrorMsg('');
        onUnlock();
      } else {
        setErrorMsg('Incorrect PIN. Please try again.');
        setPinDigits(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
      setIsSubmitting(false);
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullPin = pinDigits.join('');
    if (fullPin.length === 4) {
      verifyPin(fullPin);
    } else {
      setErrorMsg('Please enter all 4 digits.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-[#FFFDFB] font-sans">
      {/* Back button to Landing */}
      <button
        onClick={onBackToLanding}
        className="absolute top-6 left-6 text-xs font-semibold text-rose-800/70 hover:text-rose-950 bg-white/90 hover:bg-white px-4 py-2 rounded-full border border-rose-200/80 shadow-xs flex items-center gap-2 transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-rose-500" />
        <span>Back to Home</span>
      </button>

      {/* Main Login PIN Card */}
      <div className="w-full max-w-sm rounded-3xl bg-white border border-rose-100 p-7 sm:p-8 shadow-xl shadow-rose-950/5 flex flex-col items-center">
        {/* Logo Icon */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 p-2.5 shadow-xs">
          <img src={pinkRibbonImg} alt="Sally" className="w-full h-full object-contain" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-rose-950 tracking-tight text-center mb-1">
          Enter Security PIN
        </h2>
        <p className="text-xs text-rose-800/60 text-center mb-6 font-medium">
          Type your 4-digit code to access your health observations.
        </p>

        {/* 4-Box Segmented Type-in Setup */}
        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex justify-center gap-3.5 mb-5">
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={pinDigits[index]}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`w-14 h-16 rounded-2xl text-center text-2xl font-bold border-2 transition-all outline-none ${
                  pinDigits[index]
                    ? 'bg-rose-50/60 border-rose-400 text-rose-950 scale-102'
                    : 'bg-rose-50/20 border-rose-200/80 text-rose-950 focus:border-rose-400 focus:bg-white'
                }`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 text-rose-600 text-xs mb-4 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-medium animate-shake">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit / Unlock Button */}
          <button
            type="submit"
            disabled={isSubmitting || pinDigits.join('').length < 4}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2 mb-5"
          >
            <Lock className="w-4 h-4" />
            <span>Unlock Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* On-Screen Keypad for Touch Convenience */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px] pt-2 border-t border-rose-100">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeypadPress(digit)}
              className="h-12 rounded-xl bg-rose-50/40 hover:bg-rose-100/60 active:bg-rose-200/60 text-lg font-bold text-rose-950 border border-rose-100/70 transition-all flex items-center justify-center active:scale-95 shadow-xs"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            className="h-12 rounded-xl bg-rose-50/40 hover:bg-rose-100/60 active:bg-rose-200/60 text-lg font-bold text-rose-950 border border-rose-100/70 transition-all flex items-center justify-center active:scale-95 shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleKeypadBackspace}
            className="h-12 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center"
          >
            Delete
          </button>
        </div>

        {/* Discreet Security Footer */}
        <div className="text-[11px] text-rose-800/60 flex items-center gap-1.5 mt-5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
          <span>Local on-device encryption</span>
        </div>
      </div>
    </div>
  );
};
