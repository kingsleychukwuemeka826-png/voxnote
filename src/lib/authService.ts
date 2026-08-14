import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { AuthUser } from '../types';
import { loadStoredUser, saveStoredUser, clearStoredUser } from './storage';

const toAuthUser = (fbUser: FirebaseUser): AuthUser => ({
  id: fbUser.uid,
  name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Voxnote User',
  email: fbUser.email || '',
  createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
});

const FRIENDLY_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': "An account with this email already exists — try logging in instead.",
  'auth/invalid-email': "That email address doesn't look right.",
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password. Try again.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts — please wait a moment and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
};

export function friendlyAuthError(err: any): string {
  const code = err?.code as string | undefined;
  if (code && FRIENDLY_ERRORS[code]) return FRIENDLY_ERRORS[code];
  return err?.message || 'Something went wrong. Please try again.';
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<AuthUser> {
  if (isFirebaseConfigured && auth) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    return { ...toAuthUser(cred.user), name };
  }
  // Local demo fallback — no Firebase project configured yet.
  const user: AuthUser = { id: `local-${Date.now()}`, name, email, createdAt: new Date().toISOString() };
  saveStoredUser(user);
  return user;
}

export async function logInWithEmail(email: string, password: string): Promise<AuthUser> {
  if (isFirebaseConfigured && auth) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return toAuthUser(cred.user);
  }
  const existing = loadStoredUser();
  if (existing && existing.email.toLowerCase() === email.toLowerCase()) return existing;
  const user: AuthUser = { id: `local-${Date.now()}`, name: email.split('@')[0], email, createdAt: new Date().toISOString() };
  saveStoredUser(user);
  return user;
}

export async function logInWithGoogle(): Promise<AuthUser> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Google sign-in needs Firebase configured first — add your keys to .env.local.');
  }
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return toAuthUser(cred.user);
}

export async function logOutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }
  clearStoredUser();
}

// Fires immediately with the current user (or null), then again on every
// sign-in/sign-out. Returns an unsubscribe function.
export function subscribeToAuthChanges(callback: (user: AuthUser | null) => void): () => void {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, (fbUser) => {
      callback(fbUser ? toAuthUser(fbUser) : null);
    });
  }
  callback(loadStoredUser());
  return () => {};
}
