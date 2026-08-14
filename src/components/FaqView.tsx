import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  Sparkles,
  Mic,
  Calendar,
  Crown,
  ShieldCheck,
  FileText,
  MessageSquare,
  Bot,
  Zap,
  ArrowRight,
  ThumbsUp,
  Check,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface FaqItem {
  id: string;
  category: 'Getting Started' | 'AI & Recording' | 'Calendar Bot' | 'Pro & Billing' | 'Security & Export';
  question: string;
  answer: string;
  tips?: string[];
  icon: any;
}

const FAQ_DATA: FaqItem[] = [
  {
    id: '1',
    category: 'Getting Started',
    question: 'What is Voxnote?',
    answer: 'Voxnote is your all-in-one smart productivity assistant that records live voice, transcribes audio, scans printed documents/whiteboards, and automatically synthesizes structured notes with key takeaways, action items, and sentiment analysis powered by Gemini AI.',
    tips: [
      'Use the Capture tab to quickly start standard audio recording or upload files.',
      'Explore preset audio samples to test AI summaries without recording.'
    ],
    icon: Sparkles,
  },
  {
    id: '2',
    category: 'AI & Recording',
    question: 'How does live audio transcription work?',
    answer: 'When you tap "Start Recording" in the Capture tab, the app uses your browser’s high-precision speech recognition API in real time. Once you stop recording, our Gemini AI engine analyzes the raw transcript to generate a polished title, concise summary, action items list, and key takeaways.',
    tips: [
      'Ensure your microphone permissions are granted in browser settings.',
      'You can switch summary styles (Concise, Detailed, Executive) in Settings.'
    ],
    icon: Mic,
  },
  {
    id: '3',
    category: 'Calendar Bot',
    question: 'How does Automated Calendar Auto-Join work?',
    answer: 'In the Calendar & Integrations tab, you can link Google Calendar, Outlook, or Apple Calendar. When enabled, your virtual AI assistant automatically detects upcoming Zoom, Google Meet, or Microsoft Teams calls and auto-joins at the scheduled time to take full notes.',
    tips: [
      'Toggle "Bot Auto-Join" per meeting to selectively enable or disable the bot.',
      'Try the "Simulate Bot Auto-Join & Generate Note" button to test how meeting notes are created in real time.'
    ],
    icon: Calendar,
  },
  {
    id: '4',
    category: 'Pro & Billing',
    question: 'What is included in the Pro Plan vs Free Tier?',
    answer: 'The Free Tier includes 300 minutes per month of manual voice recording, scan OCR, and standard AI notes. Pro Plan unlocks 1,500 transcription minutes per month, automated calendar meeting auto-join, advanced AI personas (Executive, Student, Creative), and multi-format bulk exports.',
    tips: [
      'Upgrade to annual billing to save 30% ($6.99/mo billed as $83.88/yr).',
      'All new users can activate a 7-Day Free Trial without commitment.'
    ],
    icon: Crown,
  },
  {
    id: '5',
    category: 'AI & Recording',
    question: 'Can I upload existing audio files or scan paper notes?',
    answer: 'Yes! Tap "Document Scanner" to upload image files, photos of whiteboards, or PDFs to extract text using OCR. You can also paste copied meeting transcripts or text directly into the "Paste & Summarize" tool to instantly generate AI notes.',
    tips: [
      'Supports JPG, PNG, WebP image formats for scanning.',
      'Document OCR automatically formats headers and bullet points.'
    ],
    icon: FileText,
  },
  {
    id: '6',
    category: 'Security & Export',
    question: 'How do I export my notes as PDF or Markdown?',
    answer: 'You can export individual notes or bulk export multiple selected notes in "All Notes" view. We support downloading formatted PDF documents, raw Markdown (.md) files, and JSON backup files for seamless import into Notion, Obsidian, or Google Docs.',
    tips: [
      'Use the PDF icon on any note card to trigger single-click PDF generation.',
      'Select multiple notes in "All Notes" to download a consolidated Markdown workspace.'
    ],
    icon: Zap,
  },
  {
    id: '7',
    category: 'AI & Recording',
    question: 'How does "Search & Ask AI" work?',
    answer: 'The Search & Ask AI feature allows you to query your entire knowledge base in natural language. Ask questions like "What were the key takeaways from yesterday\'s engineering meeting?" and Gemini AI will scan all your saved notes to provide grounded answers.',
    tips: [
      'Filter search results by tags like #Meeting, #Study, or #Action Item.',
      'Click any referenced note in AI answers to view the full original transcript.'
    ],
    icon: MessageSquare,
  },
  {
    id: '8',
    category: 'Security & Export',
    question: 'Is my data secure and private?',
    answer: 'Your notes and transcriptions are stored locally in secure browser storage and processed safely through encrypted server API routes. We never sell your personal audio data or train public models on your private transcripts.',
    tips: [
      'You can manage audio storage settings anytime under Settings -> Privacy.',
      'Delete notes permanently with one click from the note detail view.'
    ],
    icon: ShieldCheck,
  },
];

export const FaqView: React.FC<{ onNavigateToPricing?: () => void }> = ({ onNavigateToPricing }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>('1');
  const [helpfulFeedback, setHelpfulFeedback] = useState<Record<string, boolean>>({});

  const categories = ['All', 'Getting Started', 'AI & Recording', 'Calendar Bot', 'Pro & Billing', 'Security & Export'];

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tips && item.tips.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleFeedback = (id: string) => {
    setHelpfulFeedback((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 pt-2">
      {/* FAQ Banner Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-extrabold border border-white/10">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>KNOWLEDGE BASE & FAQ</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Frequently Asked Questions
          </h1>

          <p className="text-xs sm:text-sm text-indigo-100 font-medium leading-relaxed">
            Everything you need to know about AI note synthesis, automated meeting bots, transcription limits, and data exports.
          </p>

          {/* Search Input */}
          <div className="relative pt-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions, features, or keywords..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white text-slate-900 text-xs sm:text-sm font-medium placeholder-slate-400 shadow-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-4.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-1 rounded-lg font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center space-y-3 shadow-2xs">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No matching questions found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try searching with different keywords like "transcription", "bot", "pdf", or "pro".
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
            >
              Reset Search Filter
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            const IconComponent = faq.icon;

            return (
              <div
                key={faq.id}
                className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs transition hover:border-indigo-200"
              >
                {/* Question Row Header */}
                <button
                  type="button"
                  onClick={() => handleToggleExpand(faq.id)}
                  className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {faq.category}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {faq.question}
                      </h3>
                    </div>
                  </div>

                  <div
                    className={`p-1.5 rounded-xl bg-slate-100 text-slate-500 transition-transform duration-200 shrink-0 ${
                      isExpanded ? 'rotate-180 bg-indigo-100 text-indigo-700' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Answer Content Accordion */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 space-y-4"
                    >
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                        {faq.answer}
                      </p>

                      {/* Helpful Pro Tips */}
                      {faq.tips && faq.tips.length > 0 && (
                        <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 space-y-2">
                          <p className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-indigo-600" /> Helpful Tips & Shortcuts
                          </p>
                          <ul className="space-y-1.5 text-xs text-indigo-950 font-medium">
                            {faq.tips.map((tip, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-indigo-600 font-bold">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Feedback Action */}
                      <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-200/60">
                        <span className="text-slate-400 font-medium">Was this answer helpful?</span>
                        {helpfulFeedback[faq.id] ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Thanks for your feedback!
                          </span>
                        ) : (
                          <button
                            onClick={() => handleFeedback(faq.id)}
                            className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 font-bold bg-white px-3 py-1 rounded-lg border border-slate-200/80 shadow-2xs transition"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> Yes, helpful
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom CTA Card */}
      {onNavigateToPricing && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-indigo-600 rounded-3xl p-6 text-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-extrabold flex items-center justify-center sm:justify-start gap-1.5">
              Ready to unlock automated AI meetings? <Crown className="w-4 h-4 text-slate-950" />
            </h3>
            <p className="text-xs font-semibold text-slate-900">
              Start your 7-day free trial today. Cancel anytime with zero commitment.
            </p>
          </div>
          <button
            onClick={onNavigateToPricing}
            className="px-5 py-3 rounded-2xl bg-slate-950 text-white text-xs font-extrabold hover:bg-slate-800 transition shadow-md flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>Upgrade to Pro</span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      )}
    </div>
  );
};
