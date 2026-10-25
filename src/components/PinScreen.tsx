import React, { useState, useRef, useEffect } from 'react';
import pinkRibbonImg from '../assets/pink-ribbon.png';
import {
  Lock,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Mail,
  User,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { UserProfile } from '../types';
import { storageService } from '../services/storage';

interface PinScreenProps {
  user: UserProfile;
  onUnlock: (authenticatedUser: UserProfile) => void;
  onBackToLanding: () => void;
}

export const PinScreen: React.FC<PinScreenProps> = ({ onUnlock, onBackToLanding }) => {
  const existingAccounts = storageService.getRegisteredAccounts();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(() =>
    existingAccounts.length > 0 ? 'signin' : 'signup'
  );

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>(() => storageService.getLastUsedEmail());
  const [ageBracket, setAgeBracket] = useState<string>('25–34');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Brute-force protection (5 failed attempts -> 30s cooldown)
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((s) => {
        if (s <= 1) {
          setFailedAttempts(0);
          setErrorMsg('');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const switchMode = (nextMode: 'signin' | 'signup') => {
    setAuthMode(nextMode);
    setErrorMsg('');
    setPinDigits(['', '', '', '']);
  };

  const handleDigitChange = (index: number, value: string) => {
    if (lockoutSeconds > 0) return;
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

    if (index < 3 && digit) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullPin = next.join('');
    if (fullPin.length === 4 && email.trim()) {
      if (authMode === 'signin' || name.trim()) {
        void submitAuth(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      const fullPin = pinDigits.join('');
      if (fullPin.length === 4) {
        void submitAuth(fullPin);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const next = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setPinDigits(next);
    setErrorMsg('');

    if (pasted.length === 4 && email.trim()) {
      void submitAuth(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 3)]?.focus();
    }
  };

  const handleKeypadPress = (num: string) => {
    if (lockoutSeconds > 0) return;
    const emptyIndex = pinDigits.findIndex((d) => d === '');
    if (emptyIndex !== -1) {
      handleDigitChange(emptyIndex, num);
    }
  };

  const handleKeypadBackspace = () => {
    if (lockoutSeconds > 0) return;
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

  const submitAuth = async (enteredPin: string) => {
    if (lockoutSeconds > 0 || isSubmitting) return;

    if (authMode === 'signup' && !name.trim()) {
      setErrorMsg('Please enter your name above before unlocking.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (enteredPin.length < 4) {
      setErrorMsg('Please enter all 4 digits of your security PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'signup') {
        const res = await storageService.registerAccount({
          name,
          email,
          ageBracket,
          pin: enteredPin,
        });
        if (res.ok && res.user) {
          setErrorMsg('');
          onUnlock(res.user);
        } else {
          setErrorMsg(res.error || 'Could not create account.');
          setPinDigits(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      } else {
        const res = await storageService.authenticateAccount(email, enteredPin);
        if (res.ok && res.user) {
          setErrorMsg('');
          setFailedAttempts(0);
          onUnlock(res.user);
        } else {
          const nextFails = failedAttempts + 1;
          setFailedAttempts(nextFails);
          if (nextFails >= 5) {
            setLockoutSeconds(30);
            setErrorMsg('Too many failed PIN attempts. Account locked for 30 seconds.');
          } else {
            setErrorMsg(res.error || 'Incorrect email or 4-digit PIN.');
          }
          setPinDigits(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitAuth(pinDigits.join(''));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-[#FFFDFB] font-sans">
      {/* Back button to Landing */}
      <button
        onClick={onBackToLanding}
        className="absolute top-6 left-6 text-xs font-semibold text-rose-800/70 hover:text-rose-950 bg-white/90 hover:bg-white px-4 py-2 rounded-full border border-rose-200/80 shadow-xs flex items-center gap-2 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-rose-500" />
        <span>Back to Home</span>
      </button>

      {/* Main Login / Sign-Up PIN Card */}
      <div className="w-full max-w-md rounded-3xl bg-white border border-rose-100 p-6 sm:p-8 shadow-xl shadow-rose-950/5 flex flex-col items-center">
        {/* Logo Icon */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-3 p-2.5 shadow-xs">
          <img src={pinkRibbonImg} alt="Sally" className="w-full h-full object-contain" />
        </div>

        {/* Mode Toggle Tabs: Sign In vs Create Account */}
        <div className="grid grid-cols-2 gap-1.5 w-full bg-rose-50/70 p-1 rounded-2xl border border-rose-100 mb-4">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              authMode === 'signin'
                ? 'bg-white text-rose-950 shadow-xs border border-rose-200/80'
                : 'text-rose-800/70 hover:text-rose-950'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-rose-500" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              authMode === 'signup'
                ? 'bg-white text-rose-950 shadow-xs border border-rose-200/80'
                : 'text-rose-800/70 hover:text-rose-950'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-rose-500" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-rose-950 tracking-tight text-center mb-1">
          {authMode === 'signup' ? 'Create Private Account' : 'Enter Security PIN'}
        </h2>
        <p className="text-xs text-rose-800/60 text-center mb-5 font-medium">
          {authMode === 'signup'
            ? 'Register with your email and a 4-digit PIN for your personal encrypted health vault.'
            : 'Enter your email and 4-digit code to unlock your private health observations.'}
        </p>

        {/* Quick-select saved accounts on this device when signing in */}
        {authMode === 'signin' && existingAccounts.length > 0 && (
          <div className="w-full mb-3.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-800/60 mb-1.5">
              Private Profiles on This Device:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {existingAccounts.map((acc) => {
                const isSelected = email.trim().toLowerCase() === (acc.email || '').toLowerCase();
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email || '');
                      setErrorMsg('');
                      inputRefs.current[0]?.focus();
                    }}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                        : 'bg-rose-50/60 text-rose-900 border-rose-200 hover:bg-rose-100/70'
                    }`}
                  >
                    <User className="w-3 h-3" />
                    <span>{acc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Form Fields + 4-Box Segmented PIN Setup */}
        <form onSubmit={handleSubmit} className="w-full space-y-3.5">
          {authMode === 'signup' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-rose-900 mb-1">
                  Your Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="e.g. Harshita"
                    className="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-rose-50/30 border border-rose-200/90 text-xs font-semibold text-rose-950 placeholder-rose-300 focus:outline-none focus:border-rose-400 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-900 mb-1">
                  Age Group
                </label>
                <select
                  value={ageBracket}
                  onChange={(e) => setAgeBracket(e.target.value)}
                  className="w-full px-2.5 py-2.5 rounded-2xl bg-rose-50/30 border border-rose-200/90 text-xs font-semibold text-rose-950 focus:outline-none focus:border-rose-400 focus:bg-white"
                >
                  <option value="18–24">18–24</option>
                  <option value="25–34">25–34</option>
                  <option value="35–44">35–44</option>
                  <option value="45–54">45–54</option>
                  <option value="55+">55+</option>
                </select>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-[11px] font-bold text-rose-900 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-rose-50/30 border border-rose-200/90 text-xs font-semibold text-rose-950 placeholder-rose-300 focus:outline-none focus:border-rose-400 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* 4-Digit PIN Label + Boxes */}
          <div className="pt-1">
            <label className="block text-[11px] font-bold text-rose-900 text-center mb-2">
              {authMode === 'signup' ? 'Set Your 4-Digit Security PIN' : '4-Digit Security PIN'}
            </label>
            <div className="flex justify-center gap-3.5">
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  disabled={lockoutSeconds > 0}
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
          </div>

          {/* Error or Lockout Message */}
          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 text-rose-600 text-xs bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>
                {lockoutSeconds > 0
                  ? `Too many failed attempts. Try again in ${lockoutSeconds}s.`
                  : errorMsg}
              </span>
            </div>
          )}

          {/* Submit / Unlock Button */}
          <button
            type="submit"
            disabled={isSubmitting || lockoutSeconds > 0 || pinDigits.join('').length < 4}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>
              {authMode === 'signup' ? 'Create Account & Unlock' : 'Unlock Portal'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* On-Screen Keypad for Touch Convenience */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px] pt-4 mt-4 border-t border-rose-100">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={lockoutSeconds > 0}
              onClick={() => handleKeypadPress(digit)}
              className="h-11 rounded-xl bg-rose-50/40 hover:bg-rose-100/60 active:bg-rose-200/60 text-lg font-bold text-rose-950 border border-rose-100/70 transition-all flex items-center justify-center active:scale-95 shadow-xs cursor-pointer disabled:opacity-40"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            disabled={lockoutSeconds > 0}
            onClick={() => handleKeypadPress('0')}
            className="h-11 rounded-xl bg-rose-50/40 hover:bg-rose-100/60 active:bg-rose-200/60 text-lg font-bold text-rose-950 border border-rose-100/70 transition-all flex items-center justify-center active:scale-95 shadow-xs cursor-pointer disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            disabled={lockoutSeconds > 0}
            onClick={handleKeypadBackspace}
            className="h-11 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-40"
          >
            Delete
          </button>
        </div>

        {/* Discreet Security Footer */}
        <div className="text-[11px] text-rose-800/60 flex items-center gap-1.5 mt-5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
          <span>Salted SHA-256 • Local on-device encrypted vault</span>
        </div>
      </div>
    </div>
  );
};
