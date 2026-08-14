import React from 'react';
import { Mic, FileText, Calendar, Search, Settings } from 'lucide-react';
import { ViewTab } from '../types';

interface BottomNavProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  notesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  notesCount,
}) => {
  const tabs: { id: ViewTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'capture', label: 'Capture', icon: Mic },
    { id: 'notes', label: 'All Notes', icon: FileText, badge: notesCount },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-2 sm:px-6 py-2 pb-3 sm:pb-2.5 shadow-lg shadow-slate-200/50">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all duration-200 min-w-[56px] sm:min-w-[64px] ${
                isActive
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-indigo-50/90 rounded-2xl -z-10 border border-indigo-100/80 shadow-2xs" />
              )}
              
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-indigo-600' : ''}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-indigo-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full min-w-[15px] text-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
