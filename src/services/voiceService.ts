class VoiceGuidanceService {
  private enabled: boolean = true;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public speak(text: string, interrupt: boolean = true) {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      if (interrupt) {
        window.speechSynthesis.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.96;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Zira'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore TTS errors on browsers without speech support
    }
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const voiceService = new VoiceGuidanceService();
