import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import './index.css';

// Initialize Native App Check as early as possible before any Firebase SDKs connect
const initAppCheck = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAppCheck.initialize({
        debugToken: true, // Use debugToken instead of the deprecated debug flag
      });
      console.log("Firebase App Check initialized for Native Android");
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
