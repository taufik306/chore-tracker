import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import { Capacitor } from '@capacitor/core';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';
import { app } from './lib/firebase';
import App from './App.tsx';
import './index.css';

// Initialize Native App Check as early as possible before any Firebase SDKs connect
const initAppCheck = async () => {
  if (import.meta.env.VITE_ENABLE_APP_CHECK !== 'true') {
    console.log('Firebase App Check is disabled via feature flag.');
    return;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Initialize the Native Capacitor Plugin (Play Integrity)
      await FirebaseAppCheck.initialize({
        // Control debugToken flag through environment variable
        debugToken: import.meta.env.VITE_USE_DEBUG_APP_CHECK === 'true',
      });

      // 2. Build the bridge: Tell the JS SDK to get tokens from the Native Plugin
      const customProvider = new CustomProvider({
        getToken: async () => {
          const { token, expireTimeMillis } = await FirebaseAppCheck.getToken();
          return {
            token,
            expireTimeMillis,
          };
        }
      });

      // 3. Initialize App Check in the JS SDK with our bridge
      initializeAppCheck(app, {
        provider: customProvider,
        isTokenAutoRefreshEnabled: true
      });

      console.log(`Firebase App Check initialized for Native Android (Debug: ${import.meta.env.DEV})`);
    } catch (e) {
      console.error("Firebase App Check initialization failed:", e);
    }
  }
};

initAppCheck().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
