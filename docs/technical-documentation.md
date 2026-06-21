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

#### Data Validation (`isValidChore`)
All create and update operations pass through a comprehensive `isValidChore(data)` validation function that enforces strict schema boundaries server-side:

| Field | Type | Constraint |
|---|---|---|
| `id` | `string` | Max 128 characters |
| `userId` | `string` | Must match `request.auth.uid` |
| `title` | `string` | 1–200 characters |
| `priority` | `string` | Enum: `low`, `medium`, `high` |
| `status` | `string` | Enum: `active`, `completed`, `cancelled` |
| `startTime` | `int` | Required |
| `createdAt` | `int` | Required, immutable on updates |
| `updatedAt` | `int` | Required |
| `limitMinutes` | `int` or `null` | Optional; if present: `> 0` and `<= 1440` (24 hours) |
| `completedAt` | `int` or `null` | Optional |

#### Update Field Whitelist
Updates are further restricted to only allow modification of specific fields via `affectedKeys().hasOnly()`:
```javascript
incoming().diff(existing()).affectedKeys().hasOnly(
  ['title', 'priority', 'status', 'limitMinutes', 'completedAt', 'updatedAt']
)
```
This prevents clients from tampering with `id`, `userId`, `createdAt`, or `startTime` after creation.

---

### 5. Error Handling (`src/lib/error-handler.ts`)
All Firestore operation errors are routed through a centralized `handleFirestoreError()` function that enforces two critical security principles:

1. **PII Stripping**: Error logs only include operational context (`operation`, `path`, `message`) — never user emails, UIDs, or provider data.
2. **User-Safe Messaging**: The function always re-throws a generic error message that is safe to render in the UI:
   ```typescript
   throw new Error(
     `Firestore ${operationType} operation failed. Please try again or check your connection.`
   );
   ```

Developer-only debugging (e.g., `auth.currentUser?.uid`) is gated behind a Vite environment check:
```typescript
if (import.meta.env.DEV) {
  console.debug('[Debug Auth Context]', auth.currentUser?.uid);
}
```
This ensures sensitive identifiers are never logged in production builds.

---

### 6. Content Security Policy (`index.html`)
A strict Content Security Policy (CSP) is enforced via a `<meta>` tag in `index.html` to mitigate Cross-Site Scripting (XSS) and data injection attacks:

| Directive | Value | Purpose |
|---|---|---|
| `default-src` | `'self'` | Fallback: only allow resources from the same origin |
| `script-src` | `'self' https://apis.google.com` | App scripts + Google API scripts (required for Firebase Auth popup) |
| `style-src` | `'self' 'unsafe-inline'` | Same-origin styles + inline styles (required for Tailwind CSS runtime injection) |
| `connect-src` | `'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com` | Firebase API endpoints for Auth, Firestore, and other services |
| `img-src` | `'self' https://*.googleusercontent.com data:` | Same-origin images + Google profile avatars + base64 data URIs |
| `font-src` | `'self'` | Fonts only from same origin |
| `frame-src` | `'self' https://*.firebaseapp.com` | Firebase Auth iframe for `signInWithPopup` OAuth flow |

> **Note**: `'unsafe-inline'` in `style-src` is required for Tailwind CSS. The `https://apis.google.com` in `script-src` is required for Firebase Auth's Google Sign-In popup flow, which dynamically loads `api.js`.

---

### 7. Client-Side Input Validation (`src/components/ChoreForm.tsx`)
Chore title input is validated both at the HTML and application logic level:

- **HTML constraint**: `maxLength={200}` on the `<input>` element prevents typing beyond 200 characters.
- **Submit handler validation**: Explicit check rejects titles exceeding 200 characters with a user-friendly error message.
- **Character counter**: A live `{length}/200` counter is displayed below the input, with amber warning styling when the length exceeds 180 characters.
- **User-safe error display**: All `catch` blocks in form submission render a generic `"Something went wrong. Please try again."` message — raw error details are never shown in the UI.

These client-side constraints mirror the server-side `title.size() <= 200` rule enforced in `firestore.rules`.

---

### 8. Client-Side Rate Limiting (`src/App.tsx`)
To prevent abuse from rapid chore creation (both accidental and intentional), a 2-second throttle is enforced:

```typescript
const [lastCreatedAt, setLastCreatedAt] = useState(0);

const handleAddChore = async (...) => {
  const now = Date.now();
  if (now - lastCreatedAt < 2000) {
    throw new Error('Please wait a moment before adding another chore.');
  }
  setLastCreatedAt(now);
  // ... proceed with creation
};
```

The error is caught by the `ChoreForm` component and displayed as a user-friendly message.

---

### 9. Query Limits (`src/App.tsx`)
All Firestore `onSnapshot` list queries enforce a `limit(500)` cap to prevent excessive document reads:

```typescript
const q = query(
  collection(db, 'chores'),
  where('userId', '==', user.uid),
  limit(500)
);
```

This serves as a client-side safeguard against runaway read costs or denial-of-service scenarios. For applications that grow beyond this limit, cursor-based pagination with `startAfter()` should be implemented.

### 10. Android Native Deployment (Capacitor)
The web application is packaged as a native Android APK using **Capacitor 6**. The web assets (`dist/`) are synchronized into a native Android WebView via `npx cap sync`. 

#### Native Google Sign-In
Standard Firebase web authentication (`signInWithPopup` or `signInWithRedirect`) is notoriously incompatible with mobile WebViews (due to restricted origins, popup blocking, and localhost redirect loops). To solve this, the application leverages the `@capacitor-firebase/authentication` plugin:

1. **Native Account Picker**: When running on Android (`Capacitor.isNativePlatform()`), the app bypasses the web SDK and triggers the native Android Google Sign-In intent via Google Play Services.
2. **Credential Manager Fallback**: The new Android 14 `CredentialManager` API frequently conflicts with 3rd-party password managers (like 1Password or Bitwarden), throwing `"No credentials available"` (`Error 10`). To ensure robust login success, the code explicitly disables this fallback:
   ```typescript
   const result = await FirebaseAuthentication.signInWithGoogle({
     useCredentialManager: false // Forces the reliable legacy Google Account Picker
   });
   ```
3. **Configuration**: The native Android project requires the `google-services.json` securely placed at `android/app/google-services.json`. The Firebase Console must also have the precise SHA-1 fingerprint of the signing Keystore (e.g., `debug.keystore` for local runs, or the Release Keystore for production APKs).
4. **Capacitor Config**: `capacitor.config.ts` explicitly enables the `google.com` provider and forces the Android scheme to `https` to satisfy Firebase Auth origin restrictions.

---

### 11. Guest Data Security (`src/App.tsx`)
Guest mode stores chore data as plain text in `localStorage`, which cannot be encrypted securely in the browser. The following mitigations are in place:

- **Prominent Disclaimer**: A highly visible amber warning block is displayed on the login page and informs the guest that their data is stored unencrypted in browser local storage.
- **Clear Local Data Button**: When in guest mode, a "Clear Local Data" button (with a trash icon) is displayed in the navigation bar. Clicking it triggers a `window.confirm()` prompt before purging `local_guest_chores` from `localStorage` and resetting the chores state.
- **No Sensitive Data**: The current guest schema only stores low-sensitivity chore data (titles, priorities, timestamps).

---

## 🔐 Environment Configuration

### Firebase Credentials
All Firebase configuration is loaded from environment variables (never hardcoded). The following variables must be set in a `.env` file at the project root:

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (e.g., `your-project.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | Firestore database ID (defaults to `(default)` if empty) |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Analytics measurement ID (optional) |

A template with placeholder values is available in `.env.example`. Copy it to `.env` and fill in the actual credentials.

> **Important**: The file `firebase-applet-config.json` is listed in `.gitignore` and must never be committed to version control.

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

### Modifying the Content Security Policy:
- When adding new external dependencies (scripts, styles, fonts, iframes), update the corresponding CSP directive in the `<meta>` tag in `index.html`.
- Always test Firebase Google Sign-In after modifying CSP, as the Auth popup flow depends on `script-src` (for `https://apis.google.com`) and `frame-src` (for `https://*.firebaseapp.com`).
- Avoid adding `'unsafe-eval'` to `script-src` unless absolutely necessary.

### Rules of Engagement (Build Systems):
- **Dependencies**: Never add client-side libraries manually with static script tags. Add them via `package.json` package installs.
- **Port bindings**: Dev environments must always map to port `3000` and host `0.0.0.0` for container proxies.
