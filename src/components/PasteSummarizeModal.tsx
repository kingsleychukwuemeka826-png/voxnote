import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, FileText, Clipboard, Check, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { Note } from '../types';

interface PasteSummarizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (note: Note) => void;
}

const SAMPLE_PASTES = [
  {
    id: 'sample-1',
    label: 'Q3 Product Roadmap Sync',
    text: `Attendees: Sarah (PM), David (Engineering), Alex (Design).
Discussion items:
1. Mobile app performance: Page load times increased by 15% after recent update. David to investigate bundle size and optimize asset loading by next Tuesday.
2. Dark vs Light theme overhaul: User feedback indicates strong preference for high-contrast light mode with clean typography. Alex created new design tokens.
3. Gemini AI integration: We need server-side proxy routes for Gemini AI to keep API keys secure and summarize meeting transcripts automatically.
Action Items:
- David: Run bundle analyzer and reduce initial JS load by 30%.
- Sarah: Finalize Q3 milestones presentation for executive team.
- Alex: Hand off updated Figma component library.`,
  },
  {
    id: 'sample-2',
    label: 'Machine Learning Lecture Notes',
    text: `Topic: Transformer Architectures and Attention Mechanisms
Key Concepts:
- Self-Attention Mechanism calculates dynamic weights between tokens regardless of positional distance in a sequence.
- Multi-Head Attention allows the model to jointly attend to information from different representation subspaces at different positions.
- Positional Encodings are injected to give the model awareness of sequence order since transformers process inputs in parallel rather than sequentially like RNNs.
- Applications: Large Language Models (LLMs), Computer Vision (Vision Transformers), and Speech Processing.
Summary Statement: Transformers replaced recurrent networks by enabling massive parallelization during training and capturing long-range dependencies effectively.`,
  },
  {
    id: 'sample-3',
    label: 'Customer Feedback Analysis',
    text: `Feedback collected from 45 user interviews across iOS and Android:
Positives:
- Users love the instant audio transcription feature during live meetings.
- The automatic action item extraction saves 10-15 minutes of manual review per meeting.
- Clean visual aesthetic with clear typographic hierarchy.
Requests & Pain Points:
- Need a widescreen desktop view or sidebar navigation for multi-tasking on laptops.
- Option to quickly paste existing text or email drafts and summarize them with Gemini AI.
- Bulk export options for PDF and Markdown format.`,
  },
];

export const PasteSummarizeModal: React.FC<PasteSummarizeModalProps> = ({
  isOpen,
  onClose,
  onSaveNote,
}) => {
  const [pastedText, setPastedText] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [summaryLength, setSummaryLength] = useState<'concise' | 'executive' | 'detailed'>('executive');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [copiedSample, setCopiedSample] = useState(false);

  if (!isOpen) return null;

  const handleSummarize = async () => {
    if (!pastedText.trim()) return;

    setIsProcessing(true);
    setProcessStep('Sending transcript to Gemini AI API...');

    try {
      // Step simulation for visual feedback
      setTimeout(() => {
        setProcessStep('Extracting key insights and action items...');
      }, 700);

      const res = await fetch('/api/generate-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: pastedText,
          titleHint: customTitle || undefined,
          categoryHint: 'Pasted Text',
        }),
      });

      const data = await res.json();

      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: data.title || customTitle || 'Pasted Text Summary',
        summary: data.summary || pastedText.slice(0, 120) + '...',
        content: data.formattedContent || pastedText,
        type: 'text',
        tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : ['Research', 'Pasted'],
        keyTakeaways: data.keyTakeaways || [],
        actionItems: (data.actionItems || []).map((item: string, idx: number) => ({
          id: `act-paste-${Date.now()}-${idx}`,
          text: item,
          completed: false,
        })),
        sentiment: data.sentiment || 'Informational',
        createdAt: new Date().toISOString(),
        isPinned: false,
      };

      onSaveNote(newNote);
      setIsProcessing(false);
      onClose();
      setPastedText('');
      setCustomTitle('');
    } catch (e) {
      console.error('Error summarizing text:', e);
      // Fallback local note
      const fallback: Note = {
        id: `note-${Date.now()}`,
        title: customTitle || 'Pasted Text Summary',
        summary: pastedText.slice(0, 120) + '...',
        content: `## Pasted Text\n\n${pastedText}`,
        type: 'text',
        tags: ['Pasted', 'Text'],
        keyTakeaways: [pastedText.slice(0, 100)],
        actionItems: [{ id: `act-${Date.now()}`, text: 'Review pasted text', completed: false }],
        createdAt: new Date().toISOString(),
      };
      onSaveNote(fallback);
      setIsProcessing(false);
      onClose();
      setPastedText('');
      setCustomTitle('');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedText(text);
      }
    } catch (err) {
      // Ignore fallback if blocked by browser
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl overflow-hidden relative text-slate-900 space-y-4 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Paste & Summarize with Gemini</h3>
                <p className="text-xs text-slate-400 font-medium">Turn articles, emails, or raw notes into AI summaries</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Quick Sample Chips */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Pick Sample Transcript:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PASTES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      setPastedText(sample.text);
                      setCustomTitle(sample.label);
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 font-medium transition text-left inline-flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{sample.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Title input */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Q3 Strategy Sync or Lecture Notes..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Main Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Raw Text / Transcript Content</label>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Clipboard className="w-3 h-3" /> Paste Clipboard
                </button>
              </div>

              <textarea
                rows={6}
                placeholder="Paste meeting transcript, research paper abstract, email draft, or customer notes here..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
              />
              <p className="text-[10px] text-slate-400 text-right mt-1 font-mono">
                {pastedText.length} characters
              </p>
            </div>

            {/* AI Summary Style Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Summary Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(['concise', 'executive', 'detailed'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSummaryLength(mode)}
                    className={`py-2 px-3 rounded-xl text-xs capitalize font-semibold transition border ${
                      summaryLength === mode
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            {isProcessing && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-2 text-xs font-bold text-indigo-700 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>{processStep}</span>
              </div>
            )}

            <button
              onClick={handleSummarize}
              disabled={isProcessing || !pastedText.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isProcessing ? 'Generating Gemini Summary...' : 'Summarize with Gemini AI'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
