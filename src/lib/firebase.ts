import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Firebase config — read from Vite env vars (see .env.example).
// Voxnote is designed to run fully in "local demo mode" (accounts + notes
// stored on-device only) until these are filled in, so you can keep
// developing before you've created a Firebase project or added billing.
// Once VITE_FIREBASE_* is set in .env.local, auth and notes automatically
// switch over to syncing through Firebase — no other code changes needed.
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  } catch (e) {
    console.error('[Voxnote] Failed to initialize Firebase:', e);
  }
} else if (typeof window !== 'undefined') {
  console.warn(
    '[Voxnote] Firebase is not configured — running in local-only demo mode. ' +
      'Add VITE_FIREBASE_* keys to .env.local to enable real accounts and cloud sync ' +
      '(see BACKEND_SETUP.md).'
  );
}

export const auth = authInstance;
export const db = dbInstance;
