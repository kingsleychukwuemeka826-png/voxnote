import React from 'react';
import {
  Calendar,
  CalendarDays,
  Mail,
  CalendarCheck,
  Bot,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { AppSettings, Note } from '../types';

interface CalendarIntegrationsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onSaveNote: (note: Note) => void;
  onNavigateToMeetingNotes?: () => void;
}

export const CalendarIntegrationsView: React.FC<CalendarIntegrationsViewProps> = ({
  onNavigateToMeetingNotes,
}) => {
  return (
    <div className="space-y-6 pb-24 w-full max-w-4xl mx-auto">
      {/* Page Title & Header */}
      <div className="pt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Calendar & Integrations</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
              Coming Soon
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Automated calendar syncing and meeting auto-join are still in development.
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

      {/* Coming Soon Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white rounded-3xl p-6 shadow-md shadow-indigo-200 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-xl">
              <Bot className="w-5 h-5 text-indigo-200" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Automated Meeting Bot — In Development
            </h2>
          </div>
          <p className="text-xs text-indigo-100 leading-relaxed font-normal">
            We're building a real bot that joins your Zoom, Google Meet, and Microsoft Teams
            calls, records the audio, and hands you back an AI summary automatically — no manual
            recording needed. Calendar syncing and auto-join aren't live yet, so nothing on this
            page is connected to a real calendar right now.
          </p>
        </div>
      </div>

      {/* External Calendars — preview only, nothing is actually connectable yet */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-600" /> Planned Calendar Connections
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Google Calendar */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3 opacity-80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                <CalendarDays className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Google Calendar</h4>
                <p className="text-[10px] text-slate-400 font-medium">Workspace & Personal</p>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="w-full py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed border border-slate-200"
            >
              Coming Soon
            </button>
          </div>

          {/* Microsoft Outlook */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3 opacity-80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm shrink-0">
                <Mail className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Outlook / Office 365</h4>
                <p className="text-[10px] text-slate-400 font-medium">Corporate & Exchange</p>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="w-full py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed border border-slate-200"
            >
              Coming Soon
            </button>
          </div>

          {/* Apple iCloud Calendar */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3 opacity-80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0">
                <CalendarCheck className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Apple Calendar</h4>
                <p className="text-[10px] text-slate-400 font-medium">iCloud CalDAV</p>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="w-full py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed border border-slate-200"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Admin note — same pattern used on the About page for other unfinished sections */}
      <div className="rounded-2xl p-4 border-2 border-dashed border-slate-200 flex items-start gap-3">
        <Sparkles className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs leading-relaxed text-slate-500">
            <span className="font-bold text-slate-800">Why isn't this live yet?</span> Real
            calendar auto-join needs a bot that can actually join and record a video call, which
            is a separate piece of infrastructure from the rest of Voxnote. In the meantime, you
            can still record and upload meeting audio manually from the Capture tab and get the
            same AI summary and action items.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-[11px] text-slate-400 px-1">
        <ShieldCheck className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
        <span>No calendar account information is collected or stored until this feature ships.</span>
      </div>
    </div>
  );
};