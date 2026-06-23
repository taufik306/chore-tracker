import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer
} from 'firebase/firestore';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

// Enable persistent local cache to implement robust offline-first functionality
const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, databaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection testing as mandated by Firebase Skill
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    // Attempt fetching a dummy document to verify connection
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Connection Verified: Online and connected to project standard backend.");
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is currently offline. Persistence layer active.");
    } else {
      console.error("Firebase Configuration Error: check console files or environment setting.", error);
    }
    return false;
  }
}
