---
tldr: Explains the Web Audio API synthesizer implementation used for offline-capable alerts and warning chimes.
---
# Audio Synthesis Engine

To issue reminder alerts without depending on external asset files or causing network-delay lagging, we synthesize sound programmatically at runtime using the browser's native **Web Audio API** (`src/utils/sound.ts`):

- **Double-Beep (`playNotificationChime`)**: Used for 24-hour non-limited warnings. Sends high-harmonic, cheerful frequencies.
- **Triple-Alarm (`playDeadlineAlarm`)**: Used for time-limit timeouts. Sends decaying tone pulses with a smooth transition.

```typescript
const audioCtx = new AudioContext();
const osc = audioCtx.createOscillator();
const gainNode = audioCtx.createGain();

osc.type = 'sine';
gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
```

To avoid browser audio blockages, the synthesizer automatically restarts or resumes suspended audio context instances upon detection of standard user interaction events.

### Developer Note: Modifying Audio Signals
- Ensure oscillator node types remain `'sine'` or `'triangle'` to protect speakers and headphone users from high-frequency clicks.
- Apply smooth release gain decays (`exponentialRampToValueAtTime`) to gracefully silence active voice nodes prior to the call of `.stop()`.
