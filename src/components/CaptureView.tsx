import React from 'react';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import {
  Mic,
  Camera,
  Sparkles,
  Pin,
  Clock,
  Volume2,
  FileText,
  Tag,
  ChevronRight,
  CheckCircle2,
  Zap,
  Play,
  Brain,
  ListTodo,
  TrendingUp,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { Note, PresetSample } from '../types';
import { PRESET_SAMPLES } from '../data/initialNotes';

interface CaptureViewProps {
  recentNotes: Note[];
  onOpenVoiceRecorder: (sample?: PresetSample) => void;
  onOpenDocScanner: () => void;
  onOpenPasteSummarize: () => void;
  onSelectNote: (note: Note) => void;
  onTogglePin: (noteId: string) => void;
  onViewAllNotes: () => void;
  onCreateNewTextNote?: () => void;
  onOpenPricing?: () => void;
  isPro?: boolean;
}

export const CaptureView: React.FC<CaptureViewProps> = ({
  recentNotes,
  onOpenVoiceRecorder,
  onOpenDocScanner,
  onOpenPasteSummarize,
  onSelectNote,
  onTogglePin,
  onViewAllNotes,
  onCreateNewTextNote,
  onOpenPricing,
  isPro = false,
}) => {
  const totalActionItems = recentNotes.reduce(
    (acc, note) => acc + (note.actionItems ? note.actionItems.length : 0),
    0
  );

  const completedActionItems = recentNotes.reduce(
    (acc, note) =>
      acc + (note.actionItems ? note.actionItems.filter((i) => i.completed).length : 0),
    0
  );

  const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
      case 'meeting':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'study':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'idea':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'research':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'action item':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getTagInitial = (tag: string) => {
    switch (tag.toLowerCase()) {
      case 'meeting':
        return 'MT';
      case 'study':
        return 'ST';
      case 'idea':
        return 'ID';
      case 'research':
        return 'RS';
      default:
        return 'NT';
    }
  };

  const formatTimeAgo = (isoStr: string) => {
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch (e) {
      return 'Recently';
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-5 sm:space-y-6 pb-28 w-full max-w-5xl mx-auto">
      {/* Top Header & App Bar */}
      <div className="pt-1 pb-4 border-b border-slate-100/80 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100/80 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                <span>AI-Powered</span>
              </span>
              <OnlineStatusIndicator />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {greeting}
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-1">{formattedDate}</p>
          </div>

          {onOpenPricing && (
            <button
              onClick={onOpenPricing}
              className={`shrink-0 text-xs font-extrabold flex items-center gap-1.5 px-3 py-2 rounded-2xl shadow-2xs transition whitespace-nowrap cursor-pointer ${
                isPro
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                  : 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 hover:brightness-105 border border-amber-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span className="hidden sm:inline">{isPro ? 'Pro Active' : 'Upgrade Pro'}</span>
              <span className="sm:hidden">{isPro ? 'Pro' : 'Upgrade'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onCreateNewTextNote && (
            <button
              onClick={onCreateNewTextNote}
              className="flex-1 sm:flex-none text-xs text-slate-700 font-bold flex items-center justify-center gap-1.5 bg-white border border-slate-200/90 px-3.5 py-2 rounded-2xl shadow-2xs hover:bg-slate-50 transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>New Note</span>
            </button>
          )}

          <button
            onClick={onViewAllNotes}
            className="flex-1 sm:flex-none text-xs text-indigo-700 hover:text-indigo-800 font-bold flex items-center justify-center gap-1.5 bg-indigo-50/80 border border-indigo-100/90 px-3.5 py-2 rounded-2xl shadow-2xs hover:bg-indigo-100/80 transition whitespace-nowrap"
          >
            <span>{recentNotes.length} Notes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Stats Overview Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white border border-slate-100/90 rounded-2xl p-3 sm:p-4 shadow-2xs flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight leading-none">Total Notes</p>
            <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">{recentNotes.length}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100/90 rounded-2xl p-3 sm:p-4 shadow-2xs flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ListTodo className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight leading-none">Action Items</p>
            <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">
              {completedActionItems}/{totalActionItems}
            </p>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-100/90 rounded-2xl p-3 sm:p-4 shadow-2xs flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight leading-none">AI Accuracy</p>
            <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">99.4%</p>
          </div>
        </div>
      </div>

      {/* Primary Capture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Main Recording Sphere & Stage */}
        <div className="md:col-span-7 bg-gradient-to-b from-white via-white to-indigo-50/30 border border-slate-100 rounded-[32px] p-5 sm:p-8 shadow-xl shadow-indigo-100/40 relative flex flex-col items-center justify-between space-y-5 text-center overflow-hidden min-h-[340px]">
          {/* Subtle Ambient Background Gradient Blobs */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />

          {/* Top Badge Indicator */}
          <div className="flex items-center justify-between w-full z-10 gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-100 shadow-2xs text-[10px] sm:text-[11px] font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Mic Ready</span>
            </div>

            <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              Real-Time
            </span>
          </div>

          {/* Main Recording Sphere Button */}
          <div className="relative my-auto py-2 z-10">
            {/* Multi-layer Pulsing Rings */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute -inset-8 rounded-full bg-indigo-200/50 pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.2, 0.4] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="absolute -inset-4 rounded-full bg-indigo-300/40 pointer-events-none"
            />

            {/* Mic Trigger Circle */}
            <button
              type="button"
              onClick={() => onOpenVoiceRecorder()}
              className="relative w-28 h-28 sm:w-32 sm:h-32 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center shadow-xl shadow-indigo-300/80 hover:scale-105 active:scale-95 transition duration-300 group cursor-pointer"
            >
              <div className="flex flex-col items-center justify-center space-y-1">
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-sm group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-200">
                  Record
                </span>
              </div>
            </button>
          </div>

          <div className="text-center z-10">
            <p className="text-indigo-600 font-extrabold text-sm sm:text-base">Tap microphone to speak naturally</p>
            <p className="text-slate-400 text-xs mt-0.5 font-medium max-w-xs mx-auto leading-relaxed">
              Gemini AI automatically summarizes, extracts action items, and organizes your voice notes.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 w-full z-10 pt-1">
            <button
              type="button"
              onClick={onOpenPasteSummarize}
              className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 font-bold text-xs transition shadow-md shadow-indigo-200 active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
              <span className="truncate">Paste & Summarize</span>
            </button>

            <button
              type="button"
              onClick={onOpenDocScanner}
              className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-3 bg-white text-slate-700 rounded-2xl border border-slate-200 hover:bg-slate-50 font-bold text-xs transition shadow-2xs active:scale-[0.98]"
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" />
              <span className="truncate">Scan Document</span>
            </button>
          </div>
        </div>

        {/* Quick Audio / Document Presets Panel */}
        <div className="md:col-span-5 bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Test Instant Audio Presets
              </span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                1-Tap Demo
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3 px-1">
              Select pre-recorded meeting, study, or research audio snippets to test live AI synthesis:
            </p>

            <div className="space-y-2.5">
              {PRESET_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    if (sample.type === 'voice') {
                      onOpenVoiceRecorder(sample);
                    } else {
                      onOpenDocScanner();
                    }
                  }}
                  className="w-full p-3.5 rounded-2xl bg-slate-50/70 hover:bg-indigo-50/60 border border-slate-100 hover:border-indigo-200 text-left transition group shadow-2xs hover:shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                      {sample.type === 'voice' ? <Volume2 className="w-4 h-4" /> : <Camera className="w-4 h-4 text-emerald-600 group-hover:text-white" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition">
                        {sample.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {sample.type === 'voice' ? `Audio • ${sample.duration}` : 'Document Scanner'}
                      </p>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Callout */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-100 text-xs text-indigo-900 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
            <p className="text-[11px] leading-relaxed font-medium">
              <strong className="font-bold">Pro Tip:</strong> You can also speak in Spanish, French, or German and AI will translate and format automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Notes Cards Section */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-slate-900 text-base tracking-tight">Recent Notes</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {recentNotes.length} Total
            </span>
          </div>

          <button
            onClick={onViewAllNotes}
            className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1"
          >
            <span>View All Notes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentNotes.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No notes recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Tap the microphone button above or try an instant audio preset to create your first note.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {recentNotes.slice(0, 6).map((note) => {
              const primaryTag = note.tags[0] || 'Idea';
              const tagColorClass = getTagColor(primaryTag);
              const tagInitials = getTagInitial(primaryTag);
              const actionCount = note.actionItems ? note.actionItems.length : 0;

              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-100 shadow-2xs hover:shadow-md hover:border-indigo-100 transition cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${tagColorClass}`}>
                          {tagInitials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">
                            {note.title}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {formatTimeAgo(note.createdAt)} • {note.type === 'voice' ? `${note.durationSeconds || 30}s voice` : 'text note'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(note.id);
                        }}
                        className={`p-1.5 rounded-lg transition ${
                          note.isPinned
                            ? 'text-amber-500 bg-amber-50'
                            : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                        }`}
                        title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
                      >
                        <Pin className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {note.summary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {note.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 text-[10px] rounded-md font-bold border ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {actionCount > 0 && (
                      <span className="flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                        <span>{actionCount} Action Items</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

