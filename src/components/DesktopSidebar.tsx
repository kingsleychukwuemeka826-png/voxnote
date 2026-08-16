import React from 'react';
import { ViewTab } from '../types';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import { Logo } from './Logo';
import { logOutUser } from '../lib/authService';
import {
  Mic,
  FileText,
  Calendar,
  Search,
  Settings,
  Sparkles,
  Camera,
  Zap,
  Crown,
  HelpCircle,
  LogOut
} from 'lucide-react';

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

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  setActiveTab,
  notesCount,
  onOpenVoiceRecorder,
  onOpenDocScanner,
  onOpenPasteSummarize,
  onCreateNewTextNote,
  isPro = false,
}) => {
  interface NavItem {
    id: ViewTab;
    label: string;
    icon: any;
    badge?: number;
    highlight?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'capture', label: 'Capture & Record', icon: Mic },
    { id: 'notes', label: 'All Notes', icon: FileText, badge: notesCount },
    { id: 'calendar', label: 'Calendar & Integrations', icon: Calendar },
    { id: 'search', label: 'Search & Ask AI', icon: Search },
    { id: 'pricing', label: isPro ? 'Pro Subscription' : 'Upgrade to Pro', icon: Crown, highlight: true },
    { id: 'faq', label: 'Help & FAQ', icon: HelpCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
    if (window.confirm('Log out of Voxnote on this device?')) {
      logOutUser();
      window.location.reload();
    }
  };

  return (
    <aside className="w-64 xl:w-72 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between shrink-0 h-[calc(100vh-2rem)] sticky top-4 overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Logo className="w-10 h-10" rounded="rounded-2xl" />
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-none">Voxnote</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gemini AI</span>
              </div>
            </div>
          </div>
          <OnlineStatusIndicator compact />
        </div>

        <div className="space-y-2">
          <button onClick={onOpenVoiceRecorder} className="w-full py-2.5 px-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition">
            <Mic className="w-4 h-4" />
            <span>Record Voice Note</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onOpenPasteSummarize} className="py-2 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center gap-1.5 border border-indigo-100 transition">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Paste Text</span>
            </button>
            <button onClick={onOpenDocScanner} className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1.5 border border-slate-200 transition">
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              <span>Scan Doc</span>
            </button>
          </div>
        </div>

        <nav className="space-y-1 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">Navigation</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id as ViewTab)} className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${isActive ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/80 shadow-sm' : item.highlight ? 'text-indigo-700 bg-gradient-to-r from-amber-50 to-indigo-50 hover:from-amber-100 hover:to-indigo-100 border border-amber-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : item.highlight ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.highlight && !isPro && <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-2xs">7-Day Trial</span>}
                {item.badge !== undefined && <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{item.badge}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <p className="font-bold text-slate-800 text-[11px]">Local Auto-Save</p>
            <p className="text-[10px] text-slate-400 font-medium">All data client-stored</p>
          </div>
          <Zap className="w-4 h-4 text-emerald-500" />
        </div>
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition">
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};
