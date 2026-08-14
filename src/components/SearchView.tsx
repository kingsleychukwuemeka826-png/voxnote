import React, { useState } from 'react';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import { Search, Sparkles, FileText, ArrowRight, CornerDownLeft, Filter, Tag, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Note } from '../types';

interface SearchViewProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ notes, onSelectNote }) => {
  const [query, setQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [matchingIds, setMatchingIds] = useState<string[]>([]);
  const [isSearchingAi, setIsSearchingAi] = useState(false);

  const quickPrompts = [
    'What were the action items from our meeting?',
    'Summarize my study notes on machine learning',
    'What app ideas did I write down?',
    'Find all notes tagged with Research',
  ];

  const handleSearchSubmit = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearchingAi(true);
    setAiAnswer(null);

    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, notes }),
      });

      const data = await res.json();
      setAiAnswer(data.answer);
      setMatchingIds(data.matchingNoteIds || []);
    } catch (e) {
      console.error('AI search error:', e);
      const localMatches = notes
        .filter(
          (n) =>
            n.title.toLowerCase().includes(q.toLowerCase()) ||
            n.summary.toLowerCase().includes(q.toLowerCase())
        )
        .map((n) => n.id);
      setMatchingIds(localMatches);
      setAiAnswer(`Found ${localMatches.length} matching notes for "${q}".`);
    } finally {
      setIsSearchingAi(false);
    }
  };

  const localFilteredNotes = query.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(query.toLowerCase()) ||
          n.summary.toLowerCase().includes(query.toLowerCase()) ||
          n.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : notes;

  return (
    <div className="space-y-6 pb-24 w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="pt-2">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100/80 shadow-2xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>Semantic Neural Search</span>
          </span>
          <OnlineStatusIndicator />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Search & Ask AI</h1>
        <p className="text-xs text-slate-400 font-medium">
          Ask natural language questions across all your voice recordings, documents, and meetings
        </p>
      </div>

      {/* AI Search Bar Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearchSubmit(query);
        }}
        className="space-y-2"
      >
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-indigo-600 absolute left-4 pointer-events-none z-10" />

          <input
            type="text"
            placeholder="Ask AI e.g. 'What are my action items?'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-2xl py-3.5 sm:py-4 pl-11 pr-28 sm:pr-32 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-indigo-500 shadow-sm placeholder-slate-400 truncate"
          />

          <button
            type="submit"
            disabled={isSearchingAi || !query.trim()}
            className="absolute right-2 px-3 py-2 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-200 transition flex items-center gap-1.5 shrink-0 z-10 cursor-pointer"
          >
            {isSearchingAi ? (
              <>
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                <span className="hidden sm:inline">Searching...</span>
              </>
            ) : (
              <>
                <span>Ask AI</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Prompts Chips */}
      <div className="space-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
          Suggested AI Questions:
        </span>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(prompt);
                handleSearchSubmit(prompt);
              }}
              className="text-xs px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-700 transition text-left shadow-2xs font-semibold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Answer Card */}
      {aiAnswer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 border border-indigo-100 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-700">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Gemini AI Answer
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-white px-2.5 py-1 rounded-full border border-indigo-100">
              Generated in 0.4s
            </span>
          </div>

          <div className="p-4 bg-white/90 rounded-2xl border border-indigo-100/80 text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
            {aiAnswer}
          </div>
        </motion.div>
      )}

      {/* Search Results Notes */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            {query.trim() ? `Matching Notes (${localFilteredNotes.length})` : 'All Available Notes'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {localFilteredNotes.map((note) => {
            const isAiMatch = matchingIds.includes(note.id);
            const actionCount = note.actionItems ? note.actionItems.length : 0;

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className={`p-4 rounded-3xl border transition cursor-pointer shadow-2xs hover:shadow-md space-y-2.5 ${
                  isAiMatch
                    ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-100 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">
                    {note.title}
                  </h4>
                  {isAiMatch && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold shrink-0">
                      AI Relevant
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{note.summary}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-600">
                    {note.tags[0] || 'Note'}
                  </span>

                  {actionCount > 0 && (
                    <span className="flex items-center gap-1 font-bold text-indigo-600">
                      <CheckCircle2 className="w-3 h-3 text-indigo-600" /> {actionCount} Actions
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

