import React from 'react';
import { Mic, FileText, Calendar, Search, Settings } from 'lucide-react';
import { ViewTab } from '../types';

interface BottomNavProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  notesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, notesCount }) => {
  const tabs: { id: ViewTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'capture', label: 'Home', icon: Mic },
    { id: 'notes', label: 'Notes', icon: FileText, badge: notesCount },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto rounded-[22px] border border-slate-200/80 bg-white/90 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(15,23,42,0.08),0_8px_30px_rgba(15,23,42,0.06)] px-1.5 py-1.5">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[17px] px-2 py-2 transition-all duration-200 active:scale-95 ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'}`}
              >
                {isActive && <span className="absolute inset-0 rounded-[17px] bg-indigo-50 border border-indigo-100/80" />}
                <span className="relative">
                  <Icon className={`w-[19px] h-[19px] ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-slate-950 text-white text-[8px] leading-[15px] font-extrabold text-center border-2 border-white">{tab.badge}</span>
                  )}
                </span>
                <span className={`relative text-[9px] tracking-tight ${isActive ? 'font-extrabold' : 'font-semibold'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
