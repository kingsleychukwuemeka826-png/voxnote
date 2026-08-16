import React, { useEffect, useState } from 'react';
import { ViewTab, Note, AuthUser } from '../types';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import { Logo } from './Logo';
import { subscribeToAuthChanges, logOutUser } from '../lib/authService';
import { isFirebaseConfigured } from '../lib/firebase';
import { loadStoredNotes, saveStoredNotes } from '../lib/storage';
import { saveNoteToCloud } from '../lib/cloudSync';
import { MeetingModeModal } from './MeetingModeModal';
import { Mic, FileText, Calendar, Search, Settings, ClipboardPaste, Camera, Zap, Crown, HelpCircle, AudioLines, LockKeyhole, LogOut } from 'lucide-react';

interface DesktopSidebarProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  notesCount: number;
  onOpenVoiceRecorder: () => void;
  onOpenDocScanner: () => void;
  onOpenPasteSummarize: () => void;
  onCreateNewTextNote: () => void;
  isPro?: boolean;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab, setActiveTab, notesCount, onOpenVoiceRecorder, onOpenDocScanner, onOpenPasteSummarize, onCreateNewTextNote, isPro = false }) => {
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  useEffect(() => subscribeToAuthChanges(setCurrentUser), []);

  const handleLogout = () => {
    if (window.confirm('Log out of Voxnote on this device?')) {
      logOutUser();
      window.location.reload();
    }
  };

  const handleSaveMeetingNote = (note: Note) => {
    saveStoredNotes([note, ...loadStoredNotes()]);
    if (isFirebaseConfigured && currentUser) saveNoteToCloud(currentUser.id, note);
  };

  const navItems = [
    { id: 'capture' as ViewTab, label: 'Capture & Record', icon: Mic },
    { id: 'notes' as ViewTab, label: 'All Notes', icon: FileText, badge: notesCount },
    { id: 'calendar' as ViewTab, label: 'Calendar & Integrations', icon: Calendar },
    { id: 'search' as ViewTab, label: 'Search & Ask AI', icon: Search },
    { id: 'pricing' as ViewTab, label: isPro ? 'Pro Subscription' : 'Upgrade to Pro', icon: Crown, highlight: true },
    { id: 'faq' as ViewTab, label: 'Help & FAQ', icon: HelpCircle },
    { id: 'settings' as ViewTab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <aside className="w-64 xl:w-72 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col shrink-0 h-[calc(100vh-2rem)] sticky top-4 overflow-hidden z-30">
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <div className="space-y-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3"><Logo className="w-10 h-10" rounded="rounded-2xl" /><div><h2 className="text-base font-bold text-slate-900 tracking-tight leading-none">Voxnote</h2><div className="flex items-center gap-1.5 mt-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gemini AI</span></div></div></div>
              <OnlineStatusIndicator compact />
            </div>
            <div className="rounded-2xl bg-slate-950 p-2 shadow-lg shadow-slate-900/10">
              <button onClick={onOpenVoiceRecorder} className="w-full py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 transition"><Mic className="w-4 h-4" />Record a note</button>
              <button onClick={() => isPro ? setIsMeetingModalOpen(true) : setActiveTab('pricing')} className="w-full mt-1.5 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 font-bold text-[10px] flex items-center gap-2 transition"><AudioLines className="w-3.5 h-3.5 text-indigo-300" /><span>Meeting Mode</span>{!isPro ? <span className="ml-auto inline-flex items-center gap-1 text-[8px] uppercase tracking-wider text-amber-200"><LockKeyhole className="w-2.5 h-2.5" />Pro</span> : <span className="ml-auto text-[8px] uppercase tracking-wider text-indigo-200">Desktop</span>}</button>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5"><button onClick={onOpenPasteSummarize} className="py-2.5 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center gap-1.5 transition"><ClipboardPaste className="w-3.5 h-3.5" />Paste</button><button onClick={onOpenDocScanner} className="py-2.5 rounded-xl text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center gap-1.5 transition"><Camera className="w-3.5 h-3.5" />Scan</button></div>
            </div>
            <nav className="space-y-1 pt-2 pb-1"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">Navigation</p>{navItems.map((item) => { const Icon = item.icon; const isActive = activeTab === item.id; return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/80 shadow-sm' : item.highlight ? 'text-indigo-700 bg-gradient-to-r from-amber-50 to-indigo-50 hover:from-amber-100 hover:to-indigo-100 border border-amber-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}><div className="flex items-center gap-3"><Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : item.highlight ? 'text-amber-500' : 'text-slate-400'}`} /><span>{item.label}</span></div>{item.highlight && !isPro && <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950">7-Day Trial</span>}{item.badge !== undefined && <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{item.badge}</span>}</button>; })}</nav>
          </div>
        </div>
        <div className="shrink-0 space-y-3 pt-4 mt-2 border-t border-slate-100 bg-white"><div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs"><div className="space-y-0.5"><p className="font-bold text-slate-800 text-[11px]">Local Auto-Save</p><p className="text-[10px] text-slate-400 font-medium">All data client-stored</p></div><Zap className="w-4 h-4 text-emerald-500" /></div><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition"><LogOut className="w-4 h-4" /><span>Log out</span></button></div>
      </aside>
      <MeetingModeModal isOpen={isMeetingModalOpen} onClose={() => setIsMeetingModalOpen(false)} onSaveNote={handleSaveMeetingNote} />
    </>
  );
};