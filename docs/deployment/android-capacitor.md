---
tldr: Guide on packaging the web application as a native Android APK using Capacitor 6 and handling Native Google Sign-In.
---
# Android Native Deployment (Capacitor)

The web application can be packaged as a native Android APK using **Capacitor 6** with the help of script: `npm run cap:build`. When running `npm run cap:build`, the following sequence occurs and produces specific artifacts:

1. **Web Build (`vite build`)**: The React application is compiled and minified into static HTML, JavaScript, and CSS files, which are placed in the `dist/` directory at the project root.
2. **Capacitor Sync (`npx cap sync android`)**: The Capacitor CLI copies these web assets from the `dist/` directory directly into the Android native project folder at `android/app/src/main/assets/public/`. It also updates and synchronizes native Capacitor plugins and configuration changes by modifying:
   - `android/app/src/main/assets/capacitor.config.json`: The compiled version of the root `capacitor.config.ts` settings.
   - `android/app/src/main/assets/capacitor.plugins.json`: A generated map of all installed Capacitor plugins.
   - `android/capacitor.settings.gradle` and `android/app/capacitor.build.gradle`: Auto-generated Gradle instructions to link installed native plugin dependencies.

## Native Google Sign-In

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
