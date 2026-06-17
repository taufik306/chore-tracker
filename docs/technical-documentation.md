# Technical Architecture & Developer Onboarding Guide

Welcome! This document provides an in-depth technical overview of the Chore Tracker codebase, describing the state management approach, offline synchronization rules, security patterns, and browser synthesizer implementation.

---

## 🧭 System Overview

The application is structured as an offline-capable, real-time reactive Single Page Application (SPA). It uses a hybrid guest/cloud structure:

1. **Guest Mode**: Utilizes `localStorage` caches if the user chooses not to authenticate.
2. **Synchronized Cloud Mode**: Leverages **Firebase Firestore** with persistent local caching to achieve seamless real-time syncing across authenticated client devices.

```text
 ┌────────────────────────────────────────────────────────┐
 │                      React UI                          │
 │  (Tabs: Active Tracker • Dashboard • Chore History)    │
 └─────────────────────────┬──────────────────────────────┘
                           │ Writes / Reads
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │            Firestore Persistent localCache             │
 │ (Updates client instantly via Local Index Tables DB)   │
 └─────────────────────────┬──────────────────────────────┘
                           │ Background Pipeline Sync
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │                  Cloud Firestore                       │
 │      (Hardened with Rules-based Authorization)         │
 └────────────────────────────────────────────────────────┘
```

---

## 🛠️ Key Technical Implementations

### 1. Hardened Sync Engine (`src/lib/firebase.ts`)
Instead of using standard vanilla Firestore, we enable persistent local caches explicitly. This implements true offline-first performance, keeping the UI functional even during network gaps. We also load Firebase credentials securely via `import.meta.env` environment variables.

```typescript
const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, databaseId);
```
- **`persistentLocalCache`**: Mandates local IndexedDB storage, preventing application crashes or missing data when disconnected.
- **`persistentMultipleTabManager`**: Prevents database locking errors when the application is opened in multiple browser tabs simultaneously.

---

### 2. Audio Synthesis Engine (`src/utils/sound.ts`)
To issue reminder alerts without depending on external asset files or causing network-delay lagging, we synthesize sound programmatically at runtime using the browser's native **Web Audio API**:

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

---

### 3. State Management & Real-Time Loop (`src/App.tsx`)
A `setInterval` background checker checks for expired time boundaries every 4.5 seconds:

- **Time-limited chores**: Checks if `currentTime >= startTime + limitMinutes * 60000`.
- **Unlimited chores**: Checks if `currentTime >= startTime + 24 * 60 * 60000` (exceeded one day limit).
- **Redundant Alert Prevention**: To prevent annoying repeat sound chimes on every tick, once a notification is generated, its unique chore ID is committed to `alertedChoreIds` in local state and cached in `localStorage`.

---

### 4. Firestore Rules Security Model (`firestore.rules`)
We enforce zero-trust security rules on the Firestore database level. Direct access is prohibited unless:
- The user is fully authenticated.
- The document ID matches the validated payload schema.
- The `userId` attribute matches the caller's verified auth UID.

Crucial properties are write-protected against modified manipulations:
```javascript
allow update: if isSignedIn()
  && existing().userId == request.auth.uid
  && incoming().userId == request.auth.uid
  && incoming().id == existing().id
  && incoming().createdAt == existing().createdAt;
```

---

## 🚀 Developers Onboarding Checklist

When introducing new features or modifying the tracker, respect the following coding patterns:

### Adding a New Column/Property to Chores:
1. Update Interfaces: Add the new property into `Chore` in `src/types.ts`.
2. Update Firestore Blueprint: Define its schema boundaries inside `firebase-blueprint.json`.
3. Harden Firestore Rules: Extend the logic inside `firestore.rules` under `isValidChore()` and the whitelist block to support the parameters safely.
4. Environment Variables: If new Firebase configuration fields are needed, ensure they are added to `.env.example` with the `VITE_` prefix.
5. Run standard test compilations.

### Modifying Audio Signals:
- Ensure oscillator node types remain `'sine'` or `'triangle'` to protect speakers and headphone users from high-frequency clicks.
- Apply smooth release gain decays (`exponentialRampToValueAtTime`) to gracefully silence active voice nodes prior to the call of `.stop()`.

### Rules of Engagement (Build Systems):
- **Dependencies**: Never add client-side libraries manually with static script tags. Add them via `package.json` package installs.
- **Port bindings**: Dev environments must always map to port `3000` and host `0.0.0.0` for container proxies.
