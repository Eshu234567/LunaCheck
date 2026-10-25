// Voice & Audio Synthesizer Service for guided self-awareness routine

class AudioService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private speakTimeoutId: number | null = null;

  constructor() {
    // Lazily init AudioContext on first user interaction
  }

  private initCtx() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  // Soft clinical chime when a zone coverage is logged
  playChime(type: 'zone' | 'step' | 'complete' = 'zone') {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;

      if (type === 'zone') {
        // High gentle ping
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'step') {
        // Warm two-tone progression
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.start(now);
        osc.stop(now + 0.36);
      } else {
        // Complete chord
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.5); // C6

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.start(now);
        osc.stop(now + 0.66);
      }
    } catch {
      // AudioContext could be blocked by browser policy
    }
  }

  // Voice narration using Web Speech API with immediate queue clearing
  speak(text: string) {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (this.speakTimeoutId !== null) {
      window.clearTimeout(this.speakTimeoutId);
      this.speakTimeoutId = null;
    }

    try {
      window.speechSynthesis.cancel(); // Flush ongoing utterances immediately

      // Chrome speech queue needs a microtick after cancel() to unblock cleanly
      this.speakTimeoutId = window.setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0; // Crisp pacing
          utterance.pitch = 1.05; // Warm, friendly tone
          utterance.volume = 0.95;

          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Natural') ||
                v.name.includes('Female') ||
                v.name.includes('Samantha') ||
                v.name.includes('Google') ||
                v.name.includes('Karen'))
          );
          if (preferred) {
            utterance.voice = preferred;
          }

          window.speechSynthesis.speak(utterance);
        } catch {
          // Ignore failures
        }
      }, 25);
    } catch {
      // Ignore speech synthesis failures
    }
  }

  stopAll() {
    if (this.speakTimeoutId !== null) {
      window.clearTimeout(this.speakTimeoutId);
      this.speakTimeoutId = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }
}

export const audioService = new AudioService();
