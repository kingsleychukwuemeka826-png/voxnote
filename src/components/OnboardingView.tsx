import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  Sparkles,
  Calendar,
  Video,
  CheckCircle2,
  Brain,
  Zap,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  User,
  MessageSquare
} from 'lucide-react';
import { Logo } from './Logo';

interface OnboardingViewProps {
  onComplete: () => void;
  onGetStarted: () => void;
  onLogin: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, onGetStarted, onLogin }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 'capture',
      title: 'Capture Anywhere, Organize Everywhere.',
      description:
        'Let our AI turn your voice memos, meetings, and quick thoughts into a structured second brain automatically.',
      badge: 'Voice & AI Synthesis',
      illustration: (
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {/* Glowing Ambient Background Circles */}
          <div className="absolute w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" />
          <div className="absolute w-40 h-40 rounded-full bg-indigo-400/20 blur-2xl -top-2 -right-2" />

          {/* Central Vector Art Composition */}
          <div className="relative z-10 w-full max-w-[280px] h-[220px] bg-gradient-to-b from-indigo-50/90 to-white/80 border border-indigo-100/80 rounded-3xl p-4 shadow-xl backdrop-blur-sm flex flex-col justify-between overflow-hidden">
            {/* Top Floating AI Voice Conversion Wave Particles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-sm">
                <Sparkles className="w-3 h-3 text-amber-300 animate-spin" />
                <span>Live Audio Conversion</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                24kHz
              </span>
            </div>

            {/* Audio Waveform & Phone Illustration Graphic */}
            <div className="my-auto flex flex-col items-center justify-center space-y-3">
              {/* Floating Glowing Icons */}
              <div className="flex items-center justify-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-300 animate-bounce">
                  <Mic className="w-5 h-5" />
                </div>
                <div className="h-0.5 w-10 bg-gradient-to-r from-indigo-500 via-indigo-300 to-emerald-400 rounded-full relative">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                </div>
                <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Brain className="w-5 h-5" />
                </div>
              </div>

              {/* Dynamic Sound Wave Bars */}
              <div className="flex items-center justify-center gap-1.5 h-8">
                {[40, 75, 100, 60, 90, 45, 80, 50, 95, 30].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="w-1.5 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-full animate-pulse"
                  />
                ))}
              </div>

              {/* Output Structured Note Card Preview */}
              <div className="w-full bg-white border border-slate-100 rounded-xl p-2.5 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-800">Q3 Product Strategy Memo</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600">AI Tagged</span>
                </div>
                <p className="text-[9px] text-slate-500 line-clamp-1">
                  Key Takeaway: Launch Gemini AI transcription pipeline...
                </p>
              </div>
            </div>

            {/* Walking User / Phone Silhouette Decorative Accent */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100/80">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> Walk & Talk
              </span>
              <span>Hands-free Voice Note</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'calendar',
      title: 'Seamless Calendar & Meeting Bot.',
      description:
        'Connect Google Calendar, Outlook, or Apple Calendar to automatically join, record, and summarize Zoom & Meet calls.',
      badge: 'Auto-Join Bot',
      illustration: (
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <div className="absolute w-56 h-56 rounded-full bg-sky-500/10 blur-3xl animate-pulse" />
          <div className="absolute w-40 h-40 rounded-full bg-indigo-400/20 blur-2xl top-2 left-2" />

          <div className="relative z-10 w-full max-w-[280px] h-[220px] bg-gradient-to-b from-sky-50/90 to-white/80 border border-sky-100/80 rounded-3xl p-4 shadow-xl backdrop-blur-sm flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-600 text-white text-[10px] font-bold shadow-sm">
                <Calendar className="w-3 h-3" />
                <span>Calendar Synced</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </span>
            </div>

            <div className="my-auto space-y-2">
              {/* Meeting Item Box */}
              <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-900">Sprint Sync & Demo</h4>
                      <p className="text-[9px] text-slate-400">Google Meet • 2:00 PM Today</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    Bot Active
                  </span>
                </div>

                <div className="p-2 bg-slate-50 rounded-xl text-[9px] text-slate-600 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span className="font-semibold truncate">Auto-transcribing meeting audio stream...</span>
                </div>
              </div>

              {/* Supported Integration Logos */}
              <div className="flex items-center justify-around text-[10px] font-bold text-slate-500 pt-1">
                <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-100 shadow-2xs">Google Cal</span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-100 shadow-2xs">Outlook</span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-100 shadow-2xs">Apple Cal</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100/80">
              <span>Zoom • Meet • Teams</span>
              <span className="font-bold text-indigo-600">Zero Effort</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'brain',
      title: 'Instant AI Summaries & Checklists.',
      description:
        'Transform hours of voice recordings into concise executive summaries, actionable checklists, and searchable notes.',
      badge: 'Gemini AI',
      illustration: (
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <div className="absolute w-56 h-56 rounded-full bg-purple-500/10 blur-3xl animate-pulse" />
          <div className="absolute w-40 h-40 rounded-full bg-indigo-400/20 blur-2xl bottom-2 right-2" />

          <div className="relative z-10 w-full max-w-[280px] h-[220px] bg-gradient-to-b from-purple-50/90 to-white/80 border border-purple-100/80 rounded-3xl p-4 shadow-xl backdrop-blur-sm flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-600 text-white text-[10px] font-bold shadow-sm">
                <Brain className="w-3 h-3" />
                <span>Second Brain</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                Action Items
              </span>
            </div>

            <div className="my-auto space-y-2">
              <div className="bg-white border border-slate-100 rounded-xl p-2.5 shadow-sm space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Extracted Action Items</span>
                </div>
                <div className="space-y-1 pl-1">
                  <div className="flex items-center gap-2 text-[9px] text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>Review design tokens for mobile interface</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>Schedule client onboarding sync for Thursday</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-600 text-white rounded-xl p-2.5 shadow-md flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-200" />
                  <span className="font-semibold">Ask AI: "What were my key ideas?"</span>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100/80">
              <span>Smart Search</span>
              <span className="font-bold text-purple-600">100% Client-Side Local</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-96 bg-gradient-to-b from-indigo-100/60 via-indigo-50/30 to-transparent pointer-events-none" />

      {/* Top Header Bar */}
      <div className="pt-6 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Logo className="w-8 h-8" rounded="rounded-xl" />
          <span className="text-sm font-bold text-slate-900 tracking-tight">Voxnote</span>
        </div>

        <button
          onClick={onComplete}
          className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition px-2.5 py-1 rounded-lg hover:bg-slate-100"
        >
          Skip
        </button>
      </div>

      {/* Main Slideshow Container */}
      <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full px-6 py-4 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col justify-between my-auto"
          >
            {/* Upper Half: Central Illustration Area */}
            <div className="h-[250px] sm:h-[280px] w-full flex items-center justify-center my-auto">
              {slides[currentSlide].illustration}
            </div>

            {/* Lower Half: Textual Content */}
            <div className="space-y-3 text-center my-4">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                {slides[currentSlide].badge}
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight px-2">
                {slides[currentSlide].title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                {slides[currentSlide].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Indicator Dots */}
        <div className="flex items-center justify-center gap-2 py-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === idx
                  ? 'w-7 bg-indigo-600 shadow-sm'
                  : 'w-2 bg-slate-200 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Fixed Footer Buttons Stacked Vertically at Bottom */}
      <div className="w-full max-w-md mx-auto p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 space-y-2.5 z-20 sticky bottom-0">
        <button
          onClick={onGetStarted}
          className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition active:scale-[0.99]"
        >
          <span>Create Free Account</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onLogin}
          className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
        >
          <span>I already have an account (Log In)</span>
        </button>
      </div>
    </div>
  );
};
