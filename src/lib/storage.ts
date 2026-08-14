import { Note, AppSettings, AuthUser } from '../types';
import { INITIAL_NOTES } from '../data/initialNotes';

const NOTES_KEY = 'ai_note_taker_notes_v1';
const SETTINGS_KEY = 'ai_note_taker_settings_v1';
const USER_KEY = 'voxnote_user_v1';
const ONBOARDED_KEY = 'voxnote_onboarded_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  summaryStyle: 'concise',
  autoTagging: true,
  theme: 'dark',
  audioQuality: 'high',
  language: 'English (US)',
  saveAudioFiles: true,
  autoJoinMeetings: true,
  connectedCalendars: {
    google: true,
    googleEmail: 'user@company.com',
    outlook: false,
    apple: false,
  },
};

export function loadStoredNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) {
      localStorage.setItem(NOTES_KEY, JSON.stringify(INITIAL_NOTES));
      return INITIAL_NOTES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_NOTES;
  } catch (e) {
    console.error('Failed to load notes from localStorage:', e);
    return INITIAL_NOTES;
  }
}

export function saveStoredNotes(notes: Note[]): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes to localStorage:', e);
  }
}

export function loadStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function resetToSampleNotes(): Note[] {
  localStorage.setItem(NOTES_KEY, JSON.stringify(INITIAL_NOTES));
  return INITIAL_NOTES;
}

// --- Account (demo, client-side only) ---
// NOTE: This stores the account locally on-device for prototype/demo purposes.
// Before shipping to the Play Store, replace this with a real authentication
// backend (e.g. Firebase Auth, Supabase Auth) so accounts sync across devices
// and passwords are never handled or stored on the client.

export function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch (e) {
    return null;
  }
}

export function saveStoredUser(user: AuthUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user:', e);
  }
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDED_KEY, 'true');
}
