export type NoteTag = 'Meeting' | 'Study' | 'Idea' | 'Research' | 'Personal' | 'Action Item' | string;

export type NoteType = 'voice' | 'scan' | 'text';

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  summary: string;
  content: string;
  type: NoteType;
  tags: NoteTag[];
  keyTakeaways: string[];
  actionItems: ActionItem[];
  sentiment?: string;
  createdAt: string; // ISO date string
  durationSeconds?: number; // For voice notes
  audioUrl?: string; // Optional simulated or blob audio URL
  imageUrl?: string; // For scanned documents
  isPinned?: boolean;
  isFavorite?: boolean;
}

export type ViewTab = 'capture' | 'notes' | 'calendar' | 'search' | 'settings' | 'pricing' | 'faq';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CalendarAccount {
  id: 'google' | 'outlook' | 'apple';
  name: string;
  connected: boolean;
  email?: string;
  color: string;
}

export interface UpcomingMeeting {
  id: string;
  title: string;
  platform: 'zoom' | 'google_meet' | 'teams';
  startTime: string;
  duration: string;
  organizer: string;
  attendeesCount: number;
  autoJoin: boolean;
  calendarSource: 'Google Calendar' | 'Outlook' | 'Apple Calendar';
  meetingUrl?: string;
}

export interface AppSettings {
  summaryStyle: 'concise' | 'detailed' | 'executive';
  autoTagging: boolean;
  theme: 'dark' | 'light' | 'system';
  audioQuality: 'standard' | 'high';
  language: string;
  saveAudioFiles: boolean;
  autoJoinMeetings: boolean;
  isProPlan?: boolean;
  connectedCalendars: {
    google: boolean;
    googleEmail?: string;
    outlook: boolean;
    outlookEmail?: string;
    apple: boolean;
    appleEmail?: string;
  };
}

export interface PresetSample {
  id: string;
  title: string;
  duration: string;
  type: 'voice' | 'scan';
  transcript: string;
  imageUrl?: string;
}
