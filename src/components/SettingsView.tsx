import React, { useState } from 'react';
import {
  Settings,
  Sparkles,
  Sliders,
  Volume2,
  Database,
  Download,
  RotateCcw,
  ShieldCheck,
  Globe,
  Moon,
  Info,
  Calendar,
  Video,
  ChevronRight,
  Bot,
  CheckCircle2,
  Crown,
  Zap,
  HelpCircle
} from 'lucide-react';
import { AppSettings, Note, AuthUser } from '../types';
import { CalendarIntegrationsView } from './CalendarIntegrationsView';
import { PricingView } from './PricingView';
import { FaqView } from './FaqView';
import { createPortalSession } from '../lib/billingService';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetData: () => void;
  notesCount: number;
  notes?: Note[];
  onSaveNote?: (note: Note) => void;
  onNavigateToMeetingNotes?: () => void;
  onReplayOnboarding?: () => void;
  onOpenPricing?: () => void;
  initialSubTab?: 'general' | 'calendar' | 'pricing' | 'faq';
  user?: AuthUser | null;
  onLogout?: () => void;
  isPro?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetData,
  notesCount,
  notes = [],
  onSaveNote,
  onNavigateToMeetingNotes,
  onReplayOnboarding,
  onOpenPricing,
  initialSubTab = 'general',
  user,
  onLogout,
  isPro: isProOverride,
}) => {
  const [subTab, setSubTab] = useState<'general' | 'calendar' | 'pricing' | 'faq'>(initialSubTab);
  const isPro = isProOverride ?? (settings.isProPlan ?? false);

  return (
    <div className="space-y-6 pb-24 w-full max-w-4xl mx-auto">
      {/* Settings Top Sub-Nav Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl w-full max-w-lg overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSubTab('general')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            subTab === 'general'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>General</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('calendar')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            subTab === 'calendar'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('pricing')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            subTab === 'pricing'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50'
          }`}
        >
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Pro Plans</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('faq')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
            subTab === 'faq'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
          <span>Help & FAQ</span>
        </button>
      </div>

      {subTab === 'calendar' ? (
        <CalendarIntegrationsView
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onSaveNote={onSaveNote || (() => {})}
          onNavigateToMeetingNotes={onNavigateToMeetingNotes}
        />
      ) : subTab === 'pricing' ? (
        <PricingView settings={settings} onUpdateSettings={onUpdateSettings} user={user} isPro={isPro} notes={notes} />
      ) : subTab === 'faq' ? (
        <FaqView onNavigateToPricing={() => setSubTab('pricing')} />
      ) : (
        <>
          {/* Header */}
          <div className="pt-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
            <p className="text-xs text-slate-400 font-medium">Configure AI note synthesis, audio & storage</p>
          </div>

          {/* Account Card */}
          {user && (
            <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={() => {
                    if (confirm('Log out of Voxnote on this device?')) onLogout();
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition shrink-0"
                >
                  Log Out
                </button>
              )}
            </div>
          )}

          {/* Upgrade to Pro Banner in Settings */}
          <div
            onClick={() => {
              if (isPro && user) {
                createPortalSession(user.id).then((result) => {
                  if (result.configured && result.url) window.location.href = result.url;
                  else setSubTab('pricing');
                });
              } else {
                setSubTab('pricing');
              }
            }}
            className="cursor-pointer bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl p-5 shadow-lg shadow-indigo-900/20 transition hover:shadow-indigo-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group relative overflow-hidden"
          >
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 flex items-center justify-center shadow-md font-black shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold tracking-tight">
                    {isPro ? 'Pro Plan Active' : 'Upgrade to Pro'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 shadow-2xs">
                    {isPro ? 'ACTIVE' : 'SAVE 30%'}
                  </span>
                </div>
                <p className="text-xs text-indigo-200 font-medium mt-0.5">
                  {isPro
                    ? '1,500 transcription minutes & automated calendar bot enabled'
                    : 'Unlock automated meeting auto-join, 1,500 monthly minutes & AI personas'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0 relative z-10">
              <span className="text-xs font-bold px-3 py-2 bg-white text-indigo-950 rounded-xl shadow-sm group-hover:bg-amber-400 transition">
                {isPro ? 'Manage Plan' : 'View Pricing & Trial'}
              </span>
              <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Quick Banner for Calendar & Integrations */}
          <div
            onClick={() => setSubTab('calendar')}
            className="cursor-pointer bg-gradient-to-r from-indigo-50 to-indigo-100/60 border border-indigo-100 hover:border-indigo-200 rounded-3xl p-4 shadow-sm transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Calendar & Integrations</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                    {settings.autoJoinMeetings ? 'Auto-Join ON' : 'Off'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Google Calendar, Outlook, Apple Calendar & video meeting bot
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-indigo-600 group-hover:translate-x-1 transition" />
          </div>

          {/* AI Intelligence Configuration */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <Sparkles className="w-4 h-4 text-indigo-600" /> AI Note Processor
            </div>

            {/* Summary Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Default AI Summary Style</label>
              <div className="grid grid-cols-3 gap-2">
                {(['concise', 'detailed', 'executive'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, summaryStyle: style })}
                    className={`py-2 px-3 rounded-xl text-xs capitalize font-semibold transition border ${
                      settings.summaryStyle === style
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Tagging */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">Automatic Tag Generation</p>
                <p className="text-[11px] text-slate-400 font-medium">Auto-classify notes as Meeting, Study, Idea</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoTagging}
                onChange={(e) => onUpdateSettings({ ...settings, autoTagging: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Audio & Speech */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
              <Volume2 className="w-4 h-4 text-emerald-600" /> Audio Recording Quality
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Audio Sample Quality</p>
                <p className="text-[11px] text-slate-400 font-medium">High bitrate voice processing</p>
              </div>
              <select
                value={settings.audioQuality}
                onChange={(e: any) => onUpdateSettings({ ...settings, audioQuality: e.target.value })}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
              >
                <option value="standard">Standard (16kHz)</option>
                <option value="high">High Studio (24kHz)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">Primary Language</p>
                <p className="text-[11px] text-slate-400 font-medium">Target transcription language</p>
              </div>
              <select
                value={settings.language}
                onChange={(e: any) => onUpdateSettings({ ...settings, language: e.target.value })}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none cursor-pointer max-w-[180px] sm:max-w-[240px]"
              >
                <optgroup label="Popular Languages">
                  <option value="English (US)">English (US)</option>
                  <option value="English (UK)">English (UK)</option>
                  <option value="Spanish (Latin America)">Spanish (Latin America)</option>
                  <option value="Spanish (Spain)">Spanish (Spain)</option>
                  <option value="French (France)">French (France)</option>
                  <option value="German">German</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Chinese (Mandarin - Simplified)">Chinese (Mandarin)</option>
                  <option value="Portuguese (Brazil)">Portuguese (Brazil)</option>
                </optgroup>
                <optgroup label="Americas & Europe">
                  <option value="English (Canada)">English (Canada)</option>
                  <option value="English (Australia)">English (Australia)</option>
                  <option value="French (Canada)">French (Canada)</option>
                  <option value="Italian">Italian</option>
                  <option value="Portuguese (Portugal)">Portuguese (Portugal)</option>
                  <option value="Dutch">Dutch</option>
                  <option value="Russian">Russian</option>
                  <option value="Ukrainian">Ukrainian</option>
                  <option value="Polish">Polish</option>
                  <option value="Swedish">Swedish</option>
                  <option value="Greek">Greek</option>
                  <option value="Czech">Czech</option>
                  <option value="Romanian">Romanian</option>
                  <option value="Hungarian">Hungarian</option>
                  <option value="Danish">Danish</option>
                  <option value="Finnish">Finnish</option>
                  <option value="Norwegian">Norwegian</option>
                </optgroup>
                <optgroup label="Asia & Pacific">
                  <option value="English (India)">English (India)</option>
                  <option value="Chinese (Traditional - Taiwan/HK)">Chinese (Traditional)</option>
                  <option value="Korean">Korean</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Punjabi">Punjabi</option>
                  <option value="Urdu">Urdu</option>
                  <option value="Vietnamese">Vietnamese</option>
                  <option value="Indonesian">Indonesian</option>
                  <option value="Filipino / Tagalog">Filipino / Tagalog</option>
                  <option value="Thai">Thai</option>
                  <option value="Malay">Malay</option>
                </optgroup>
                <optgroup label="Middle East & Africa">
                  <option value="Arabic (Standard)">Arabic (Standard)</option>
                  <option value="Hebrew">Hebrew</option>
                  <option value="Turkish">Turkish</option>
                  <option value="Swahili">Swahili</option>
                  <option value="Igbo">Igbo</option>
                  <option value="Yoruba">Yoruba</option>
                  <option value="Hausa">Hausa</option>
                  <option value="Afrikaans">Afrikaans</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Data & Storage Management */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600">
              <Database className="w-4 h-4 text-purple-600" /> Data Storage & Management
            </div>

            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="font-medium">Stored Notes Count:</span>
              <span className="font-bold text-indigo-600">{notesCount} Notes</span>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={onResetData}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs border border-amber-200 flex items-center justify-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4" /> Reset to Sample Notes Data
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
