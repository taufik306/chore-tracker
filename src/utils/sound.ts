/**
 * Simple browser AudioContext synthesizer to build elegant and cross-platform
 * alarm sound chimes and warning trigger signals without external file requests.
 */
class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  /**
   * Sound an elegant double-beep chime for notification alerts.
   */
  public playNotificationChime() {
    try {
      const audioCtx = this.getContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // Step 1: Chime up
      this.beep(880, 0.15, 0.1);
      setTimeout(() => {
        this.beep(1100, 0.25, 0.15);
      }, 150);
    } catch (e) {
      console.warn("AudioContext block or failed play:", e);
    }
  }

  /**
   * Sound a lower triple-warning alarm when a task deadline runs out.
   */
  public playDeadlineAlarm() {
    try {
      const audioCtx = this.getContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // 3 warning pulses
      this.beep(523.25, 0.12, 0.2); // C5
      setTimeout(() => this.beep(493.88, 0.12, 0.2), 200); // B4
      setTimeout(() => this.beep(440.00, 0.25, 0.3), 400); // A4
    } catch (e) {
      console.warn("AudioContext block or failed play:", e);
    }
  }

  private beep(frequency: number, duration: number, volume: number) {
    const audioCtx = this.getContext();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    // Smooth release decay
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }
}

export const sound = new SoundSynthesizer();
