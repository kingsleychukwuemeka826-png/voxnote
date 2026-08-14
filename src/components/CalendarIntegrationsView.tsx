import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  CalendarDays,
  CalendarCheck,
  Mail,
  Video,
  CheckCircle2,
  XCircle,
  Plus,
  Bot,
  Sparkles,
  Clock,
  User,
  Users,
  ExternalLink,
  Zap,
  RefreshCw,
  AlertCircle,
  Play,
  Check,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { AppSettings, UpcomingMeeting, Note } from '../types';

interface CalendarIntegrationsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onSaveNote: (note: Note) => void;
  onNavigateToMeetingNotes?: () => void;
}

const INITIAL_UPCOMING_MEETINGS: UpcomingMeeting[] = [
  {
    id: 'meet-1',
    title: 'Q3 Product Strategy & AI Roadmap Sync',
    platform: 'google_meet',
    startTime: 'Today, 2:00 PM',
    duration: '45 min',
    organizer: 'Sarah Jenkins (PM)',
    attendeesCount: 6,
    autoJoin: true,
    calendarSource: 'Google Calendar',
    meetingUrl: 'https://meet.google.com/abc-defg-hij'
  },
  {
    id: 'meet-2',
    title: 'Design System & Token Handoff',
    platform: 'zoom',
    startTime: 'Today, 4:30 PM',
    duration: '30 min',
    organizer: 'Alex Rivera (Lead Designer)',
    attendeesCount: 4,
    autoJoin: true,
    calendarSource: 'Google Calendar',
    meetingUrl: 'https://zoom.us/j/9876543210'
  },
  {
    id: 'meet-3',
    title: 'Weekly Engineering Standup & Blocker Sync',
    platform: 'teams',
    startTime: 'Tomorrow, 10:00 AM',
    duration: '30 min',
    organizer: 'David Chen (Engineering)',
    attendeesCount: 8,
    autoJoin: true,
    calendarSource: 'Outlook',
    meetingUrl: 'https://teams.microsoft.com/l/meetup-join/123'
  },
  {
    id: 'meet-4',
    title: 'Client Onboarding & Enterprise Demo',
    platform: 'google_meet',
    startTime: 'Tomorrow, 1:15 PM',
    duration: '60 min',
    organizer: 'Maria Garcia (Account Exec)',
    attendeesCount: 5,
    autoJoin: false,
    calendarSource: 'Google Calendar',
    meetingUrl: 'https://meet.google.com/xyz-uvwx-rst'
  }
];

export const CalendarIntegrationsView: React.FC<CalendarIntegrationsViewProps> = ({
  settings,
  onUpdateSettings,
  onSaveNote,
  onNavigateToMeetingNotes,
}) => {
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>(INITIAL_UPCOMING_MEETINGS);
  const [connectingProvider, setConnectingProvider] = useState<'google' | 'outlook' | 'apple' | null>(null);
  const [inputEmail, setInputEmail] = useState('');
  const [simulatingMeetingId, setSimulatingMeetingId] = useState<string | null>(null);
  const [simulatingStatus, setSimulatingStatus] = useState<string>('');
  const [generatedSuccessMsg, setGeneratedSuccessMsg] = useState<string | null>(null);

  // Toggle master auto-join switch
  const handleToggleMasterAutoJoin = () => {
    const updated = !settings.autoJoinMeetings;
    onUpdateSettings({
      ...settings,
      autoJoinMeetings: updated,
    });
  };

  // Toggle individual meeting auto-join switch
  const handleToggleMeetingAutoJoin = (id: string) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, autoJoin: !m.autoJoin } : m))
    );
  };

  // Connect calendar handler
  const handleConnectCalendar = (provider: 'google' | 'outlook' | 'apple') => {
    setConnectingProvider(provider);
    setInputEmail(
      provider === 'google'
        ? 'alex.user@gmail.com'
        : provider === 'outlook'
        ? 'alex.user@outlook.com'
        : 'alex.user@icloud.com'
    );
  };

  const handleConfirmConnection = () => {
    if (!connectingProvider) return;

    const newConnectedCalendars = { ...settings.connectedCalendars };

    if (connectingProvider === 'google') {
      newConnectedCalendars.google = true;
      newConnectedCalendars.googleEmail = inputEmail || 'user@gmail.com';
    } else if (connectingProvider === 'outlook') {
      newConnectedCalendars.outlook = true;
      newConnectedCalendars.outlookEmail = inputEmail || 'user@outlook.com';
    } else if (connectingProvider === 'apple') {
      newConnectedCalendars.apple = true;
      newConnectedCalendars.appleEmail = inputEmail || 'user@icloud.com';
    }

    onUpdateSettings({
      ...settings,
      connectedCalendars: newConnectedCalendars,
    });

    setConnectingProvider(null);
  };

  const handleDisconnectCalendar = (provider: 'google' | 'outlook' | 'apple') => {
    const newConnectedCalendars = { ...settings.connectedCalendars };

    if (provider === 'google') {
      newConnectedCalendars.google = false;
      delete newConnectedCalendars.googleEmail;
    } else if (provider === 'outlook') {
      newConnectedCalendars.outlook = false;
      delete newConnectedCalendars.outlookEmail;
    } else if (provider === 'apple') {
      newConnectedCalendars.apple = false;
      delete newConnectedCalendars.appleEmail;
    }

    onUpdateSettings({
      ...settings,
      connectedCalendars: newConnectedCalendars,
    });
  };

  // Simulate auto-joining a meeting live
  const handleSimulateAutoJoin = async (meeting: UpcomingMeeting) => {
    setSimulatingMeetingId(meeting.id);
    setSimulatingStatus('Bot connecting to ' + getPlatformName(meeting.platform) + ' call...');

    try {
      await new Promise((r) => setTimeout(r, 800));
      setSimulatingStatus('Recording audio stream & transcribing speakers...');

      const sampleTranscript = `[Meeting Title: ${meeting.title}]
Organizer: ${meeting.organizer}
Platform: ${getPlatformName(meeting.platform)}
Duration: ${meeting.duration}

Speaker 1 (${meeting.organizer}): "Thanks everyone for joining our ${meeting.title}. Let us walk through the critical agenda items."
Speaker 2 (Engineering): "We have deployed the latest Gemini AI pipeline. Response times are down to 250ms."
Speaker 3 (Design): "The new high-contrast light theme is receiving high praise from mobile users."

Key Decisions & Next Steps:
1. Finalize release notes for version 2.4.
2. Monitor auto-join meeting bot reliability across Zoom and Google Meet.
3. Schedule follow-up sync for next Thursday at 2 PM.`;

      const res = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: sampleTranscript,
          titleHint: meeting.title,
          categoryHint: 'Meeting',
        }),
      });

      const data = await res.json();

      const newNote: Note = {
        id: `note-auto-${Date.now()}`,
        title: meeting.title,
        summary: data.summary || `Auto-joined ${getPlatformName(meeting.platform)} call transcript summarized by AI bot.`,
        content: data.formattedContent || sampleTranscript,
        type: 'voice',
        tags: ['Meeting', 'Action Item', getPlatformName(meeting.platform)],
        keyTakeaways: data.keyTakeaways || [
          `Auto-joined ${getPlatformName(meeting.platform)} meeting with ${meeting.attendeesCount} attendees`,
          'Gemini AI auto-generated executive summary and action items',
          `Organizer: ${meeting.organizer}`
        ],
        actionItems: (data.actionItems || [
          'Review auto-generated meeting notes and assign owners',
          'Send follow-up email to attendees'
        ]).map((item: string, idx: number) => ({
          id: `act-auto-${Date.now()}-${idx}`,
          text: item,
          completed: false,
        })),
        sentiment: 'Productive',
        createdAt: new Date().toISOString(),
        durationSeconds: 1800,
        isPinned: true,
      };

      onSaveNote(newNote);
      setSimulatingMeetingId(null);
      setGeneratedSuccessMsg(`Meeting note "${meeting.title}" generated! Filter by "Meeting Notes" to view it.`);

      setTimeout(() => {
        setGeneratedSuccessMsg(null);
      }, 5000);
    } catch (e) {
      console.error(e);
      setSimulatingMeetingId(null);
    }
  };

  const getPlatformIcon = (platform: 'zoom' | 'google_meet' | 'teams') => {
    switch (platform) {
      case 'google_meet':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
            <Video className="w-4 h-4 text-emerald-600" />
          </div>
        );
      case 'zoom':
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
            <Video className="w-4 h-4 text-blue-600" />
          </div>
        );
      case 'teams':
        return (
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
            <Video className="w-4 h-4 text-purple-600" />
          </div>
        );
    }
  };

  const getPlatformName = (platform: 'zoom' | 'google_meet' | 'teams') => {
    switch (platform) {
      case 'google_meet':
        return 'Google Meet';
      case 'zoom':
        return 'Zoom';
      case 'teams':
        return 'Microsoft Teams';
    }
  };

  return (
    <div className="space-y-6 pb-24 w-full max-w-4xl mx-auto">
      {/* Page Title & Header */}
      <div className="pt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Calendar & Integrations</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              AI Meeting Bot
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Connect external calendars to automatically join, record, and transcribe scheduled video calls.
          </p>
        </div>

        {onNavigateToMeetingNotes && (
          <button
            onClick={onNavigateToMeetingNotes}
            className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <span>View Meeting Notes</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>

      {/* Generated Success Toast Banner */}
      <AnimatePresence>
        {generatedSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 shadow-sm"
          >
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{generatedSuccessMsg}</span>
            </div>
            {onNavigateToMeetingNotes && (
              <button
                onClick={onNavigateToMeetingNotes}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm ml-2"
              >
                Go to Notes
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Master Toggle Switch Section */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white rounded-3xl p-6 shadow-md shadow-indigo-200 relative overflow-hidden">
        {/* Background glow circle */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 rounded-xl">
                <Bot className="w-5 h-5 text-indigo-200" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Auto-Join & Record Video Meetings
              </h2>
            </div>
            <p className="text-xs text-indigo-100 leading-relaxed font-normal">
              When enabled, your Voxnote bot automatically joins scheduled Zoom, Google Meet, and Microsoft Teams calls 1 minute before start, records full audio, and generates categorized transcripts with key action items.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleMasterAutoJoin}
            className={`self-start md:self-center px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
              settings.autoJoinMeetings
                ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                : 'bg-indigo-950/60 text-indigo-200 hover:bg-indigo-950/80 border border-indigo-400/30'
            }`}
          >
            {settings.autoJoinMeetings ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Auto-Join Active</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-slate-300" />
                <span>Auto-Join Disabled</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* External Calendars Connection Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-600" /> External Calendar Connections
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Syncs events every 15m</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Google Calendar */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Google Calendar</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Workspace & Personal</p>
                </div>
              </div>
            </div>

            {settings.connectedCalendars.google ? (
              <div className="space-y-2 pt-1 border-t border-slate-50">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                  <span className="text-slate-400 font-mono text-[10px] truncate max-w-[110px]">
                    {settings.connectedCalendars.googleEmail || 'user@gmail.com'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDisconnectCalendar('google')}
                  className="w-full py-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 text-[11px] font-semibold transition border border-slate-100"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="pt-1 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => handleConnectCalendar('google')}
                  className="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-100 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Connect Account
                </button>
              </div>
            )}
          </div>

          {/* Microsoft Outlook */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm shrink-0">
                  <Mail className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Outlook / Office 365</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Corporate & Exchange</p>
                </div>
              </div>
            </div>

            {settings.connectedCalendars.outlook ? (
              <div className="space-y-2 pt-1 border-t border-slate-50">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                  <span className="text-slate-400 font-mono text-[10px] truncate max-w-[110px]">
                    {settings.connectedCalendars.outlookEmail || 'user@outlook.com'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDisconnectCalendar('outlook')}
                  className="w-full py-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 text-[11px] font-semibold transition border border-slate-100"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="pt-1 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => handleConnectCalendar('outlook')}
                  className="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-100 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Connect Account
                </button>
              </div>
            )}
          </div>

          {/* Apple iCloud Calendar */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0">
                  <CalendarCheck className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Apple Calendar</h4>
                  <p className="text-[10px] text-slate-400 font-medium">iCloud CalDAV</p>
                </div>
              </div>
            </div>

            {settings.connectedCalendars.apple ? (
              <div className="space-y-2 pt-1 border-t border-slate-50">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                  <span className="text-slate-400 font-mono text-[10px] truncate max-w-[110px]">
                    {settings.connectedCalendars.appleEmail || 'user@icloud.com'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDisconnectCalendar('apple')}
                  className="w-full py-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 text-[11px] font-semibold transition border border-slate-100"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="pt-1 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => handleConnectCalendar('apple')}
                  className="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-100 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Connect Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Auto-Joined Meetings Live Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" /> Upcoming Auto-Joined Meetings
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Real-time schedule extracted from synced calendars
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100/80 shadow-2xs">
            {meetings.filter((m) => m.autoJoin).length} Scheduled for Bot
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-white border border-slate-200/80 hover:border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 space-y-3.5"
            >
              {/* Card Header Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {getPlatformIcon(meeting.platform)}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug truncate">
                        {meeting.title}
                      </h4>
                      <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                        {getPlatformName(meeting.platform)}
                      </span>
                    </div>

                    {/* Metadata Chips */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50/80 text-indigo-700 font-bold text-[11px]">
                        <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
                        {meeting.startTime} ({meeting.duration})
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px] sm:max-w-none">{meeting.organizer}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Users className="w-3 h-3 text-slate-400 shrink-0" />
                        {meeting.attendeesCount} attendees
                      </span>
                    </div>
                  </div>
                </div>

                {/* Auto Join Toggle Pill */}
                <button
                  type="button"
                  onClick={() => handleToggleMeetingAutoJoin(meeting.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    meeting.autoJoin
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/90 shadow-2xs'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                  title={meeting.autoJoin ? 'Bot Auto-Join Enabled' : 'Click to enable bot'}
                >
                  <span className="text-[11px]">
                    {meeting.autoJoin ? 'Bot ON' : 'Bot Off'}
                  </span>
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                      meeting.autoJoin ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                    }`}
                  >
                    {meeting.autoJoin && <Check className="w-2.5 h-2.5" />}
                  </div>
                </button>
              </div>

              {/* Card Footer Action Bar */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                  <span>Source:</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                    {meeting.calendarSource}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSimulateAutoJoin(meeting)}
                  disabled={simulatingMeetingId === meeting.id}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-2 transition border border-indigo-100/90 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {simulatingMeetingId === meeting.id ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                      <span className="truncate">{simulatingStatus}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="hidden sm:inline">Simulate Bot Auto-Join & Generate Note</span>
                      <span className="sm:hidden">Simulate Bot Auto-Join</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connect Modal Overlay */}
      <AnimatePresence>
        {connectingProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Connect {connectingProvider === 'google' ? 'Google Calendar' : connectingProvider === 'outlook' ? 'Outlook Calendar' : 'Apple Calendar'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Sync scheduled video calls for AI meeting notes</p>
                  </div>
                </div>
                <button
                  onClick={() => setConnectingProvider(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Account Email Address</label>
                <input
                  type="email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="Enter email..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Permissions requested: Read calendar events to detect Zoom, Google Meet, and Microsoft Teams invite links.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectingProvider(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConnection}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-200 transition"
                >
                  Authorize & Sync Calendar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
