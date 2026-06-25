# Chore Tracker

A daily chore activities tracker application with offline-first capabilities, real-time cross-device cloud synchronization, automated warning chimes, and interactive trend metrics dashboards.

---

## 🚀 Key Features

- **Dynamic Checklist Chore Records**: Commences active chore tracking with real-time dynamic ticking counter clocks.
- **Enforced Time Boundaries**: Enforce optional time targets on chores. Custom sound alarms (rendered client-side via Web Audio API) chime automatically when limits expire.
- **Implicit Limits for Ongoing Tasks**: Non-time-limited tasks automatically trigger alert chimes and warning badges upon continuous running for 1 day (24 hours).
- **Offline-First Resilience**: Full local cache queries which synchronizes dynamically with Firestore automatically once network connectivity is restored.
- **Visual Analytics Dashboard**: Interactive area trend charts (powered by Recharts) detailing progress, completed metrics, and historical rates.
- **Cross-Device Synchronization**: Integrated Firebase Authentication allowing credentials to unlock seamless multi-device state access.
- **Responsive Dark Mode**: Fully realized modern layout optimized for both light and dark modes.

---

## 🛠️ Technology Stack

- **Frontend Core**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite 6](https://vitejs.dev/) + [ESLint](https://eslint.org/)
- **Styling Architecture**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend Services**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (Persistent offline local caches)
- **Authenticating Registry**: [Firebase Authentication](https://firebase.google.com/docs/auth) (Google OAuth Provider)
- **Native Mobile Wrapper**: [Capacitor 6](https://capacitorjs.com/) (Android APK Deployment)
- **Data Visualizer**: [Recharts](https://recharts.org/)
- **Animation Motion**: [Motion (Framer Motion)](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📋 Prerequisites

Before running this project, ensure your environment meets the following minimum requirements:

- **Node.js**: v20.19.0 or higher (or v22.12.0+). *Note: Node v18, v19, and v21 are strictly excluded by Vite React plugin constraints.*
- **npm**: v7 or higher (ships with Node 20+ for lockfile v3 support).
- **Browser**: A modern browser supporting Web Audio API, IndexedDB, and ES2022 features (Chrome 94+, Firefox 93+, Safari 15.4+, Edge 94+).
- **Firebase Project**: Configured for Firestore Database and Authentication (Google OAuth).
- **Environment Variables**: Create a `.env` file based on `.env.example` with your valid Firebase project credentials.
- **Android Builds**: To run the native Android app, you must download `google-services.json` from your Firebase Console and place it exactly at `android/app/google-services.json`. Make sure your keystore's SHA-1 fingerprint is registered in Firebase.

---

## 📁 Repository Structure

```text
├── docs/                        # Deep-dive system technical documentation
│   └── technical-documentation.md
├── android/                     # Capacitor Native Android Project (Built automatically via cap sync)
├── src/
│   ├── components/              # Highly modular UI components
│   │   ├── ActiveList.tsx       # Live ticking checklists, search, and sorting logic
│   │   ├── ChoreForm.tsx        # Chore initializer form with priority & presets
│   │   ├── Dashboard.tsx        # Goal percentages and Recharts visual trends
│   │   └── NotificationCenter.tsx # Alarm/timeout alert records list drop shadow
│   ├── lib/
│   │   ├── error-handler.ts     # Encoded logging helper for database errors
│   │   └── firebase.ts          # Storage cache setup & database connectors
│   ├── utils/
│   │   └── sound.ts             # Web Audio API Synthesizer with double and triple beeps
│   ├── types.ts                 # Enums & schemas (Chore, Notification, Stats)
│   ├── App.tsx                  # Core state orchestrator and entry hub (includes Native Auth flow)
│   ├── index.css                # Global styles with Tailwind @import theme variables
│   └── main.tsx                 # React DOM mount context
├── capacitor.config.ts          # Capacitor configuration (Native bridging and plugin setup)
├── firebase-blueprint.json      # Structured Firestore schema metadata
├── firestore.rules              # Restrictive backend authorization rules
├── .env.example                 # Environment variables template for Firebase config
├── metadata.json                # Application permissions capability configs
├── package.json                 # Dependency version specs & builds
└── tsconfig.json                # Strict compiler parameters
```

---

## 📚 Documentation Map

For deep dives into specific subsystems, please refer to the detailed documentation:
- 📖 [Technical Index & Onboarding](docs/technical-documentation.md)
- 💾 [Sync Engine & State Management](docs/state/sync-engine.md)
- 🔒 [Security & Authorization Model](docs/auth/security-model.md)
- 🧩 [UI Components (ChoreForm, Audio)](docs/components/chore-form.md)
- ⚠️ [Error Handling & API](docs/api/error-handling.md)
- 📱 [Android Native Deployment](docs/deployment/android-capacitor.md)

---

## 🏗️ Technical Architecture Highlights

### ⚡ Cache-First Sync Engine (Offline Capability)
By implementing `persistentLocalCache` and `persistentMultipleTabManager` from the Firestore SDK inside `src/lib/firebase.ts`, queries and reads are instantly evaluated against local IndexedDB tables. Writes are persisted instantly in cache and placed in a pipeline queue to upload silently to Firebase servers when network connection returns.

### 🔊 Dynamic Synthesizer Alarms
Instead of requesting heavy and unreliable static `.mp3` or `.wav` alarm assets, `src/utils/sound.ts` utilizes the native **Web Audio API** (`AudioContext`). It synthesizes clean double chimes for warnings and a triple-decaying sinusoidal wave beep for timeout alarms. This ensures 100% reliability, zero file-loading lag, and works fully offline.

---

## ⚙️ Setup and Lifecycle Commands

### Install Project Dependencies
```bash
npm install
```

### Run Local Development Server
```bash
npm run dev
```

### Production Build compilation
```bash
npm run build
```

### Linting Validation
```bash
npm run lint
```

### Build & Sync Android APK source
Compiles the web bundle and synchronizes it into the native Android Capacitor project.
```bash
npm run cap:build
```

### Open Android Studio
Opens the bridged Capacitor project in Android Studio for native deployment and APK signing.
```bash
npm run cap:open
```
