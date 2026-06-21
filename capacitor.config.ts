import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ragnarok.choretracker',
  appName: 'Chore Tracker',
  webDir: 'dist',
  server: {
    // Required for Firebase Auth to work correctly inside Android WebView.
    // Without https scheme, Firebase rejects the origin as insecure.
    androidScheme: 'https'
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com']
    }
  }
};

export default config;
