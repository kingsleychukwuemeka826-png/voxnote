import React, { useMemo, useState } from 'react';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import { FileText, Search, Grid, List as ListIcon, Plus, Pin, Trash2, CheckCircle2, Download, CheckSquare, Square, Lightbulb, Volume2, Mic, FileDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Note } from '../types';
import { exportNoteAsPdf, exportNotesAsConsolidatedMarkdown } from '../lib/exportUtils';

interface AllNotesViewProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onCreateNewTextNote: () => void;
}

export const AllNotesView: React.FC<AllNotesViewProps> = ({ notes, onSelectNote, onTogglePin, onDeleteNote, onCreateNewTextNote }) => {
  const [selectedTag, setSelectedTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const tags = useMemo(() => ['All', 'Pinned', 'Meeting Notes', ...Array.from(new Set(notes.flatMap(n => n.tags))).filter(t => t.toLowerCase() !== 'meeting')], [notes]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = notes.filter(note => {
      if (selectedTag === 'Pinned' && !note.isPinned) return false;
      if (selectedTag === 'Meeting Notes') {
        const meeting = note.tags.some(t => /meeting|zoom|google meet|teams/i.test(t)) || /meeting|sync|standup|roadmap/i.test(note.title) || note.content.toLowerCase().includes('meeting');
        if (!meeting) return false;
      } else if (selectedTag !== 'All' && selectedTag !== 'Pinned' && !note.tags.includes(selectedTag)) return false;
      if (!q) return true;
      return [note.title, note.summary, note.content, ...note.tags].some(v => v.toLowerCase().includes(q));
    });
    return result.sort((a, b) => sortBy === 'title' ? a.title.localeCompare(b.title) : sortBy === 'newest' ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [notes, selectedTag, searchQuery, sortBy]);

  const tagCount = (tag: string) => tag === 'All' ? notes.length : tag === 'Pinned' ? notes.filter(n => n.isPinned).length : tag === 'Meeting Notes' ? notes.filter(n => /meeting|sync|standup|roadmap/i.test(n.title) || n.tags.some(t => /meeting|zoom|google meet|teams/i.test(t))).length : notes.filter(n => n.tags.includes(tag)).length;

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(n => n.id));
  const bulkDelete = () => { if (confirm(`Delete ${selectedIds.length} selected notes?`)) { selectedIds.forEach(onDeleteNote); setSelectedIds([]); setSelectMode(false); } };
  const bulkExport = () => exportNotesAsConsolidatedMarkdown(notes.filter(n => selectedIds.includes(n.id)), `voxnote_export_${Date.now()}`);

  return (
    <div className="w-full max-w-6xl mx-auto pb-28 space-y-7">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3"><OnlineStatusIndicator /><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Knowledge workspace</span></div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.045em] text-slate-950">Your notes.</h1>
          <p className="mt-2 text-sm text-slate-500">Everything you've captured, transcribed and organized in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setSelectMode(!selectMode); setSelectedIds([]); }} className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition ${selectMode ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>{selectMode ? 'Done' : 'Select'}</button>
          <button onClick={onCreateNewTextNote} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-500 transition"><Plus className="inline w-4 h-4 mr-1.5" />New note</button>
        </div>
      </header>

      <section className="rounded-[24px] border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search your notes, transcripts and ideas..." className="w-full rounded-[16px] bg-slate-50 border border-transparent focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 px-1">
          {tags.map(tag => <button key={tag} onClick={() => setSelectedTag(tag)} className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition ${selectedTag === tag ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><span>{tag}</span><span className={`ml-2 ${selectedTag === tag ? 'text-slate-300' : 'text-slate-400'}`}>{tagCount(tag)}</span></button>)}
        </div>
      </section>

      {selectMode && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-slate-950 text-white p-3.5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3 text-sm font-semibold"><button onClick={selectAll} className="hover:text-indigo-300">{selectedIds.length === filtered.length ? 'Deselect all' : 'Select all'}</button><span className="text-slate-400">{selectedIds.length} selected</span></div><div className="flex gap-2"><button disabled={!selectedIds.length} onClick={bulkExport} className="px-3 py-2 rounded-lg bg-white/10 text-xs font-bold disabled:opacity-40">Export Markdown</button><button disabled={!selectedIds.length} onClick={bulkDelete} className="px-3 py-2 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-bold disabled:opacity-40"><Trash2 className="inline w-3.5 h-3.5 mr-1" />Delete</button></div></motion.div>}

      <div className="flex items-center justify-between">
        <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Library</p><p className="text-sm font-bold text-slate-700 mt-1">{filtered.length} {filtered.length === 1 ? 'note' : 'notes'}</p></div>
        <div className="flex items-center gap-2"><select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="title">A–Z</option></select><div className="flex bg-white border border-slate-200 rounded-xl p-1"><button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><Grid className="w-4 h-4" /></button><button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><ListIcon className="w-4 h-4" /></button></div></div>
      </div>

      {!filtered.length ? <div className="rounded-[28px] border border-dashed border-slate-200 bg-white py-20 text-center"><div className="mx-auto w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300"><FileText className="w-6 h-6" /></div><h3 className="mt-4 font-extrabold text-slate-900">Nothing here yet</h3><p className="text-sm text-slate-400 mt-1">Try another search or capture your first note.</p></div> : <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5' : 'space-y-3'}>{filtered.map(note => {
        const selected = selectedIds.includes(note.id);
        const actions = note.actionItems?.length || 0;
        const completed = note.actionItems?.filter(i => i.completed).length || 0;
        return <motion.article key={note.id} whileHover={{ y: -3 }} onClick={() => selectMode ? toggleSelect(note.id) : onSelectNote(note)} className={`group cursor-pointer rounded-[24px] border p-5 transition-all ${selected ? 'border-indigo-400 bg-indigo-50 ring-4 ring-indigo-50' : 'border-slate-200/80 bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/50'}`}>
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2.5 min-w-0"><div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${note.type === 'voice' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>{note.type === 'voice' ? <Volume2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}</div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{note.type === 'voice' ? 'Voice note' : 'Text note'}</p><h3 className="font-extrabold text-slate-900 truncate mt-0.5 group-hover:text-indigo-600 transition">{note.title}</h3></div></div>{selectMode ? (selected ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-300" />) : <div className="flex gap-1"><button onClick={e => { e.stopPropagation(); onTogglePin(note.id); }} className={`p-2 rounded-lg ${note.isPinned ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:bg-slate-50 hover:text-slate-600'}`}><Pin className="w-3.5 h-3.5 fill-current" /></button><button onClick={e => { e.stopPropagation(); exportNoteAsPdf(note); }} className="p-2 rounded-lg text-slate-300 hover:bg-slate-50 hover:text-indigo-600"><FileDown className="w-3.5 h-3.5" /></button></div>}</div>
          <p className="mt-4 text-sm leading-6 text-slate-500 line-clamp-3">{note.summary || note.content}</p>
          {note.keyTakeaways?.length ? <div className="mt-4 rounded-xl bg-indigo-50/70 border border-indigo-100 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600"><Lightbulb className="inline w-3 h-3 mr-1" />Key takeaway</p><p className="text-xs font-semibold text-slate-700 mt-1 line-clamp-2">{note.keyTakeaways[0]}</p></div> : null}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2"><div className="flex gap-1.5 min-w-0">{note.tags.slice(0, 2).map(tag => <span key={tag} className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 truncate">{tag}</span>)}</div><div className="flex items-center gap-2 shrink-0">{actions > 0 && <span className="text-[10px] font-bold text-slate-500"><CheckCircle2 className="inline w-3 h-3 text-indigo-500 mr-1" />{completed}/{actions}</span>}<span className="text-[10px] font-semibold text-slate-400">{new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div></div>
        </motion.article>;
      })}</div>}
    </div>
  );
};
