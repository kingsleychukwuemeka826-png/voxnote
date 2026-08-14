import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Note, AppSettings } from '../types';

// Firestore layout:
//   users/{uid}/notes/{noteId}      — one document per note
//   users/{uid}/meta/settings       — a single settings document
//   users/{uid}/meta/billing        — Pro status, written ONLY by the server
//                                      (via Paystack webhooks + Firebase Admin).
//                                      The client can read it but Firestore
//                                      rules block client writes — see
//                                      BACKEND_SETUP.md.
//
// Every function here is a no-op when Firebase isn't configured, so the rest
// of the app can call them unconditionally and just get local-only behavior.

export function subscribeToCloudNotes(uid: string, onChange: (notes: Note[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const col = collection(db, 'users', uid, 'notes');
  const q = query(col, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.data() as Note)),
    (err) => console.error('[Voxnote] Cloud notes sync error:', err)
  );
}

export async function saveNoteToCloud(uid: string, note: Note): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await setDoc(doc(db, 'users', uid, 'notes', note.id), note);
  } catch (e) {
    console.error('[Voxnote] Failed to sync note to cloud:', e);
  }
}

export async function deleteNoteFromCloud(uid: string, noteId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, 'users', uid, 'notes', noteId));
  } catch (e) {
    console.error('[Voxnote] Failed to delete cloud note:', e);
  }
}

export async function saveSettingsToCloud(uid: string, settings: AppSettings): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await setDoc(doc(db, 'users', uid, 'meta', 'settings'), settings);
  } catch (e) {
    console.error('[Voxnote] Failed to sync settings to cloud:', e);
  }
}

export interface BillingRecord {
  isProPlan: boolean;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  status?: string;
  plan?: string;
}

// Read-only from the client's perspective — see the note at the top of this
// file. Fires with `null` if there's no billing doc yet (i.e. never subscribed).
export function subscribeToBillingStatus(uid: string, onChange: (billing: BillingRecord | null) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  return onSnapshot(
    doc(db, 'users', uid, 'meta', 'billing'),
    (snap) => onChange(snap.exists() ? (snap.data() as BillingRecord) : null),
    (err) => console.error('[Voxnote] Billing status sync error:', err)
  );
}
