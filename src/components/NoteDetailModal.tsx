import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Play,
  Pause,
  Pin,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
  Share2,
  Copy,
  Clock,
  Tag,
  Edit3,
  Check,
  Volume2,
  FileText,
  Camera,
  RotateCcw,
  Zap,
  Download,
  FileDown,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Note, ActionItem } from '../types';
import { exportNoteAsPdf, exportNoteAsMarkdown, shareNoteNative } from '../lib/exportUtils';

interface NoteDetailModalProps {
  note: Note | null;
  onClose: () => void;
  onUpdateNote: (updated: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
}

const formatTime = (totalSecs: number) => {
  if (!isFinite(totalSecs) || totalSecs < 0) totalSecs = 0;
  const mins = Math.floor(totalSecs / 60);
  const secs = Math.floor(totalSecs % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  onClose,
  onUpdateNote,
  onDeleteNote,
  onTogglePin,
}) => {
  // NOTE: all hooks must run unconditionally, on every render — the
  // `if (!note) return null` guard below happens AFTER every hook call.
  // (It previously happened before them, which is a Rules of Hooks
  // violation: React requires the same hooks in the same order on every
  // render, and this modal's `note` prop can flip between null and a real
  // note while staying mounted.)
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number>(note?.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(note?.title ?? '');
  const [editedContent, setEditedContent] = useState(note?.content ?? '');
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset playback + edit state whenever the modal switches to a different
  // note (it can stay mounted while `note` changes, so state from the
  // previous note shouldn't leak into the next one).
  useEffect(() => {
    if (!note) return;
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(note.durationSeconds || 0);
    setPlaybackRate(1.0);
    setEditedTitle(note.title);
    setEditedContent(note.content);
    setIsEditing(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  if (!note) return null;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportPdf = () => {
    exportNoteAsPdf(note);
    setShowExportMenu(false);
    triggerToast('PDF downloaded successfully');
  };

  const handleExportMarkdown = () => {
    exportNoteAsMarkdown(note);
    setShowExportMenu(false);
    triggerToast('Markdown (.md) downloaded');
  };

  const handleNativeShare = async () => {
    setShowExportMenu(false);
    const result = await shareNoteNative(note);
    if (result === 'copied') {
      triggerToast('Summary copied to clipboard');
    } else {
      triggerToast('Shared successfully');
    }
  };

  const handleActionItemToggle = (itemId: string) => {
    const updatedActionItems = note.actionItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onUpdateNote({ ...note, actionItems: updatedActionItems });
  };

  const handleSaveEdit = () => {
    onUpdateNote({
      ...note,
      title: editedTitle.trim() || note.title,
      content: editedContent,
    });
    setIsEditing(false);
  };

  const handleCopy = () => {
    const textToCopy = `# ${note.title}\n\n${note.summary}\n\n${note.content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAiRefine = async (action: 'shorter' | 'actionable') => {
    setIsAiSummarizing(true);
    try {
      const res = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: note.content,
          titleHint: note.title + (action === 'shorter' ? ' (Executive Summary)' : ' (Action Plan)'),
        }),
      });
      const data = await res.json();
      onUpdateNote({
        ...note,
        summary: data.summary || note.summary,
        keyTakeaways: data.keyTakeaways || note.keyTakeaways,
        actionItems: data.actionItems
          ? data.actionItems.map((it: string, i: number) => ({
              id: `act-ref-${Date.now()}-${i}`,
              text: it,
              completed: false,
            }))
          : note.actionItems,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiSummarizing(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((e) => console.warn('Audio playback failed:', e));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handleCyclePlaybackRate = () => {
    const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoStr;
    }
  };

  const completedCount = note.actionItems.filter((a) => a.completed).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto text-slate-900"
        >
          {/* Top Bar Controls */}
          <div className="px-3.5 sm:px-6 py-3 bg-white/95 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10 backdrop-blur-md">
            {/* Left: Close / Back Navigation + Type Badge */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1 shrink-0 font-bold text-xs cursor-pointer"
                title="Close note"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-700 hidden sm:inline">Back</span>
              </button>

              <span
                className={`text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 shrink-0 ${
                  note.type === 'voice'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    : note.type === 'scan'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-purple-50 text-purple-700 border-purple-100'
                }`}
              >
                {note.type === 'voice' ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">Voice Note</span>
                  </>
                ) : note.type === 'scan' ? (
                  <>
                    <Camera className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Scanned Doc</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="truncate">Text Note</span>
                  </>
                )}
              </span>

              <span className="text-[11px] text-slate-400 hidden xs:flex items-center gap-1 font-medium truncate">
                <Clock className="w-3 h-3 shrink-0" />
                {formatDate(note.createdAt)}
              </span>
            </div>

            {/* Right: Actions & Close X Button */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              {/* Export Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-indigo-100/90 shadow-2xs"
                  title="Export or Share Note"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className="w-3 h-3 text-indigo-500 shrink-0" />
                </button>

                <AnimatePresence>
                  {showExportMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setShowExportMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-xl text-xs space-y-0.5"
                      >
                        <button
                          type="button"
                          onClick={handleExportPdf}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 font-semibold transition text-left"
                        >
                          <FileDown className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div className="flex flex-col">
                            <span>Export as PDF</span>
                            <span className="text-[10px] text-slate-400 font-normal">Formatted document</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportMarkdown}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-purple-600 hover:bg-purple-50 font-semibold transition text-left"
                        >
                          <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                          <div className="flex flex-col">
                            <span>Export as Markdown</span>
                            <span className="text-[10px] text-slate-400 font-normal">Clean .md file</span>
                          </div>
                        </button>

                        <div className="border-t border-slate-100 my-1" />

                        <button
                          type="button"
                          onClick={handleNativeShare}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-semibold transition text-left"
                        >
                          <Share2 className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Share Note Externally</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={() => onTogglePin(note.id)}
                className={`p-1.5 sm:p-2 rounded-xl transition ${
                  note.isPinned ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={note.isPinned ? 'Unpin note' : 'Pin note'}
              >
                <Pin className="w-4 h-4 fill-current" />
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                title="Copy note content"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`p-1.5 sm:p-2 rounded-xl transition ${
                  isEditing ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title="Edit note"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this note?')) {
                    onDeleteNote(note.id);
                    onClose();
                  }
                }}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-100 transition"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition ml-1 shrink-0 cursor-pointer"
                title="Close modal"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
            {/* Title Section */}
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full text-xl font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                  {note.title}
                </h2>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {note.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      <Tag className="w-3 h-3 text-indigo-600" />
                      {tag}
                    </span>
                  ))}
                  {note.sentiment && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 inline-flex items-center gap-1">
                      <Zap className="w-3 h-3 text-purple-600" />
                      <span>{note.sentiment}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Audio Player if Voice Note — now wired to a real <audio> element */}
            {note.type === 'voice' && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5 font-bold text-indigo-600">
                    <Volume2 className="w-4 h-4 text-indigo-600" /> Voice Recording Playback
                  </span>
                  <span>{formatTime(audioDuration)}</span>
                </div>

                {note.audioUrl ? (
                  <>
                    <audio
                      ref={audioRef}
                      src={note.audioUrl}
                      preload="metadata"
                      onLoadedMetadata={() => {
                        if (audioRef.current && isFinite(audioRef.current.duration)) {
                          setAudioDuration(audioRef.current.duration);
                        }
                      }}
                      onTimeUpdate={() => {
                        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                      }}
                      onEnded={() => {
                        setIsPlaying(false);
                        setCurrentTime(0);
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      className="hidden"
                    />

                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={handlePlayPause}
                        className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition shadow-md shadow-indigo-200"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current text-white" /> : <Play className="w-5 h-5 fill-current text-white ml-0.5" />}
                      </button>

                      <div className="flex-1 space-y-1">
                        <input
                          type="range"
                          min="0"
                          max={audioDuration || 0}
                          step="0.1"
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono font-medium">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(audioDuration)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCyclePlaybackRate}
                        className="px-2 py-1 bg-white text-xs font-mono font-bold text-indigo-600 rounded-lg border border-slate-200 hover:bg-slate-100 transition shadow-sm"
                      >
                        {playbackRate}x
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>No audio was saved for this note.</span>
                  </div>
                )}
              </div>
            )}

            {/* Scanned Image Preview if Document Scan */}
            {note.imageUrl && (
              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 max-h-64 flex items-center justify-center shadow-sm">
                <img src={note.imageUrl} alt="Scanned Attachment" className="w-full h-full object-cover" />
              </div>
            )}

            {/* AI Executive Summary Box */}
            <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 rounded-2xl p-4 space-y-2 relative shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> AI Executive Summary
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="text-[11px] font-bold px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Download PDF"
                  >
                    <FileDown className="w-3 h-3 text-indigo-600" />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="text-[11px] font-bold px-2 py-1 bg-white hover:bg-purple-50 text-purple-700 rounded-lg border border-purple-200 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Download Markdown"
                  >
                    <FileText className="w-3 h-3 text-purple-600" />
                    <span>Markdown</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAiRefine('shorter')}
                    disabled={isAiSummarizing}
                    className="text-[11px] font-bold px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition disabled:opacity-50"
                  >
                    Shorten
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-800 leading-relaxed font-normal">
                {note.summary}
              </p>
            </div>

            {/* Key Takeaways */}
            {note.keyTakeaways && note.keyTakeaways.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Key Insights</h4>
                <ul className="space-y-1.5">
                  {note.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed font-normal">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items Checklists */}
            {note.actionItems && note.actionItems.length > 0 && (
              <div className="space-y-2 bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Extracted Action Items
                  </h4>
                  <span className="text-xs text-indigo-600 font-bold">
                    {completedCount} / {note.actionItems.length} Done
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {note.actionItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleActionItemToggle(item.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-100 text-left transition shadow-sm"
                    >
                      {item.completed ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 shrink-0" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          item.completed ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Full Note Content / Editor */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Transcription & Notes</h4>

              {isEditing ? (
                <textarea
                  rows={8}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              ) : (
                <div className="prose max-w-none text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                  {note.content}
                </div>
              )}
            </div>
          </div>

          {/* Footer Save Button when editing */}
          {isEditing && (
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
              >
                Save Changes
              </button>
            </div>
          )}

          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-800 pointer-events-none"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};