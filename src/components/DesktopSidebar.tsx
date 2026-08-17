import React from 'react';
import { ViewTab } from '../types';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import { Logo } from './Logo';
import { logOutUser } from '../lib/authService';
import { Mic, FileText, Calendar, Search, Settings, ClipboardPaste, Camera, Crown, HelpCircle, AudioLines, LockKeyhole, LogOut } from 'lucide-react';

interface DesktopSidebarProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  notesCount: number;
  onOpenVoiceRecorder: () => void;
  onOpenMeetingMode: () => void;
  onOpenDocScanner: () => void;
  onOpenPasteSummarize: () => void;
  onCreateNewTextNote: () => void;
  isPro?: boolean;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab, setActiveTab, notesCount, onOpenVoiceRecorder, onOpenMeetingMode, onOpenDocScanner, onOpenPasteSummarize, onCreateNewTextNote, isPro = false }) => {
  const navItems = [
    { id: 'capture' as ViewTab, label: 'Capture', icon: Mic },
    { id: 'notes' as ViewTab, label: 'Notes', icon: FileText, badge: notesCount },
    { id: 'calendar' as ViewTab, label: 'Calendar', icon: Calendar },
    { id: 'search' as ViewTab, label: 'Ask AI', icon: Search },
    { id: 'pricing' as ViewTab, label: isPro ? 'Pro Subscription' : 'Upgrade to Pro', icon: Crown, highlight: true },
    { id: 'faq' as ViewTab, label: 'Help & FAQ', icon: HelpCircle },
    { id: 'settings' as ViewTab, label: 'Settings', icon: Settings },
  ];
  const handleLogout = () => { if (confirm('Log out of Voxnote on this device?')) { logOutUser(); window.location.reload(); } };

  return (
    <aside className="relative z-30 w-64 xl:w-72 bg-white/90 backdrop-blur-xl border border-slate-200/70 rounded-[28px] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] flex flex-col shrink-0 h-[calc(100vh-2rem)] sticky top-4 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <div className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Logo className="w-10 h-10" rounded="rounded-[14px]" />
              <div>
                <h2 className="text-[15px] font-extrabold text-slate-950 tracking-tight leading-none">Voxnote</h2>
                <div className="flex items-center gap-1.5 mt-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">AI workspace</span></div>
              </div>
            </div>
            <OnlineStatusIndicator compact />
          </div>

          <div className="rounded-[20px] bg-slate-950 p-2 shadow-lg shadow-slate-900/10">
            <button onClick={onOpenVoiceRecorder} className="w-full py-3 px-3 rounded-[15px] bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-[12px] flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 transition-all"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15"><Mic className="w-3.5 h-3.5" /></span>Record a note</button>
            <button onClick={() => isPro ? onOpenMeetingMode() : setActiveTab('pricing')} className="w-full mt-1.5 py-2.5 px-3 rounded-[13px] bg-white/10 hover:bg-white/15 text-slate-100 font-bold text-[10px] flex items-center gap-2 transition-colors"><AudioLines className="w-3.5 h-3.5 text-indigo-300" /><span>Meeting Mode</span>{!isPro ? <span className="ml-auto inline-flex items-center gap-1 text-[8px] uppercase tracking-wider text-amber-200"><LockKeyhole className="w-2.5 h-2.5" />Pro</span> : <span className="ml-auto text-[8px] uppercase tracking-wider text-indigo-200">Desktop</span>}</button>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5"><button onClick={onOpenPasteSummarize} className="py-2.5 rounded-[13px] text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center gap-1.5 transition-colors"><ClipboardPaste className="w-3.5 h-3.5" />Paste</button><button onClick={onOpenDocScanner} className="py-2.5 rounded-[13px] text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center gap-1.5 transition-colors"><Camera className="w-3.5 h-3.5" />Scan</button></div>
          </div>

          <nav className="space-y-1 pb-2">
            <p className="px-3 mb-2 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-[14px] text-[12px] font-semibold transition-all ${isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100' : item.highlight ? 'bg-gradient-to-r from-amber-50 to-indigo-50 text-indigo-700 ring-1 ring-amber-100 hover:shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'}`}><span className="flex items-center gap-3"><Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : item.highlight ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-600'}`} /><span>{item.label}</span></span>{item.highlight && !isPro && <span className="text-[8px] font-extrabold uppercase px-1.5 py-1 rounded-full bg-amber-300 text-amber-950">Pro</span>}{item.badge !== undefined && <span className={`min-w-6 text-center text-[9px] font-extrabold px-1.5 py-1 rounded-full ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.badge}</span>}</button>;
            })}
          </nav>
        </div>
      </div>

      <div className="shrink-0 pt-3 mt-3 border-t border-slate-100 bg-white/90">
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-[14px] border border-slate-200 bg-white text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all"><LogOut className="w-3.5 h-3.5" />Log out</button>
      </div>
    </aside>
  );
};
