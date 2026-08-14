import React, { useState } from 'react';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import {
  FileText,
  Search,
  Grid,
  List as ListIcon,
  Plus,
  Pin,
  Trash2,
  Tag,
  CheckCircle2,
  Clock,
  Filter,
  Download,
  CheckSquare,
  Square,
  Sparkles,
  Volume2,
  ListTodo,
  Mic,
  FileDown,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Note, NoteTag } from '../types';
import { exportNoteAsPdf, exportNoteAsMarkdown, exportNotesAsConsolidatedMarkdown, shareNoteNative } from '../lib/exportUtils';

interface AllNotesViewProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onCreateNewTextNote: () => void;
}

export const AllNotesView: React.FC<AllNotesViewProps> = ({
  notes,
  onSelectNote,
  onTogglePin,
  onDeleteNote,
  onCreateNewTextNote,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);

  // Available unique tags
  const customTags = Array.from(new Set<string>(notes.flatMap((n) => n.tags))).filter(
    (t: string) => t.toLowerCase() !== 'meeting'
  );
  const allTags = ['All', 'Meeting Notes', 'Pinned', ...customTags];

  // Helper count for tags
  const getTagCount = (tagName: string) => {
    if (tagName === 'All') return notes.length;
    if (tagName === 'Pinned') return notes.filter((n) => n.isPinned).length;
    if (tagName === 'Meeting Notes') {
      return notes.filter(
        (n) =>
          n.tags.some((t) => t.toLowerCase().includes('meeting')) ||
          n.title.toLowerCase().includes('meeting') ||
          n.title.toLowerCase().includes('sync')
      ).length;
    }
    return notes.filter((n) => n.tags.includes(tagName)).length;
  };

  // Filtering & Sorting logic
  let filtered = notes.filter((note) => {
    if (selectedTag === 'Pinned') {
      if (!note.isPinned) return false;
    } else if (selectedTag === 'Meeting Notes' || selectedTag === 'Meeting') {
      const isMeeting =
        note.tags.some(
          (t) =>
            t.toLowerCase().includes('meeting') ||
            t.toLowerCase() === 'zoom' ||
            t.toLowerCase() === 'google meet' ||
            t.toLowerCase() === 'teams'
        ) ||
        note.title.toLowerCase().includes('meeting') ||
        note.title.toLowerCase().includes('sync') ||
        note.title.toLowerCase().includes('standup') ||
        note.title.toLowerCase().includes('roadmap') ||
        note.content.toLowerCase().includes('meeting');
      if (!isMeeting) return false;
    } else if (selectedTag !== 'All') {
      if (!note.tags.includes(selectedTag)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = note.title.toLowerCase().includes(q);
      const matchSummary = note.summary.toLowerCase().includes(q);
      const matchContent = note.content.toLowerCase().includes(q);
      const matchTags = note.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchSummary || matchContent || matchTags;
    }

    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      return a.title.localeCompare(b.title);
    }
  });

  const handleSelectToggle = (id: string) => {
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedNoteIds.length === filtered.length) {
      setSelectedNoteIds([]);
    } else {
      setSelectedNoteIds(filtered.map((n) => n.id));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedNoteIds.length} selected notes?`)) {
      selectedNoteIds.forEach((id) => onDeleteNote(id));
      setSelectedNoteIds([]);
      setIsSelectMode(false);
    }
  };

  const handleBulkExportJSON = () => {
    const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
    const jsonStr = JSON.stringify(selectedNotes, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-notes-export-${Date.now()}.json`;
    a.click();
  };

  const handleBulkExportMarkdown = () => {
    const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
    exportNotesAsConsolidatedMarkdown(selectedNotes, `exported_notes_${Date.now()}`);
  };

  const handleBulkExportPdf = () => {
    const selectedNotes = notes.filter((n) => selectedNoteIds.includes(n.id));
    selectedNotes.forEach((note) => {
      exportNoteAsPdf(note);
    });
  };

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
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-5 pb-24 w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">All Notes & Transcripts</h1>
            <OnlineStatusIndicator />
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Search, filter, and organize your AI voice notes & meeting summaries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              setSelectedNoteIds([]);
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition ${
              isSelectMode
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isSelectMode ? 'Cancel Selection' : 'Batch Select'}
          </button>

          <button
            type="button"
            onClick={onCreateNewTextNote}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-200 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Search & Tag Filter Toolbar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search titles, transcripts, tags, or AI key takeaways..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pill Scroll Bar with Count Badges */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {allTags.map((tag) => {
            const count = getTagCount(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-100 hover:border-slate-200 shadow-2xs'
                }`}
              >
                {tag === 'Meeting Notes' && (
                  <Mic className={`w-3.5 h-3.5 ${selectedTag === tag ? 'text-white' : 'text-indigo-600'}`} />
                )}
                <span>{tag}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    selectedTag === tag ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Controls & Sort Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none shadow-2xs"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar if select mode */}
      {isSelectMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-indigo-50/90 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1"
            >
              {selectedNoteIds.length === filtered.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs font-bold text-slate-700">
              {selectedNoteIds.length} of {filtered.length} items selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleBulkExportPdf}
              disabled={selectedNoteIds.length === 0}
              className="px-3 py-1.5 bg-white text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-indigo-200 shadow-2xs hover:bg-indigo-50 transition disabled:opacity-40 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-600" /> Export PDF
            </button>

            <button
              onClick={handleBulkExportMarkdown}
              disabled={selectedNoteIds.length === 0}
              className="px-3 py-1.5 bg-white text-purple-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-purple-200 shadow-2xs hover:bg-purple-50 transition disabled:opacity-40 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-purple-600" /> Export Markdown
            </button>

            <button
              onClick={handleBulkExportJSON}
              disabled={selectedNoteIds.length === 0}
              className="px-3 py-1.5 bg-white text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200 shadow-2xs hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> JSON
            </button>

            <button
              onClick={handleBulkDelete}
              disabled={selectedNoteIds.length === 0}
              className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-rose-200 shadow-2xs hover:bg-rose-100 transition disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </motion.div>
      )}

      {/* Notes Container */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800">No matching notes found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or switching category filters.
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {filtered.map((note) => {
            const isSelected = selectedNoteIds.includes(note.id);
            const actionCount = note.actionItems ? note.actionItems.length : 0;
            const completedCount = note.actionItems ? note.actionItems.filter((i) => i.completed).length : 0;

            return (
              <motion.div
                key={note.id}
                whileHover={{ y: -2 }}
                onClick={() => {
                  if (isSelectMode) {
                    handleSelectToggle(note.id);
                  } else {
                    onSelectNote(note);
                  }
                }}
                className={`p-4 sm:p-5 rounded-3xl border transition shadow-2xs cursor-pointer relative group flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'
                }`}
              >
                {/* Select Mode Checkbox */}
                {isSelectMode && (
                  <div className="absolute top-4 right-4 z-10">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-indigo-600 fill-indigo-100" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 pr-6">
                      {note.type === 'voice' ? (
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Volume2 className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">
                        {note.title}
                      </h3>
                    </div>

                    {!isSelectMode && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportNoteAsPdf(note);
                          }}
                          className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
                          title="Download PDF"
                        >
                          <FileDown className="w-3.5 h-3.5 text-indigo-500" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(note.id);
                          }}
                          className={`p-1.5 rounded-lg transition ${
                            note.isPinned ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-slate-500'
                          }`}
                          title={note.isPinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                    {note.summary}
                  </p>
                </div>

                {/* Key Takeaways snippet preview */}
                {note.keyTakeaways && note.keyTakeaways.length > 0 && (
                  <div className="p-2.5 bg-slate-50 rounded-2xl text-[11px] text-slate-700 space-y-1 border border-slate-100">
                    <span className="font-bold text-indigo-600 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-indigo-600" /> AI Takeaway
                    </span>
                    <p className="line-clamp-1 font-medium">{note.keyTakeaways[0]}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {note.tags.slice(0, 2).map((t, i) => (
                      <span key={i} className={`px-2 py-0.5 rounded-md font-bold border ${getTagColor(t)}`}>
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {actionCount > 0 && (
                      <span className="flex items-center gap-1 text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                        <span>{completedCount}/{actionCount}</span>
                      </span>
                    )}

                    <span className="font-medium text-slate-400">
                      {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

